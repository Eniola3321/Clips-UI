"use client";

import React, { useEffect, useState } from "react";
import { X, Wallet, Download, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useWallet } from "@/components/WalletProvider";
import { useToast } from "@/components/shared/ToastProvider";
import {
  getClipInfo,
  getClipDownloadUrl,
  buildTipTransaction,
  submitTipTransaction,
  type ClipInfo,
} from "@/lib/queries";
import { signTransaction } from "@/lib/wallet";

interface TipModalProps {
  clipId: string;
  clipTitle: string;
  onClose: () => void;
  /** Called with the confirmed downloadUrl so the parent can trigger the file download */
  onDownloadReady: (downloadUrl: string) => void;
}

type Step = "loading" | "info" | "tipping" | "signing" | "submitting" | "done" | "error";

export default function TipModal({ clipId, clipTitle, onClose, onDownloadReady }: TipModalProps) {
  const { address, connect } = useWallet();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("loading");
  const [info, setInfo] = useState<ClipInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Fetch clip info on mount
  useEffect(() => {
    getClipInfo(clipId)
      .then((data) => {
        console.log("[TipModal] /clips/:id/info response:", JSON.stringify(data, null, 2));
        setInfo(data);
        setStep("info");
      })
      .catch((err) => {
        console.error("[TipModal] /clips/:id/info error:", err?.response?.data ?? err?.message);
        setErrorMsg(err?.response?.data?.message || "Could not load clip info.");
        setStep("error");
      });
  }, [clipId]);

  const handleAction = async () => {
    if (!info) return;

    // 1. If no wallet connected, prompt connection first
    if (!address) {
      await connect();
      return;
    }

    // 2. If tipping is not required, go straight to download
    // tippingEnabled is true when the owner has a wallet — derive it from address too
    const tipRequired = info.tippingEnabled || !!info.owner.stellarAddress;
    if (!tipRequired) {
      setStep("tipping");
      try {
        const { downloadUrl } = await getClipDownloadUrl(clipId);
        onDownloadReady(downloadUrl);
        onClose();
      } catch (err: any) {
        setErrorMsg(err?.response?.data?.message || "Download failed.");
        setStep("error");
      }
      return;
    }

    // 3. Full tip → download flow
    try {      // Build unsigned XDR
      setStep("tipping");
      const { xdr } = await buildTipTransaction(parseInt(clipId), "1", address);

      // Sign in Freighter
      setStep("signing");
      const signedXdr = await signTransaction(xdr);

      // Submit to Stellar network
      setStep("submitting");
      await submitTipTransaction(parseInt(clipId), signedXdr, address);

      // Fetch download URL now that tip is confirmed
      setStep("done");
      const { downloadUrl } = await getClipDownloadUrl(clipId);
      toast("Tip sent! Your download is starting…", "success");
      onDownloadReady(downloadUrl);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Transaction failed.";
      setErrorMsg(msg);
      setStep("error");
    }
  };

  const truncateAddress = (addr: string) =>
    addr.length > 12 ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : addr;

  const tipRequired = (info?.tippingEnabled || !!info?.owner?.stellarAddress) ?? false;

  const stepLabel: Record<Step, string> = {
    loading: "Loading clip info…",
    info: tipRequired ? "Tip 1 XLM to download" : "Free download",
    tipping: "Preparing transaction…",
    signing: "Sign in your wallet…",
    submitting: "Submitting to Stellar…",
    done: "Done!",
    error: "Something went wrong",
  };

  const isWorking = ["tipping", "signing", "submitting", "done"].includes(step);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-[#0B100E] border border-white/10 rounded-[28px] shadow-[0_0_80px_rgba(0,229,143,0.10)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
          <div className="space-y-0.5">
            <p className="text-white text-[14px] font-extrabold truncate max-w-[220px]">{clipTitle}</p>
            <p className="text-[#5A6F65] text-[11px] font-medium">{stepLabel[step]}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#5A6F65] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {/* Loading */}
          {step === "loading" && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-brand animate-spin" />
            </div>
          )}

          {/* Clip info */}
          {(step === "info" || isWorking) && info && (
            <>
              {/* Owner wallet card */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="w-3.5 h-3.5 text-brand" />
                  <p className="text-[11px] font-bold text-[#5A6F65] uppercase tracking-widest">
                    Creator wallet address
                  </p>
                </div>

                {info.owner.stellarAddress ? (
                  <>
                    <p
                      className="text-[12px] font-mono text-brand break-all leading-relaxed cursor-pointer hover:text-white transition-colors select-all"
                      title="Click to copy"
                      onClick={() => navigator.clipboard?.writeText(info.owner.stellarAddress!).catch(() => {})}
                    >
                      {info.owner.stellarAddress}
                    </p>
                    <p className="text-[9px] text-[#3A4A43]">Click address to copy</p>
                  </>
                ) : (
                  <p className="text-[12px] text-[#3A4A43]">
                    This creator has not connected a wallet — download is free.
                  </p>
                )}

                {(info.tippingEnabled || info.owner.stellarAddress) && (
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                    <span className="text-[11px] text-[#5A6F65] font-medium">Tip amount</span>
                    <span className="text-[13px] font-extrabold text-brand">1 XLM</span>
                  </div>
                )}
              </div>

              {/* Sender wallet */}
              {address && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                  <span className="text-[10px] text-[#5A6F65] font-medium">Your wallet:&nbsp;</span>
                  <span className="text-[10px] font-mono text-white truncate">{truncateAddress(address)}</span>
                </div>
              )}
            </>
          )}

          {/* In-progress states */}
          {isWorking && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-brand/5 border border-brand/20">
              {step === "done"
                ? <CheckCircle className="w-4 h-4 text-brand shrink-0" />
                : <Loader2 className="w-4 h-4 text-brand animate-spin shrink-0" />
              }
              <p className="text-[12px] font-bold text-brand">{stepLabel[step]}</p>
            </div>
          )}

          {/* Error */}
          {step === "error" && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-red-500/5 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[12px] text-red-400 font-medium leading-relaxed">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="px-6 pb-6">
          {step === "error" ? (
            <button
              onClick={() => setStep("info")}
              className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-[13px] font-bold hover:bg-white/10 transition-colors"
            >
              Try again
            </button>
          ) : (
            <button
              onClick={handleAction}
              disabled={isWorking || step === "loading"}
              className="w-full py-3 rounded-2xl bg-brand text-black text-[13px] font-extrabold hover:bg-[#00e58f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isWorking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {!address
                ? "Connect wallet"
                : tipRequired
                ? isWorking ? "Processing…" : "Tip & Download"
                : isWorking ? "Downloading…" : "Download"
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
