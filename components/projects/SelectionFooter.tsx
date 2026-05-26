"use client";

import React, { useState } from "react";
import { 
  Trash2, 
  Download, 
  Zap, 
  MoveRight,
  Loader2 
} from "lucide-react";
import apiClient from "@/lib/apiClient";

interface SelectionFooterProps {
  count: number;
  selectedIds: string[];
  onDelete: (ids: string[]) => Promise<void>;
  onClearSelection: () => void;
}

export default function SelectionFooter({ count, selectedIds, onDelete, onClearSelection }: SelectionFooterProps) {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<string | null>(null);

  if (count === 0) return null;

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${count} selected clips?`)) return;
    setLoading(true);
    setAction('delete');
    try {
      await onDelete(selectedIds);
      onClearSelection();
    } catch (error) {
      console.error("Batch delete failed:", error);
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const handlePost = async () => {
    setLoading(true);
    setAction('post');
    try {
      for (const clipId of selectedIds) {
        await apiClient.post("/platforms/post-clip", {
          clipId: Number(clipId),
          platforms: ["tiktok"], // Default to tiktok for now
        });
      }
      alert(`Successfully posted ${count} clips!`);
      onClearSelection();
    } catch (error) {
      console.error("Batch post failed:", error);
      alert("Failed to post some clips. Please check your platform connections.");
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  return (
    <div className="w-full py-6 animate-in slide-in-from-bottom-5 fade-in duration-500 border-t border-white/5 bg-[#050505]/40 backdrop-blur-md">
      <div className="relative bg-[#0B100E] border border-white/10 rounded-[32px] px-8 py-4 flex flex-col lg:flex-row items-center justify-between gap-6 w-full shadow-2xl">
        {/* Left: Selection Count */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#00E58F] flex items-center justify-center text-black font-black text-[16px]">
            {count}
          </div>
          <div className="space-y-0.5">
            <p className="text-[16px] font-extrabold text-white">Clips selected</p>
            <p className="text-[12px] font-medium text-[#5A6F65]">Ready for batch export or posting</p>
          </div>
        </div>

        {/* Middle: Actions */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-[#5A6F65]">
          <button 
            disabled={loading}
            className="flex items-center gap-2.5 px-6 py-3 rounded-2xl border border-white/5 bg-white/[0.02] text-[13px] font-bold hover:text-white hover:border-white/10 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Export Clips</span>
          </button>
          <button 
            onClick={handleDelete}
            disabled={loading}
            className="flex items-center gap-2.5 px-6 py-3 rounded-2xl border border-white/5 bg-white/[0.02] text-[13px] font-bold hover:text-red-400 hover:border-red-400/20 transition-all disabled:opacity-50"
          >
            {loading && action === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            <span>Delete Permanently</span>
          </button>
        </div>

        {/* Right: Primary Platform Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-[#111815] border border-[#1A2621] text-brand font-black text-[12px] group hover:border-brand/40 transition-all">
            <Zap className="w-4 h-4 fill-brand" />
            <span>AUTO-SCHEDULE ON</span>
          </button>
          
          <button 
            onClick={handlePost}
            disabled={loading}
            className="flex items-center gap-3 px-10 py-4 rounded-3xl bg-[#00E58F] text-black font-black text-[15px] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_10px_30px_rgba(0,229,143,0.2)] disabled:opacity-50"
          >
            {loading && action === 'post' ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                <span>Post Selected Clips</span>
                <MoveRight className="w-5 h-5 ml-1" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
