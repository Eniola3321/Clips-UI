"use client";

import React, { useState } from "react";
import { Loader2, Link2, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import apiClient from "@/lib/apiClient";

const urlSchema = z.object({
  url: z.string().url("Please enter a valid URL").refine(
    (val) => {
      const url = val.toLowerCase();
      return (
        url.includes("youtube.com/watch") || 
        url.includes("youtu.be/") || 
        url.includes("vimeo.com/")
      );
    },
    "Only YouTube and Vimeo video URLs are currently supported"
  ),
});

export default function URLForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [urlAnalyzing, setUrlAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const handleURLSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (urlAnalyzing) return;
    setError("");
    
    const validationResult = urlSchema.safeParse({ url: url.trim() });
    if (!validationResult.success) {
      setError(validationResult.error.issues[0].message);
      return;
    }

    setUrlAnalyzing(true);
    try {
      const response = await apiClient.post('/videos/from-url', { url: url.trim() });
      const video = response.data;
      
      if (!video?.id) {
        throw new Error("Failed to get video ID from response.");
      }
      
      // Navigate to processing page with the real video ID
      router.push(`/dashboard/processing?videoId=${video.id}`);
    } catch (err: any) {
      const message = err.response?.data?.message || "Something went wrong during analysis. Please try again.";
      setError(Array.isArray(message) ? message[0] : message);
    } finally {
      setUrlAnalyzing(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleURLSubmit} className="flex gap-4 w-full">
        <div className="relative flex-1 max-w-[340px] group">
          <label htmlFor="video-url" className="sr-only">Video URL</label>
          <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-brand transition-colors" />
          <input 
            id="video-url"
            type="url" 
            placeholder="Paste YouTube or Vimeo URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={urlAnalyzing}
            className={`w-full bg-[#1A221E]/60 border ${error ? 'border-red-500/50' : 'border-[#2A3B34]'} rounded-[14px] py-3.5 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand/50 focus:bg-[#1A221E] transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
          />
        </div>
        <button 
          type="submit"
          disabled={urlAnalyzing}
          className="bg-brand hover:bg-brand-hover text-black px-8 py-3.5 rounded-[14px] font-bold text-sm tracking-wide transition-all disabled:opacity-70 flex items-center justify-center gap-2 min-w-[130px] shadow-[0_0_15px_rgba(0,229,143,0.2)]"
        >
          {urlAnalyzing ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing</>
          ) : "Clip Now"}
        </button>
        <button 
          type="button"
          onClick={() => alert("Wallet connection coming soon!")}
          className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-[14px] bg-[#1A221E]/60 border border-[#2A3B34] text-white hover:border-brand/50 hover:bg-[#1A221E] transition-all font-bold text-sm"
        >
          <Wallet className="w-5 h-5 text-brand" />
          Connect Wallet
        </button>
      </form>
      {error && <p className="text-red-500 text-xs mt-2 ml-1">{error}</p>}
    </div>
  );
}
