"use client";

import React, { useState } from "react";
import { Trash2, Zap, MoveRight, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import apiClient from "@/lib/apiClient";

interface SelectionFooterProps {
  count: number;
  selectedIds: string[];
  onDelete: (ids: string[]) => Promise<void>;
  onClearSelection: () => void;
}

type Toast = { type: "success" | "error"; message: string } | null;

export default function SelectionFooter({ count, selectedIds, onDelete, onClearSelection }: SelectionFooterProps) {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  if (count === 0) return null;

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setLoading(true);
    setAction("delete");
    setConfirmDelete(false);
    try {
      await onDelete(selectedIds);
      onClearSelection();
      showToast("success", `${count} clip${count > 1 ? "s" : ""} deleted.`);
    } catch {
      showToast("error", "Failed to delete clips. Please try again.");
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const handlePost = async () => {
    setLoading(true);
    setAction("post");
    let failed = 0;
    try {
      for (const clipId of selectedIds) {
        try {
          // clipId is stored as string — send as-is; backend decides type
          await apiClient.post("/platforms/post-clip", {
            clipId: clipId,
            platforms: ["tiktok"],
          });
        } catch {
          failed++;
        }
      }
      if (failed === 0) {
        showToast("success", `${count} clip${count > 1 ? "s" : ""} queued for posting.`);
        onClearSelection();
      } else {
        showToast("error", `${failed} clip${failed > 1 ? "s" : ""} failed. Check your platform connections.`);
      }
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  return (
    <>
      {/* In-app toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-xl animate-in slide-in-from-right-5 fade-in duration-300 ${
          toast.type === "success"
            ? "bg-brand/10 border-brand/30 text-brand"
            : "bg-red-400/10 border-red-400/30 text-red-400"
        }`}>
          {toast.type === "success"
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span className="text-[13px] font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="w-full py-6 animate-in slide-in-from-bottom-5 fade-in duration-500 border-t border-white/5 bg-[#050505]/40 backdrop-blur-md">
        <div className="relative bg-[#0B100E] border border-white/10 rounded-[32px] px-8 py-4 flex flex-col lg:flex-row items-center justify-between gap-6 w-full shadow-2xl">
          {/* Left: count */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-black font-black text-[16px]">
              {count}
            </div>
            <div className="space-y-0.5">
              <p className="text-[16px] font-extrabold text-white">Clips selected</p>
              <p className="text-[12px] font-medium text-[#5A6F65]">Ready for posting or deletion</p>
            </div>
          </div>

          {/* Middle: actions */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-[#5A6F65]">
            {confirmDelete ? (
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-red-400 font-medium">Delete {count} clip{count > 1 ? "s" : ""}?</span>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-[13px] font-bold hover:bg-red-500/20 transition-all"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-[#5A6F65] text-[13px] font-bold hover:text-white transition-all"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex items-center gap-2.5 px-6 py-3 rounded-2xl border border-white/5 bg-white/[0.02] text-[13px] font-bold hover:text-red-400 hover:border-red-400/20 transition-all disabled:opacity-50"
              >
                {loading && action === "delete" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Delete</span>
              </button>
            )}
          </div>

          {/* Right: post */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-[#111815] border border-[#1A2621] text-brand font-black text-[12px] hover:border-brand/40 transition-all">
              <Zap className="w-4 h-4 fill-brand" />
              <span>AUTO-SCHEDULE ON</span>
            </button>

            <button
              onClick={handlePost}
              disabled={loading}
              className="flex items-center gap-3 px-10 py-4 rounded-3xl bg-brand text-black font-black text-[15px] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_10px_30px_rgba(0,229,143,0.2)] disabled:opacity-50"
            >
              {loading && action === "post" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Post Selected Clips</span>
                  <MoveRight className="w-5 h-5 ml-1" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
