"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import ProcessingHeader from "@/components/dashboard/ProcessingHeader";
import DashboardLayout from "@/components/shared/DashboardLayout";
import { Sparkles, Clock, RefreshCw, Zap, CheckCircle2, AlertCircle } from "lucide-react";

// Status values the backend SSE stream can emit
type ProcessingStatus = "analyzing" | "processing" | "done" | "completed" | "error";

function ProcessingContent() {
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("Analyzing video retention patterns…");
  const [clipsFound, setClipsFound] = useState<number | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [hasError, setHasError] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const videoId = searchParams.get("videoId");

  useEffect(() => {
    if (!videoId || videoId === "undefined") {
      setStatusMsg("Missing video ID — redirecting to dashboard…");
      setTimeout(() => router.push("/dashboard"), 3000);
      return;
    }

    // Route SSE through the proxy so the auth cookie is sent
    const base = process.env.NEXT_PUBLIC_API_URL ?? "/api/proxy";
    const sseUrl = `${base}/events/processing-progress/${videoId}`;
    let es: EventSource;

    const connect = () => {
      es = new EventSource(sseUrl, { withCredentials: true });

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (typeof data.progress === "number") setProgress(data.progress);
          if (data.message) setStatusMsg(data.message);
          if (typeof data.clipsFound === "number") setClipsFound(data.clipsFound);

          const status: ProcessingStatus = data.status;
          if (
            status === "done" ||
            status === "completed" ||
            data.progress >= 100
          ) {
            es.close();
            setIsDone(true);
            setProgress(100);
            setStatusMsg("All clips generated! Redirecting…");
            // Give the user a moment to see the completion state
            setTimeout(() => router.push(`/projects?videoId=${videoId}`), 2000);
          }
        } catch {
          // Ignore malformed SSE frames
        }
      };

      es.onerror = () => {
        es.close();
        // SSE connections drop regularly — just show a softer message
        // and let the user navigate manually if they want
        setStatusMsg("Live updates paused. Processing continues in the background.");
      };
    };

    connect();
    return () => es?.close();
  }, [videoId, router]);

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
      {/* Icon */}
      <div className="flex flex-col items-center text-center space-y-6 mb-12">
        <div className="relative">
          <div className={`absolute inset-0 blur-2xl rounded-full animate-pulse ${isDone ? "bg-brand/30" : "bg-[#00FF85]/20"}`} />
          <div className="relative w-24 h-24 rounded-full bg-[#101614] border border-[#00FF85]/30 flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,255,133,0.1)]">
            {isDone ? (
              <CheckCircle2 className="w-10 h-10 text-brand" />
            ) : hasError ? (
              <AlertCircle className="w-10 h-10 text-red-400" />
            ) : (
              <Sparkles className="w-10 h-10 text-[#00FF85] drop-shadow-[0_0_10px_rgba(0,255,133,0.5)]" />
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            {isDone ? "Clips are ready!" : "AI is finding viral moments…"}
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto font-medium">
            {statusMsg}
          </p>
        </div>
      </div>

      {/* Progress card */}
      <div className="w-full max-w-4xl bg-[#0A0F0D] border border-white/5 rounded-[32px] p-8 md:p-10 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 border border-[#00FF85]/10 rounded-[32px] pointer-events-none group-hover:border-[#00FF85]/20 transition-colors" />

        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-[#111815] border border-white/5 flex items-center justify-center">
                <RefreshCw className={`w-3.5 h-3.5 text-[#00FF85] ${!isDone ? "animate-spin-slow" : ""}`} />
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
                Processing Stream
              </span>
            </div>
            <span className="text-3xl font-black text-[#00FF85]">{progress}%</span>
          </div>

          <div className="relative h-4 w-full bg-[#111815] rounded-full overflow-hidden border border-white/5">
            <div
              className="absolute top-0 left-0 h-full bg-[#00FF85] rounded-full transition-all duration-500 ease-out shadow-[0_0_20px_rgba(0,255,133,0.4)]"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-gray-400 text-sm font-medium">
              <Clock className="w-4 h-4" />
              <span>
                {isDone
                  ? "Processing complete"
                  : progress > 0
                  ? `${Math.round((100 - progress) * 0.6)} seconds remaining (est.)`
                  : "Estimating time…"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <div className="w-2 h-2 rounded-full bg-[#00FF85] animate-pulse shadow-[0_0_8px_#00FF85]" />
              <span className="text-gray-300">GPU Accelerated</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-4xl mt-6">
        <div className="bg-[#0A0F0D] border border-white/5 rounded-2xl p-6 flex flex-col items-center text-center space-y-2 group hover:border-[#00FF85]/20 transition-all">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Moments Found</span>
          <span className="text-3xl font-extrabold text-white">
            {clipsFound !== null ? clipsFound : "…"}
          </span>
        </div>
        <div className="bg-[#0A0F0D] border border-white/5 rounded-2xl p-6 flex flex-col items-center text-center space-y-2 group hover:border-[#00FF85]/20 transition-all">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Input Quality</span>
          <span className="text-3xl font-extrabold text-white">HD</span>
          <span className="text-gray-500 text-xs font-bold">Auto-detected</span>
        </div>
        <div className="bg-[#0A0F0D] border border-white/5 rounded-2xl p-6 flex flex-col items-center text-center space-y-2 group hover:border-[#00FF85]/20 transition-all">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">AI Throughput</span>
          <span className="text-3xl font-extrabold text-white">2.5x</span>
          <span className="text-[#00FF85] text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-1">
            <Zap className="w-3 h-3 fill-current" /> Turbo
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-12 flex flex-col items-center space-y-4">
        {isDone ? (
          <button
            onClick={() => router.push(`/projects?videoId=${videoId}`)}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-brand hover:bg-brand-hover text-black font-bold text-sm transition-all active:scale-[0.98]"
          >
            <CheckCircle2 className="w-4 h-4" />
            View My Clips
          </button>
        ) : (
          <>
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2.5 px-8 py-3.5 rounded-full border border-white/10 bg-[#0A0F0D] hover:bg-[#111815] hover:border-white/20 text-gray-300 font-bold text-sm transition-all active:scale-[0.98]"
            >
              Go to Dashboard
            </button>
            <p className="text-gray-500 text-xs text-center max-w-sm leading-relaxed">
              You can leave this page — processing continues in the background.
              Check your Projects when done.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

export default function ProcessingPage() {
  return (
    <DashboardLayout showHeader={false}>
      <ProcessingHeader />
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center text-white">
            Loading…
          </div>
        }
      >
        <ProcessingContent />
      </Suspense>

      <footer className="w-full flex flex-col md:flex-row items-center justify-between px-10 py-8 border-t border-white/5 mt-auto bg-transparent relative z-10 gap-4">
        <p className="text-gray-500 text-xs font-medium">© 2024 ClipCash AI. All rights reserved.</p>
        <div className="flex items-center gap-8">
          <Link href="/privacy" className="text-gray-500 hover:text-gray-300 text-xs font-medium transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="text-gray-500 hover:text-gray-300 text-xs font-medium transition-colors">Terms of Service</Link>
        </div>
      </footer>
    </DashboardLayout>
  );
}
