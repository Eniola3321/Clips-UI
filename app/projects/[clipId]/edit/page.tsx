"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getClipById, updateClip } from "@/lib/queries";
import { Loader2, Save, ArrowLeft, Play, Pause } from "lucide-react";

const PLATFORMS = [
  { id: "tiktok", name: "TikTok", icon: "📶" },
  { id: "instagram", name: "Reels", icon: "📷" },
  { id: "youtube", name: "Shorts", icon: "▶️" },
];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

// Waveform heights pattern — repeated across the bar
const WAVE = [30, 55, 70, 45, 80, 60, 35, 75, 50, 65, 40, 85, 55, 70, 45];

function ClipEditInner() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const clipId = params.clipId as string;

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  // Wraps both video + trim so trim inherits the video's natural width
  const colRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedPlatform, setSelectedPlatform] = useState("tiktok");
  const [audioUrlInput, setAudioUrlInput] = useState("");

  // dragging ref — "start" | "end" | null
  const dragging = useRef<"start" | "end" | null>(null);

  const [form, setForm] = useState({
    title: "",
    caption: "",
    startTime: 0,
    endTime: 0,
    audioOverlayUrl: "",
    audioFile: null as File | null,
  });

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: clip, isLoading } = useQuery({
    queryKey: ["clip", clipId],
    queryFn: () => getClipById(clipId),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateClip(clipId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clip", clipId] });
      queryClient.invalidateQueries({ queryKey: ["projectsData"] });
      router.push("/projects");
    },
  });

  // ── Populate form from clip ────────────────────────────────────────────────
  useEffect(() => {
    if (clip) {
      const startTime = clip.startTime ?? 0;
      const endTime = clip.endTime ?? (clip.duration ?? 0);
      setForm({
        title: clip.title ?? "",
        caption: clip.caption ?? "",
        startTime,
        endTime,
        audioOverlayUrl: clip.audioOverlayUrl ?? "",
        audioFile: null,
      });
      if (clip.duration) setDuration(clip.duration);
      if (clip.platform) setSelectedPlatform(clip.platform);
      setAudioUrlInput(clip.audioOverlayUrl ?? "");
    }
  }, [clip]);

  // ── Video / audio play state ───────────────────────────────────────────────
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.play().catch(() => setIsPlaying(false));
      else videoRef.current.pause();
    }
    if (audioRef.current && form.audioOverlayUrl) {
      if (isPlaying) audioRef.current.play().catch(() => {});
      else audioRef.current.pause();
    }
  }, [isPlaying, form.audioOverlayUrl]);

  // ── Enforce trim boundaries during playback ────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTimeUpdate = () => {
      if (video.currentTime > form.endTime) {
        video.currentTime = form.startTime;
        if (!isPlaying) video.pause();
      }
      setCurrentTime(video.currentTime);
    };
    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [form.startTime, form.endTime, isPlaying]);

  // ── Trim drag helpers ──────────────────────────────────────────────────────
  const getTimeFromPointer = (clientX: number): number => {
    if (!trackRef.current || duration === 0) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    return ratio * duration;
  };

  const onTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || duration === 0) return;
    const time = getTimeFromPointer(e.clientX);
    if (dragging.current === "start") {
      setForm((prev) => ({
        ...prev,
        startTime: Math.max(0, Math.min(time, prev.endTime - 0.5)),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        endTime: Math.min(duration, Math.max(time, prev.startTime + 0.5)),
      }));
    }
  };

  const onTrackPointerUp = () => { dragging.current = null; };

  const startHandleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    dragging.current = "start";
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const endHandleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    dragging.current = "end";
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  // ── Misc handlers ──────────────────────────────────────────────────────────
  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setForm({ ...form, audioFile: e.target.files[0] });
  };

  const handleSave = () => {
    updateMutation.mutate({
      title: form.title,
      caption: form.caption,
      startTime: form.startTime,
      endTime: form.endTime,
      audioOverlayUrl: form.audioOverlayUrl,
      platform: selectedPlatform,
    });
  };

  const applyAudioUrl = () =>
    setForm((prev) => ({ ...prev, audioOverlayUrl: audioUrlInput.trim() }));

  // ── Computed trim percentages ──────────────────────────────────────────────
  const startPct = duration > 0 ? (form.startTime / duration) * 100 : 0;
  const endPct   = duration > 0 ? (form.endTime   / duration) * 100 : 100;
  const headPct  = duration > 0 ? (currentTime    / duration) * 100 : 0;

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-[#050505]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-brand animate-spin" />
          <p className="text-[#5A6F65] text-sm">Loading clip…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 sm:p-6 lg:p-10">
      <div className="max-w-7xl mx-auto bg-[#0B100E] border border-white/5 rounded-[24px] overflow-hidden">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="text-[#8e9895] hover:text-white transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold">Clip Editor: "{clip?.title || "Untitled"}"</h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="text-[#5A6F65] hover:text-white transition-colors px-4 py-2 text-sm">
              Discard Changes
            </button>
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="px-6 py-3 bg-brand hover:bg-brand-hover text-black font-black rounded-xl flex items-center gap-2 transition-all disabled:opacity-70"
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save & Return
            </button>
          </div>
        </div>

        {/* ── Main grid ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2">

          {/* ── LEFT: video + trim ──────────────────────────────────────── */}
          <div className="p-8 border-r border-white/5 flex flex-col items-start gap-6">

            {/* Platform tabs */}
            <div className="flex items-center gap-3 bg-[#0a0f0d] rounded-2xl px-4 py-3">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlatform(p.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedPlatform === p.id
                      ? "bg-[#1a1f1d] border border-white/10 text-white"
                      : "text-[#5A6F65] hover:text-white"
                  }`}
                >
                  <span>{p.icon}</span>{p.name}
                </button>
              ))}
            </div>

            {/*
              colRef wraps video + trim.
              The video is inline-block (w-auto/h-auto) so the column shrinks to it.
              The trim bar uses w-full so it fills exactly that shrunk width.
              No pixel measurement needed.
            */}
            <div ref={colRef} className="inline-flex flex-col items-stretch gap-3 max-w-full">

              {/* Video */}
              <div className="relative bg-black rounded-2xl overflow-hidden">
                {clip?.clipUrl ? (
                  <>
                    <video
                      ref={videoRef}
                      src={clip.clipUrl}
                      className="block w-auto h-auto max-w-full max-h-[52vh]"
                      onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                    />
                    <div
                      className="absolute inset-0 flex items-center justify-center cursor-pointer"
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {!isPlaying && (
                        <div className="w-16 h-16 rounded-full bg-brand/20 border border-brand/40 backdrop-blur-md flex items-center justify-center">
                          <Play className="w-7 h-7 text-brand ml-1" />
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center w-64 h-40 text-[#5A6F65] text-sm">
                    Video not available
                  </div>
                )}
              </div>

              {/* ── Trim bar — same width as video via inline-flex parent ── */}
              <div className="bg-[#0a0f0d] border border-white/5 rounded-2xl px-4 pt-3 pb-4 w-full">

                {/* Time labels */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-[#8e9895] tabular-nums">{formatTime(form.startTime)}</span>
                  <span className="text-[11px] text-brand font-black">
                    Trim Clip ({formatTime(form.endTime - form.startTime)})
                  </span>
                  <span className="text-[11px] text-[#8e9895] tabular-nums">{formatTime(duration)}</span>
                </div>

                {/*
                  Track — handles live here.
                  onPointerMove on the track catches movement even when pointer
                  leaves the handle (setPointerCapture ensures events keep coming).
                */}
                <div
                  ref={trackRef}
                  className="relative h-14 rounded-lg bg-[#060908] select-none touch-none"
                  onPointerMove={onTrackPointerMove}
                  onPointerUp={onTrackPointerUp}
                  onPointerCancel={onTrackPointerUp}
                >
                  {/* ── Waveform bars (full width, dim colour) ── */}
                  <div className="absolute inset-0 flex items-center justify-around px-1 pointer-events-none">
                    {Array.from({ length: 36 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-0.5 rounded-full bg-white/15"
                        style={{ height: `${WAVE[i % WAVE.length]}%` }}
                      />
                    ))}
                  </div>

                  {/* ── Dim overlay before start ── */}
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-black/55 rounded-l-lg pointer-events-none"
                    style={{ width: `${startPct}%` }}
                  />

                  {/* ── Selected region: green tint + green bars ── */}
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none overflow-hidden"
                    style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
                  >
                    <div className="absolute inset-0 bg-brand/15" />
                    <div className="absolute inset-0 flex items-center justify-around px-1">
                      {Array.from({ length: 36 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-0.5 rounded-full bg-brand/60"
                          style={{ height: `${WAVE[i % WAVE.length]}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* ── Dim overlay after end ── */}
                  <div
                    className="absolute top-0 bottom-0 right-0 bg-black/55 rounded-r-lg pointer-events-none"
                    style={{ left: `${endPct}%` }}
                  />

                  {/* ── Playhead ── */}
                  <div
                    className="absolute top-0 bottom-0 w-px bg-white/60 pointer-events-none z-10"
                    style={{ left: `${headPct}%` }}
                  />

                  {/* ── Start bracket handle ── */}
                  <div
                    className="absolute top-0 bottom-0 z-20 cursor-ew-resize"
                    style={{
                      left: `${startPct}%`,
                      transform: "translateX(-50%)",
                      width: 14,
                    }}
                    onPointerDown={startHandleDown}
                    onPointerMove={onTrackPointerMove}
                    onPointerUp={onTrackPointerUp}
                  >
                    {/* thick green bar */}
                    <div className="w-full h-full bg-brand rounded-sm flex flex-col items-center justify-center gap-1">
                      <div className="w-0.5 h-3 bg-black/30 rounded-full" />
                      <div className="w-0.5 h-3 bg-black/30 rounded-full" />
                    </div>
                  </div>

                  {/* ── End bracket handle ── */}
                  <div
                    className="absolute top-0 bottom-0 z-20 cursor-ew-resize"
                    style={{
                      left: `${endPct}%`,
                      transform: "translateX(-50%)",
                      width: 14,
                    }}
                    onPointerDown={endHandleDown}
                    onPointerMove={onTrackPointerMove}
                    onPointerUp={onTrackPointerUp}
                  >
                    <div className="w-full h-full bg-brand rounded-sm flex flex-col items-center justify-center gap-1">
                      <div className="w-0.5 h-3 bg-black/30 rounded-full" />
                      <div className="w-0.5 h-3 bg-black/30 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: form ─────────────────────────────────────────────── */}
          <div className="p-8 space-y-8">

            {/* Caption */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold">Video Caption</h3>
                <span className="text-[10px] text-[#5A6F65] px-2 py-1 bg-white/5 rounded-lg">AI Suggested</span>
              </div>
              <textarea
                value={form.caption}
                onChange={(e) => setForm({ ...form, caption: e.target.value })}
                placeholder="Write a caption for your video…"
                className="w-full bg-[#0a0f0d] border border-white/5 focus:border-brand/40 rounded-2xl p-5 text-white text-sm outline-none transition-colors placeholder-[#3A4A43] resize-none"
                rows={4}
              />
            </div>

            {/* Sound Track */}
            <div className="space-y-4">
              <h3 className="text-base font-bold">Sound Track</h3>

              {/* File upload */}
              <label className="flex items-center justify-between bg-[#0a0f0d] border border-white/5 hover:border-brand/30 transition-all rounded-xl px-4 py-3 cursor-pointer">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#8e9895]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                  </svg>
                  <span className="text-sm">{form.audioFile ? form.audioFile.name : "Upload Sound Track"}</span>
                </div>
                <input type="file" accept="audio/*" onChange={handleAudioFileChange} className="hidden" />
                <svg className="w-5 h-5 text-[#5A6F65]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </label>

              {/* URL input */}
              <div>
                <label className="block text-xs text-[#8e9895] font-medium mb-2">Or use URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={audioUrlInput}
                    onChange={(e) => setAudioUrlInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyAudioUrl(); } }}
                    placeholder="https://example.com/sound.mp3"
                    className="flex-1 bg-[#0a0f0d] border border-white/5 focus:border-brand/40 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder-[#3A4A43]"
                  />
                  <button
                    type="button"
                    onClick={applyAudioUrl}
                    className="px-4 py-3 bg-brand/10 hover:bg-brand/20 border border-brand/30 text-brand text-sm font-semibold rounded-xl transition-all whitespace-nowrap"
                  >
                    Apply
                  </button>
                </div>
                {form.audioOverlayUrl && (
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[10px] text-brand/70 truncate max-w-[80%]">✓ Active: {form.audioOverlayUrl}</p>
                    <button
                      type="button"
                      onClick={() => { setAudioUrlInput(""); setForm((p) => ({ ...p, audioOverlayUrl: "" })); }}
                      className="text-[10px] text-[#5A6F65] hover:text-red-400 transition-colors ml-2"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Instant Publish */}
            <button className="w-full bg-[#0a0f0d] border border-white/5 hover:border-brand/30 transition-all rounded-2xl py-5 flex items-center justify-between px-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center">
                  <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.92 14.92 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758 4.49 4.49 0 00-1.758-4.306 4.493 4.493 0 00-4.306 1.758z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-xs font-black text-[#5A6F65] uppercase tracking-widest">Instant Publish</p>
                  <p className="text-sm font-medium">Post directly to {selectedPlatform}</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-[#5A6F65]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Audio element — key forces remount when URL changes */}
      {form.audioOverlayUrl && (
        <audio key={form.audioOverlayUrl} ref={audioRef} src={form.audioOverlayUrl} loop style={{ display: "none" }} />
      )}
    </div>
  );
}

export default function ClipEditPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center min-h-screen bg-[#050505]">
        <Loader2 className="w-10 h-10 text-brand animate-spin" />
      </div>
    }>
      <ClipEditInner />
    </Suspense>
  );
}
