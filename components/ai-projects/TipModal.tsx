"use client";

import React, { useEffect, useState } from "react";
import {
  X, Wallet, Download, Loader2,
  CheckCircle, AlertCircle, Sparkles, ArrowRight,
} from "lucide-react";
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
import { markUnlocked } from "@/lib/tipUnlockStore";

interface TipModalProps {
  clipId: string;
  clipTitle: string;
  onClose: () => void;
  onDownloadReady: (downloadUrl: string) => void;
}

type Step =
  | "loading"    // fetching clip info
  | "info"       // showing clip + tip details to the user
  | "building"   // POST /stellar/tips/build
  | "signing"    // waiting for Freighter signature
  | "submitting" // POST /stellar/tips/submit
  | "confirming" // polling getTipStatus until "confirmed"
  | "success"    // tip confirmed — triggering download
  | "error";

// ─── Tip confirmation poller ──────────────────────────────────────────────────
// After the tip is submitted, the backend may need a moment to confirm the
// Stellar transaction on-chain. We poll GET /clips/:id/download?senderAddress=G…
// until it returns 200 (tip confirmed, URL unlocked) or a non-402 error.

async function waitForDownload(
  clipId: string,
  senderAddress: string,
  maxAttempts = 15,
  delayMs = 2000,
): Promise<string> {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const { downloadUrl } = await getClipDownloadUrl(clipId, senderAddress);
      if (downloadUrl) return downloadUrl;
    } catch (err: any) {
      const status = err?.response?.status;
      // 402 = tip not confirmed yet on the backend — keep polling
      if (status === 402 && i < maxAttempts) {
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      throw err; // any other error — surface immediately
    }
    if (i < maxAttempts) await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(
    "Payment confirmation is taking longer than expected. Your tip was sent — try downloading again in a moment.",
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncateAddr(addr: string) {
  return addr.length > 16 ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : addr;
}

function translateError(err: any): string {
  const status = err?.response?.status;
  const raw: string =
    err?.response?.data?.message || err?.message || "Something went wrong.";

  if (status === 503)
    return "The server is starting up. Please wait a moment and try again.";
  if (raw.toLowerCase().includes("sender account not found"))
    return "Your wallet has no XLM on the Stellar network. Fund it with at least 1 XLM to tip.";
  if (raw.toLowerCase().includes("insufficient"))
    return "Insufficient XLM balance. You need at least 1 XLM plus a small fee.";
  if (raw.toLowerCase().includes("destination account not found"))
    return "The creator's wallet doesn't exist on Stellar yet. Tips are unavailable for this clip.";
  if (raw.toLowerCase().includes("tx_too_late"))
    return "Transaction expired before it was submitted. Please try again.";
  if (raw.toLowerCase().includes("tx_bad_auth"))
    return "Signature mismatch — make sure Freighter is on the same network as the app and try again.";
  return raw;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TipModal({
  clipId,
  clipTitle,
  onClose,
  onDownloadReady,
}: TipModalProps) {
  const { address, connect } = useWallet();
  const { toast } = useToast();

  const [step, setStep]       = useState<Step>("loading");
  const [info, setInfo]       = useState<ClipInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Escape to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // Load clip info
  useEffect(() => {
    getClipInfo(clipId)
      .then((data) => { setInfo(data); setStep("info"); })
      .catch((err) => {
        setErrorMsg(err?.response?.data?.message || "Could not load clip info.");
        setStep("error");
      });
  }, [clipId]);

  const tipRequired = !!(info?.tippingEnabled || info?.owner?.stellarAddress);

  // ── Main action handler ───────────────────────────────────────────────────
  const handleAction = async () => {
    if (!info) return;

    // Need a wallet to proceed
    if (!address) {
      await connect();
      return;
    }

    // Free download (creator has no wallet)
    if (!tipRequired) {
      setStep("building");
      try {
        const { downloadUrl } = await getClipDownloadUrl(clipId);
        onDownloadReady(downloadUrl);
        onClose();
      } catch (err: any) {
        setErrorMsg(translateError(err));
        setStep("error");
      }
      return;
    }

    // ── Tip → confirm → download ──────────────────────────────────────────
    try {
      // 1. Build unsigned XDR
      setStep("building");
      let xdr: string;
      try {
        ({ xdr } = await buildTipTransaction(parseInt(clipId), "1", address));
      } catch (firstErr: any) {
        if (firstErr?.response?.status === 503) {
          // Server waking up from sleep — wait then retry once
          await new Promise((r) => setTimeout(r, 4000));
          ({ xdr } = await buildTipTransaction(parseInt(clipId), "1", address));
        } else {
          throw firstErr;
        }
      }

      // 2. Sign in Freighter
      setStep("signing");
      const signedXdr = await signTransaction(xdr);

      // 3. Broadcast to Stellar
      setStep("submitting");
      await submitTipTransaction(parseInt(clipId), signedXdr, address);

      // 4. Poll GET /clips/:id/download?senderAddress=G… until the backend
      //    confirms the tip and unlocks the download URL.
      setStep("confirming");
      const downloadUrl = await waitForDownload(clipId, address);

      // 5. Persist the unlock so the user never hits the tip gate again
      markUnlocked(clipId, address);

      // 6. Done!
      setStep("success");
      toast("Tip sent! Starting your download…", "success");
      // Brief pause so the user sees the success state before the modal closes
      await new Promise((r) => setTimeout(r, 1200));
      onDownloadReady(downloadUrl);
      onClose();
    } catch (err: any) {
      setErrorMsg(translateError(err));
      setStep("error");
    }
  };

  // ── Labels & derived state ─────────────────────────────────────────────────
  const stepLabel: Record<Step, string> = {
    loading:    "Loading…",
    info:       tipRequired ? "Tip to download" : "Free download",
    building:   "Building transaction…",
    signing:    "Waiting for wallet signature…",
    submitting: "Broadcasting to Stellar…",
    confirming: "Confirming on-chain…",
    success:    "Tip confirmed!",
    error:      "Something went wrong",
  };

  const isWorking = ["building", "signing", "submitting", "confirming", "success"].includes(step);
  const isBusy    = isWorking || step === "loading";

  // Progress steps shown during the working phase
  const PROGRESS_STEPS: { id: Step; label: string }[] = [
    { id: "building",   label: "Build transaction" },
    { id: "signing",    label: "Sign with wallet"  },
    { id: "submitting", label: "Broadcast"         },
    { id: "confirming", label: "Confirm on-chain"  },
    { id: "success",    label: "Download ready"    },
  ];
  const currentProgressIdx = PROGRESS_STEPS.findIndex((s) => s.id === step);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      onClick={!isBusy ? onClose : undefined}
    >
      <div
        className="relative w-full max-w-sm bg-[#0B100E] border border-white/10 rounded-[28px] shadow-[0_0_80px_rgba(0,229,143,0.10)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
          <div className="space-y-0.5 min-w-0">
            <p className="text-white text-[14px] font-extrabold truncate max-w-[220px]">
              {clipTitle}
            </p>
            <p className="text-[#5A6F65] text-[11px] font-medium">{stepLabel[step]}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isWorking}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#5A6F65] hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-5 space-y-4">

          {/* Loading skeleton */}
          {step === "loading" && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-8 h-8 text-brand animate-spin" />
            </div>
          )}

          {/* Clip info card — shown on info step and during working steps */}
          {(step === "info" || isWorking) && info && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5 text-brand shrink-0" />
                <p className="text-[11px] font-bold text-[#5A6F65] uppercase tracking-widest">
                  Creator wallet
                </p>
              </div>

              {info.owner.stellarAddress ? (
                <p
                  className="text-[11px] font-mono text-brand break-all leading-relaxed cursor-pointer hover:text-white transition-colors"
                  title={info.owner.stellarAddress}
                  onClick={() =>
                    navigator.clipboard
                      ?.writeText(info.owner.stellarAddress!)
                      .catch(() => {})
                  }
                >
                  {truncateAddr(info.owner.stellarAddress)}
                  <span className="ml-1 text-[9px] text-[#3A4A43]">(click to copy)</span>
                </p>
              ) : (
                <p className="text-[12px] text-[#3A4A43]">
                  No wallet connected — download is free.
                </p>
              )}

              {tipRequired && (
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                  <span className="text-[11px] text-[#5A6F65] font-medium">Tip amount</span>
                  <span className="text-[14px] font-extrabold text-brand">1 XLM</span>
                </div>
              )}
            </div>
          )}

          {/* Your wallet */}
          {(step === "info" || isWorking) && address && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
              <span className="text-[10px] text-[#5A6F65] font-medium">Your wallet:</span>
              <span className="text-[10px] font-mono text-white">{truncateAddr(address)}</span>
            </div>
          )}

          {/* Progress steps — visible while working */}
          {isWorking && (
            <div className="space-y-2 pt-1">
              {PROGRESS_STEPS.map((s, idx) => {
                const isDone    = idx < currentProgressIdx;
                const isCurrent = idx === currentProgressIdx;
                return (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all
                      ${isDone    ? "bg-brand"           : ""}
                      ${isCurrent ? "bg-brand/20 border border-brand" : ""}
                      ${!isDone && !isCurrent ? "bg-white/5 border border-white/10" : ""}
                    `}>
                      {isDone && <CheckCircle className="w-3 h-3 text-black" />}
                      {isCurrent && <Loader2 className="w-3 h-3 text-brand animate-spin" />}
                    </div>
                    <span className={`text-[12px] font-medium transition-colors
                      ${isDone    ? "text-brand"     : ""}
                      ${isCurrent ? "text-white font-bold" : ""}
                      ${!isDone && !isCurrent ? "text-[#3A4A43]" : ""}
                    `}>
                      {s.label}
                    </span>
                    {isCurrent && s.id === "confirming" && (
                      <span className="text-[10px] text-[#5A6F65] ml-auto">
                        waiting for Stellar…
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Success state */}
          {step === "success" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="relative">
                <div className="absolute inset-0 blur-xl rounded-full bg-brand/30 animate-pulse" />
                <div className="relative w-14 h-14 rounded-full bg-brand/10 border border-brand/30 flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-brand" />
                </div>
              </div>
              <p className="text-white font-bold text-[14px]">Tip confirmed!</p>
              <p className="text-[#5A6F65] text-[12px] text-center">
                Your download is starting…
              </p>
            </div>
          )}

          {/* Error state */}
          {step === "error" && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-red-500/5 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[12px] text-red-400 font-medium leading-relaxed">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* ── Footer CTA ── */}
        <div className="px-6 pb-6">
          {step === "error" ? (
            <button
              onClick={() => { setStep("info"); setErrorMsg(""); }}
              className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-[13px] font-bold hover:bg-white/10 transition-colors"
            >
              Try again
            </button>
          ) : step === "success" ? (
            <div className="flex items-center justify-center gap-2 py-3 text-brand text-[13px] font-bold">
              <Download className="w-4 h-4 animate-bounce" />
              Downloading…
            </div>
          ) : (
            <button
              onClick={handleAction}
              disabled={isBusy}
              className="w-full py-3.5 rounded-2xl bg-brand text-black text-[13px] font-extrabold hover:bg-[#00e58f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,229,143,0.2)]"
            >
              {isBusy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : tipRequired ? (
                <Sparkles className="w-4 h-4" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {!address
                ? "Connect wallet to continue"
                : isWorking
                ? "Processing…"
                : tipRequired
                ? "Tip 1 XLM & Download"
                : "Download free"}
              {!isBusy && !isWorking && <ArrowRight className="w-3.5 h-3.5 ml-auto" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
