"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Pause,
  Music,
  X,
  Loader2,
  Save,
  Tv2,
  Video,
  TvMinimalPlay,
  Volume2,
  VolumeX,
} from "lucide-react";
import { getClipById, updateClip } from "@/lib/queries";
import { useToast } from "@/components/shared/ToastProvider";
import DashboardLayout from "@/components/shared/DashboardLayout";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ClipData {
  id: number;
  title: string;
  caption: string;
  clipUrl: string | null;
  thumbnail: string | null;
  startTime: number;
  endTime: number;
  duration: number;
  audioOverlayUrl: string | null;
  platform: string;
  viralScore?: number;
}

const PLATFORMS = [
  { key: "tiktok", label: "TikTok", Icon: Tv2 },
  { key: "instagram", label: "Reels", Icon: Video },
  { key: "youtube", label: "Shorts", Icon: TvMinimalPlay },
];


// ─── Trim Slider ────────────────────────────────────────────────────────────

interface TrimSliderProps {
  totalDuration: number;
  startTime: number;
  endTime: number;
  currentTime: number;
  onChange: (start: number, end: number) => void;
}

function TrimSlider({ totalDuration, startTime, endTime, currentTime, onChange }: TrimSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"start" | "end" | null>(null);

  const toPercent = (t: number) => (totalDuration > 0 ? (t / totalDuration) * 100 : 0);

  const getTimeFromEvent = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!trackRef.current) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * totalDuration;
    },
    [totalDuration]
  );

  const onMouseDown = (handle: "start" | "end") => (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = handle;
  };

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      const t = getTimeFromEvent(e);
      if (dragging.current === "start") {
        onChange(Math.min(t, endTime - 1), endTime);
      } else {
        onChange(startTime, Math.max(t, startTime + 1));
      }
    };
    const onUp = () => { dragging.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [getTimeFromEvent, onChange, startTime, endTime]);

  const startPct = toPercent(startTime);
  const endPct = toPercent(endTime);
  const playPct = toPercent(currentTime);
  const clipDuration = endTime - startTime;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] font-bold text-[#5A6F65]">
        <span>{formatTime(startTime)}</span>
        <span className="text-brand">Trim Clip ({formatTime(clipDuration)})</span>
        <span>{formatTime(totalDuration)}</span>
      </div>

      <div ref={trackRef} className="relative h-12 flex items-center select-none cursor-pointer">
        {/* Waveform bars */}
        <div className="absolute inset-x-0 h-8 flex items-center gap-[2px] px-1">
          {Array.from({ length: 60 }, (_, i) => {
            const pct = (i / 60) * 100;
            const inRange = pct >= startPct && pct <= endPct;
            const heights = [40, 70, 55, 85, 50, 90, 65, 45, 80, 60];
            const h = heights[i % heights.length];
            return (
              <div
                key={i}
                className="flex-1 rounded-sm transition-colors duration-150"
                style={{
                  height: `${h}%`,
                  backgroundColor: inRange ? "rgba(0,229,143,0.7)" : "rgba(255,255,255,0.08)",
                }}
              />
            );
          })}
        </div>

        {/* Selected range overlay */}
        <div
          className="absolute top-0 h-full border-y-2 border-brand bg-brand/10 pointer-events-none"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
        />

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/60 pointer-events-none z-10"
          style={{ left: `${playPct}%` }}
        />

        {/* Start handle */}
        <div
          onMouseDown={onMouseDown("start")}
          className="absolute top-0 bottom-0 w-4 flex items-center justify-center cursor-ew-resize z-20"
          style={{ left: `calc(${startPct}% - 8px)` }}
        >
          <div className="w-3 h-8 rounded bg-brand flex items-center justify-center shadow-[0_0_10px_rgba(0,229,143,0.5)]">
            <div className="w-0.5 h-4 bg-black/40 rounded" />
          </div>
        </div>

        {/* End handle */}
        <div
          onMouseDown={onMouseDown("end")}
          className="absolute top-0 bottom-0 w-4 flex items-center justify-center cursor-ew-resize z-20"
          style={{ left: `calc(${endPct}% - 8px)` }}
        >
          <div className="w-3 h-8 rounded bg-brand flex items-center justify-center shadow-[0_0_10px_rgba(0,229,143,0.5)]">
            <div className="w-0.5 h-4 bg-black/40 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}


// ─── Main ClipEditor Component ──────────────────────────────────────────────

export default function ClipEditor({ clipId }: { clipId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);

  // ── State ──────────────────────────────────────────────────────────────────
  const [clip, setClip] = useState<ClipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [platform, setPlatform] = useState("tiktok");
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(30);
  const [audioOverlayUrl, setAudioOverlayUrl] = useState("");
  const [totalDuration, setTotalDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);

  // ── Load clip ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const data = await getClipById(clipId);
        setClip(data);
        setTitle(data.title ?? "");
        setCaption(data.caption ?? "");
        setPlatform(data.platform ?? "tiktok");
        setStartTime(data.startTime ?? 0);
        setEndTime(data.endTime ?? data.duration ?? 30);
        setAudioOverlayUrl(data.audioOverlayUrl ?? "");
      } catch {
        toast("Failed to load clip", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [clipId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Video meta ─────────────────────────────────────────────────────────────
  const onLoadedMetadata = () => {
    if (!videoRef.current) return;
    const d = videoRef.current.duration;
    setTotalDuration(d);
    if (!clip?.endTime) setEndTime(d);
  };

  const onTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);
    // Loop within trim range
    if (t >= endTime) {
      videoRef.current.currentTime = startTime;
      if (!playing) videoRef.current.pause();
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
      setPlaying(false);
    } else {
      videoRef.current.currentTime = Math.max(startTime, currentTime < startTime ? startTime : currentTime);
      videoRef.current.play();
      setPlaying(true);
    }
  };

  const handleTrimChange = (start: number, end: number) => {
    setStartTime(start);
    setEndTime(end);
    if (videoRef.current) videoRef.current.currentTime = start;
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await updateClip(clipId, {
        title,
        caption,
        startTime,
        endTime,
        duration: Math.round(endTime - startTime),
        audioOverlayUrl: audioOverlayUrl || undefined,
        platform,
      });
      toast("Clip saved successfully!", "success");
      router.back();
    } catch {
      toast("Failed to save clip", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardLayout showSidebar={false} showHeader={false}>
        <div className="flex-1 flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 text-brand animate-spin" />
        </div>
      </DashboardLayout>
    );
  }


  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout showSidebar={false} showHeader={false}>
      <div className="flex-1 flex flex-col min-h-screen bg-[#060A08]">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#070B09]/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <p className="text-[11px] font-medium text-[#5A6F65] uppercase tracking-widest">Clip Editor</p>
              <h1 className="text-[16px] font-black text-white leading-tight truncate max-w-[260px] sm:max-w-sm">
                {title || "Untitled Clip"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[13px] font-bold transition-all"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-black text-[13px] font-black transition-all hover:bg-brand-hover active:scale-[0.97] disabled:opacity-60 shadow-[0_0_20px_rgba(0,229,143,0.3)]"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving…" : "Save & Return"}
            </button>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 max-w-[1400px] w-full mx-auto">

          {/* ── Left: Video Preview + Trim ─────────────────────────────── */}
          <div className="flex flex-col gap-4 lg:w-[520px] shrink-0">

            {/* Platform tabs */}
            <div className="flex gap-2 bg-white/5 border border-white/8 p-1 rounded-2xl w-fit">
              {PLATFORMS.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setPlatform(key)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-black transition-all ${
                    platform === key
                      ? "bg-brand text-black shadow-[0_0_16px_rgba(0,229,143,0.35)]"
                      : "text-[#5A6F65] hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Video player — portrait frame */}
            <div className="relative flex justify-center">
              <div className="relative w-[280px] rounded-[28px] overflow-hidden border border-white/10 bg-black shadow-[0_0_60px_rgba(0,229,143,0.08)]">
                {clip?.clipUrl ? (
                  <video
                    ref={videoRef}
                    src={clip.clipUrl}
                    className="w-full object-cover"
                    onLoadedMetadata={onLoadedMetadata}
                    onTimeUpdate={onTimeUpdate}
                    onEnded={() => setPlaying(false)}
                    playsInline
                    muted={muted}
                    poster={clip.thumbnail ?? undefined}
                    style={{ aspectRatio: "9/16" }}
                  />
                ) : (
                  <div className="w-full bg-[#0E1512] flex items-center justify-center" style={{ aspectRatio: "9/16" }}>
                    <p className="text-[#3A4A43] text-[13px]">No preview</p>
                  </div>
                )}

                {/* Play/Pause overlay */}
                <button
                  onClick={togglePlay}
                  className="absolute inset-0 flex items-center justify-center group"
                >
                  <div className={`w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-xl transition-opacity duration-200 ${playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}>
                    {playing
                      ? <Pause className="w-6 h-6 text-white fill-white" />
                      : <Play className="w-6 h-6 text-white fill-white ml-1" />
                    }
                  </div>
                </button>

                {/* Mute toggle — bottom right corner */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (videoRef.current) videoRef.current.muted = !muted;
                    setMuted(!muted);
                  }}
                  className="absolute bottom-3 right-3 z-20 w-8 h-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-black/80 transition-colors backdrop-blur-md"
                  title={muted ? "Unmute" : "Mute"}
                >
                  {muted
                    ? <VolumeX className="w-3.5 h-3.5" />
                    : <Volume2 className="w-3.5 h-3.5" />
                  }
                </button>
              </div>
            </div>

            {/* Trim slider */}
            <div className="bg-[#0A0F0D] border border-white/8 rounded-2xl p-4">
              <TrimSlider
                totalDuration={totalDuration || (clip?.duration ?? 60)}
                startTime={startTime}
                endTime={endTime}
                currentTime={currentTime}
                onChange={handleTrimChange}
              />
              {/* Manual time inputs */}
              <div className="flex items-center gap-3 mt-4">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-[#5A6F65] uppercase tracking-widest mb-1 block">Start (s)</label>
                  <input
                    type="number"
                    min={0}
                    max={endTime - 1}
                    step={0.5}
                    value={startTime}
                    onChange={(e) => setStartTime(Math.min(Number(e.target.value), endTime - 1))}
                    className="w-full bg-[#060A08] border border-white/8 rounded-xl px-3 py-2 text-white text-[13px] font-bold focus:outline-none focus:border-brand/50 transition-colors"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-[#5A6F65] uppercase tracking-widest mb-1 block">End (s)</label>
                  <input
                    type="number"
                    min={startTime + 1}
                    max={totalDuration || clip?.duration}
                    step={0.5}
                    value={endTime}
                    onChange={(e) => setEndTime(Math.max(Number(e.target.value), startTime + 1))}
                    className="w-full bg-[#060A08] border border-white/8 rounded-xl px-3 py-2 text-white text-[13px] font-bold focus:outline-none focus:border-brand/50 transition-colors"
                  />
                </div>
                <div className="shrink-0 text-center">
                  <label className="text-[10px] font-bold text-[#5A6F65] uppercase tracking-widest mb-1 block">Duration</label>
                  <div className="px-3 py-2 bg-brand/10 border border-brand/20 rounded-xl text-brand text-[13px] font-black">
                    {formatTime(endTime - startTime)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: Edit Controls ───────────────────────────────────── */}
          <div className="flex-1 flex flex-col gap-5">

            {/* Title */}
            <div className="bg-[#0A0F0D] border border-white/8 rounded-2xl p-5 space-y-2">
              <label className="text-[11px] font-black text-[#5A6F65] uppercase tracking-widest block">Clip Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your clip a title…"
                className="w-full bg-[#060A08] border border-white/8 rounded-xl px-4 py-3 text-white text-[14px] font-bold focus:outline-none focus:border-brand/50 transition-colors placeholder:text-[#3A4A43]"
              />
            </div>

            {/* Caption */}
            <div className="bg-[#0A0F0D] border border-white/8 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-[#5A6F65] uppercase tracking-widest">Caption</label>
                <span className="text-[10px] font-medium text-brand/60 bg-brand/10 px-2 py-0.5 rounded-md border border-brand/20">AI Suggested</span>
              </div>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption with hashtags…"
                rows={4}
                className="w-full bg-[#060A08] border border-white/8 rounded-xl px-4 py-3 text-white text-[14px] leading-relaxed focus:outline-none focus:border-brand/50 transition-colors resize-none placeholder:text-[#3A4A43]"
              />
              <p className="text-[10px] text-[#3A4A43] text-right">{caption.length} chars</p>
            </div>

            {/* Viral Sound Overlay */}
            <div className="bg-[#0A0F0D] border border-white/8 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-brand" />
                <label className="text-[11px] font-black text-[#5A6F65] uppercase tracking-widest">Viral Sound Overlay</label>
                <span className="text-[10px] text-[#3A4A43]">Optional</span>
              </div>
              <div className="relative">
                <input
                  type="url"
                  value={audioOverlayUrl}
                  onChange={(e) => setAudioOverlayUrl(e.target.value)}
                  placeholder="https://example.com/viral-sound.mp3"
                  className="w-full bg-[#060A08] border border-white/8 rounded-xl px-4 py-3 pr-10 text-white text-[13px] focus:outline-none focus:border-brand/50 transition-colors placeholder:text-[#3A4A43]"
                />
                {audioOverlayUrl && (
                  <button
                    onClick={() => setAudioOverlayUrl("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A6F65] hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {audioOverlayUrl && (
                <p className="text-[11px] text-brand/70 font-medium">✓ Audio overlay will be applied on save</p>
              )}
            </div>

            {/* Clip Info (read-only summary) */}
            <div className="bg-[#0A0F0D] border border-white/8 rounded-2xl p-5">
              <p className="text-[11px] font-black text-[#5A6F65] uppercase tracking-widest mb-3">Clip Summary</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Platform", value: platform.charAt(0).toUpperCase() + platform.slice(1) },
                  { label: "Duration", value: formatTime(endTime - startTime) },
                  { label: "Start", value: `${startTime.toFixed(1)}s` },
                  { label: "End", value: `${endTime.toFixed(1)}s` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white/3 border border-white/5 rounded-xl px-3 py-3">
                    <p className="text-[10px] font-medium text-[#3A4A43] mb-1">{label}</p>
                    <p className="text-[14px] font-black text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Save CTA (bottom duplicate for convenience) */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-brand text-black text-[14px] font-black transition-all hover:bg-brand-hover active:scale-[0.98] disabled:opacity-60 shadow-[0_0_30px_rgba(0,229,143,0.25)] mt-auto"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {saving ? "Saving…" : "Save & Return"}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
