"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import ProcessingHeader from "@/components/dashboard/ProcessingHeader";
import DashboardLayout from "@/components/shared/DashboardLayout";
import { getProjectsData } from "@/lib/queries";
import apiClient from "@/lib/apiClient";
import { Sparkles, Clock, RefreshCw, Zap, CheckCircle2, AlertCircle } from "lucide-react";

// ─── Strategy ─────────────────────────────────────────────────────────────────
// 1. Primary:  SSE via /api/sse/events/processing-progress/:videoId
//    - Dedicated streaming proxy that pipes bytes without buffering
//    - Gives real-time progress from the backend AI engine
// 2. Fallback: Poll GET /videos/:id every 4 s
//    - Kicks in automatically if SSE fails / drops after 8 s of silence
//    - Checks clipsCount / status field on the video object
// Both paths prefetch clips into React Query cache and navigate instantly.

const SSE_SILENCE_TIMEOUT = 8_000;   // switch to poll if no SSE event in 8 s
const POLL_INTERVAL       = 4_000;   // poll every 4 s
const MAX_WAIT_MS         = 10 * 60 * 1000; // 10 min hard cap

type Status = "analyzing" | "processing" | "done" | "completed" | "failed" | "error";

function ProcessingContent() {
  const [progress,   setProgress]   = useState(0);
  const [statusMsg,  setStatusMsg]  = useState("Connecting to AI engine…");
  const [clipsFound, setClipsFound] = useState<number | null>(null);
  const [isDone,     setIsDone]     = useState(false);
  const [hasError,   setHasError]   = useState(false);
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);
  const [mode,       setMode]       = useState<"sse" | "polling">("sse");

  const searchParams = useSearchParams();
  const router       = useRouter();
  const queryClient  = useQueryClient();
  const videoId      = searchParams.get("videoId");

  const navigated      = useRef(false);
  const startedAt      = useRef(Date.now());
  const esRef          = useRef<EventSource | null>(null);
  const pollRef        = useRef<NodeJS.Timeout | null>(null);
  const silenceRef     = useRef<NodeJS.Timeout | null>(null);
  const usingPoll      = useRef(false);

  useEffect(() => {
    if (!videoId || videoId === "undefined") {
      setStatusMsg("Missing video ID — redirecting…");
      setTimeout(() => router.push("/dashboard"), 3000);
      return;
    }

    // ── Shared finish handler ──────────────────────────────────────────────
    const finish = async (vid: string) => {
      if (navigated.current) return;
      navigated.current = true;

      esRef.current?.close();
      if (pollRef.current)   clearInterval(pollRef.current);
      if (silenceRef.current) clearTimeout(silenceRef.current);

      setIsDone(true);
      setProgress(100);
      setStatusMsg("All clips generated! Loading your clips…");

      try {
        const clips = await getProjectsData(vid);
        queryClient.setQueryData(["projectsData", vid], clips);
        queryClient.invalidateQueries({ queryKey: ["sidebarClipCount"] });
      } catch { /* non-fatal */ }

      router.push(`/projects?videoId=${vid}`);
    };

    const failWith = (msg: string) => {
      esRef.current?.close();
      if (pollRef.current)    clearInterval(pollRef.current);
      if (silenceRef.current) clearTimeout(silenceRef.current);
      setHasError(true);
      setErrorMsg(msg);
    };

    // ── Polling fallback ───────────────────────────────────────────────────
    const startPolling = () => {
      if (usingPoll.current) return;
      usingPoll.current = true;
      setMode("polling");

      const poll = async () => {
        if (navigated.current) return;
        if (Date.now() - startedAt.current > MAX_WAIT_MS) {
          failWith("Processing is taking longer than expected. Check your Projects page in a few minutes.");
          return;
        }
        try {
          const res   = await apiClient.get(`/videos/${videoId}`);
          const video = res.data;
          const status: Status = video.status ?? "processing";

          if (status === "failed" || status === "error") {
            failWith(video.errorMessage || "Generation failed. Please try again.");
            return;
          }

          // Animate progress based on elapsed time
          const elapsed = (Date.now() - startedAt.current) / 1000;
          if (status === "analyzing") {
            setStatusMsg("Analyzing video retention patterns…");
            setProgress(Math.min(25, Math.round(elapsed * 0.6)));
          } else if (status === "processing") {
            setStatusMsg("AI is generating viral clips…");
            setProgress(Math.min(90, 25 + Math.round(elapsed * 0.4)));
          }

          const clips = video.clips ?? [];
          const count = typeof video.clipsCount === "number"
            ? video.clipsCount
            : clips.length;

          if (count > 0) setClipsFound(count);

          if (status === "done" || status === "completed" || count > 0) {
            await finish(videoId);
          }
        } catch (e: any) {
          console.warn("[poll] transient error, retrying:", e?.message);
        }
      };

      poll(); // immediate first check
      pollRef.current = setInterval(poll, POLL_INTERVAL);
    };

    // ── SSE primary ────────────────────────────────────────────────────────
    const connectSSE = () => {
      // Dedicated SSE proxy — streams bytes without buffering
      const url = `/api/sse/events/processing-progress/${videoId}`;
      console.log("[sse] connecting →", url);

      const es = new EventSource(url);
      esRef.current = es;

      // Silence watchdog — if no event arrives in SSE_SILENCE_TIMEOUT, fall back
      const resetSilence = () => {
        if (silenceRef.current) clearTimeout(silenceRef.current);
        silenceRef.current = setTimeout(() => {
          console.warn("[sse] silence timeout — switching to polling");
          es.close();
          startPolling();
        }, SSE_SILENCE_TIMEOUT);
      };
      resetSilence();

      es.onopen = () => {
        console.log("[sse] connected");
        setStatusMsg("AI engine connected — analyzing your video…");
        resetSilence();
      };

      es.onmessage = (event) => {
        resetSilence(); // got a heartbeat / data — reset watchdog
        try {
          const data = JSON.parse(event.data);
          console.log("[sse] event:", data);

          if (typeof data.progress === "number") {
            setProgress(data.progress);
          }
          if (typeof data.clipsFound === "number") {
            setClipsFound(data.clipsFound);
          } else if (Array.isArray(data.clips) && data.clips.length > 0) {
            setClipsFound(data.clips.length);
          }

          const status: Status = data.status;

          if (status === "failed" || status === "error") {
            failWith(
              data.message && !data.message.toLowerCase().includes("status code")
                ? data.message
                : "Generation failed. Please try again."
            );
            return;
          }

          if (data.message) setStatusMsg(data.message);

          if (status === "done" || status === "completed" || data.progress >= 100) {
            finish(videoId);
          }
        } catch (e) {
          console.warn("[sse] parse error:", e);
        }
      };

      es.onerror = () => {
        console.warn("[sse] connection error — switching to polling");
        es.close();
        esRef.current = null;
        if (silenceRef.current) clearTimeout(silenceRef.current);
        if (!navigated.current) startPolling();
      };
    };

    connectSSE();

    return () => {
      esRef.current?.close();
      if (pollRef.current)    clearInterval(pollRef.current);
      if (silenceRef.current) clearTimeout(silenceRef.current);
    };
  }, [videoId, router, queryClient]);

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
            {isDone
              ? "Clips are ready!"
              : hasError
              ? "Generation failed"
              : "AI is finding viral moments…"}
          </h1>
          <p className={`text-lg md:text-xl max-w-2xl mx-auto font-medium ${hasError ? "text-red-400" : "text-gray-400"}`}>
            {hasError ? errorMsg : statusMsg}
          </p>
          {/* Show polling indicator unobtrusively */}
          {mode === "polling" && !isDone && !hasError && (
            <p className="text-[11px] text-[#3A4A43] font-medium">
              Checking for updates every {POLL_INTERVAL / 1000}s…
            </p>
          )}
        </div>
      </div>

      {/* Progress card */}
      <div className="w-full max-w-4xl bg-[#0A0F0D] border border-white/5 rounded-[32px] p-8 md:p-10 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 border border-[#00FF85]/10 rounded-[32px] pointer-events-none group-hover:border-[#00FF85]/20 transition-colors" />

        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-[#111815] border border-white/5 flex items-center justify-center">
                <RefreshCw className={`w-3.5 h-3.5 text-[#00FF85] ${!isDone && !hasError ? "animate-spin" : ""}`} />
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
                {mode === "sse" ? "Live Stream" : "Polling"}
              </span>
            </div>
            <span className="text-3xl font-black text-[#00FF85]">{progress}%</span>
          </div>

          <div className="relative h-4 w-full bg-[#111815] rounded-full overflow-hidden border border-white/5">
            <div
              className="absolute top-0 left-0 h-full bg-[#00FF85] rounded-full transition-all duration-700 ease-out shadow-[0_0_20px_rgba(0,255,133,0.4)]"
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
                  ? `~${Math.max(1, Math.round((100 - progress) * 0.5))}s remaining`
                  : "Estimating time…"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <div className={`w-2 h-2 rounded-full ${hasError ? "bg-red-400" : "bg-[#00FF85] animate-pulse"} shadow-[0_0_8px_#00FF85]`} />
              <span className="text-gray-300">{hasError ? "Error" : "GPU Accelerated"}</span>
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
        ) : hasError ? (
          <>
            <button
              onClick={() => router.push("/clips")}
              className="flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-brand hover:bg-brand-hover text-black font-bold text-sm transition-all active:scale-[0.98]"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2.5 px-8 py-3.5 rounded-full border border-white/10 bg-[#0A0F0D] hover:bg-[#111815] hover:border-white/20 text-gray-300 font-bold text-sm transition-all active:scale-[0.98]"
            >
              Go to Dashboard
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2.5 px-8 py-3.5 rounded-full border border-white/10 bg-[#0A0F0D] hover:bg-[#111815] hover:border-white/20 text-gray-300 font-bold text-sm transition-all active:scale-[0.98]"
            >
              Go to Dashboard
            </button>
            <p className="text-gray-500 text-xs text-center max-w-sm leading-relaxed">
              You can leave — processing continues in the background. Check Projects when done.
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
            <RefreshCw className="w-6 h-6 animate-spin text-brand" />
          </div>
        }
      >
        <ProcessingContent />
      </Suspense>

      <footer className="w-full flex flex-col md:flex-row items-center justify-between px-10 py-8 border-t border-white/5 mt-auto bg-transparent relative z-10 gap-4">
        <p className="text-gray-500 text-xs font-medium">© 2024 ClipCash AI. All rights reserved.</p>
        <div className="flex items-center gap-8">
          <Link href="/privacy" className="text-gray-500 hover:text-gray-300 text-xs font-medium transition-colors">Privacy Policy</Link>
          <Link href="/terms"   className="text-gray-500 hover:text-gray-300 text-xs font-medium transition-colors">Terms of Service</Link>
        </div>
      </footer>
    </DashboardLayout>
  );
}
