"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Play,
  Download,
  Edit,
  Check,
  Trash2,
  Loader2,
  X,
  Volume2,
  VolumeX,
  Pause,
  Save,
} from "lucide-react";
import { updateClip } from "@/lib/queries";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClipCardProps {
  id: string;
  title: string;
  thumbnail: string | null;
  clipUrl: string | null;
  score: number;
  scoreKey: string;
  duration: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
  onUpdate?: (id: string, updated: Partial<ClipEditFields>) => void;
}

interface ClipEditFields {
  title: string;
  caption: string;
  platform: string;
  audioOverlayUrl: string;
}

// ─── Video Preview Modal ──────────────────────────────────────────────────────

function VideoModal({
  clipUrl,
  title,
  onClose,
}: {
  clipUrl: string;
  title: string;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    videoRef.current?.play().then(() => setPlaying(true)).catch(() => {});
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else { videoRef.current.play(); setPlaying(true); }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const { currentTime, duration } = videoRef.current;
    setProgress(duration ? (currentTime / duration) * 100 : 0);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    videoRef.current.currentTime =
      ((e.clientX - rect.left) / rect.width) * videoRef.current.duration;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-auto max-w-[90vw] max-h-[90vh] bg-[#0B100E] rounded-[24px] overflow-hidden border border-white/10 shadow-[0_0_80px_rgba(0,229,143,0.1)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative bg-black flex-1 flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            src={clipUrl}
            className="max-w-full max-h-[70vh] object-contain"
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setPlaying(false)}
            muted={muted}
            playsInline
          />
          <div className="absolute inset-0 flex items-center justify-center cursor-pointer" onClick={togglePlay}>
            {!playing && (
              <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-xl">
                <Play className="w-6 h-6 text-white fill-white ml-1" />
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-3 space-y-3">
          <p className="text-white font-bold text-[14px] truncate">{title}</p>
          <div className="h-1.5 bg-white/10 rounded-full cursor-pointer overflow-hidden" onClick={handleSeek}>
            <div className="h-full bg-brand rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-brand flex items-center justify-center text-black hover:bg-brand-hover transition-colors"
            >
              {playing ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black ml-0.5" />}
            </button>
            <button
              onClick={() => { if (videoRef.current) { videoRef.current.muted = !muted; setMuted(!muted); } }}
              className="text-[#5A6F65] hover:text-white transition-colors"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

const PLATFORMS = ["tiktok", "instagram", "youtube", "facebook", "x", "pinterest"];

function EditModal({
  clip,
  onClose,
  onSaved,
}: {
  clip: { id: string; title: string; clipUrl: string | null };
  onClose: () => void;
  onSaved: (updated: Partial<ClipEditFields>) => void;
}) {
  const [form, setForm] = useState<ClipEditFields>({
    title: clip.title,
    caption: "",
    platform: "tiktok",
    audioOverlayUrl: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, string> = {};
      if (form.title.trim()) payload.title = form.title.trim();
      if (form.caption.trim()) payload.caption = form.caption.trim();
      if (form.platform) payload.platform = form.platform;
      if (form.audioOverlayUrl.trim()) payload.audioOverlayUrl = form.audioOverlayUrl.trim();

      await updateClip(clip.id, payload);
      onSaved(payload);
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to save changes.";
      setError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#0E1512] border border-[#1E2A24] rounded-[24px] p-7 shadow-[0_0_80px_rgba(0,229,143,0.08)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[20px] font-bold text-white tracking-tight">Edit Clip</h2>
            <p className="text-[12px] text-[#5A6F65] mt-0.5">Update title, caption, platform or audio</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#5A6F65] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-[12px] font-bold text-[#5A6F65] uppercase tracking-wider mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Clip title"
              className="w-full bg-[#080C0B] border border-white/5 focus:border-brand/40 rounded-xl px-4 py-3 text-white text-[14px] outline-none transition-colors placeholder-[#3A4A43]"
            />
          </div>

          {/* Caption */}
          <div>
            <label className="block text-[12px] font-bold text-[#5A6F65] uppercase tracking-wider mb-1.5">
              Caption
            </label>
            <textarea
              value={form.caption}
              onChange={(e) => setForm({ ...form, caption: e.target.value })}
              placeholder="Add a caption or hashtags… #viral #fyp"
              rows={3}
              className="w-full bg-[#080C0B] border border-white/5 focus:border-brand/40 rounded-xl px-4 py-3 text-white text-[14px] outline-none transition-colors placeholder-[#3A4A43] resize-none"
            />
          </div>

          {/* Platform */}
          <div>
            <label className="block text-[12px] font-bold text-[#5A6F65] uppercase tracking-wider mb-1.5">
              Target Platform
            </label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm({ ...form, platform: p })}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-bold capitalize transition-all border ${
                    form.platform === p
                      ? "bg-brand/10 border-brand text-brand"
                      : "bg-white/[0.02] border-white/5 text-[#5A6F65] hover:text-white hover:border-white/10"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Audio overlay */}
          <div>
            <label className="block text-[12px] font-bold text-[#5A6F65] uppercase tracking-wider mb-1.5">
              Audio Overlay URL <span className="text-[#3A4A43] normal-case font-normal">(optional)</span>
            </label>
            <input
              type="url"
              value={form.audioOverlayUrl}
              onChange={(e) => setForm({ ...form, audioOverlayUrl: e.target.value })}
              placeholder="https://example.com/viral-sound.mp3"
              className="w-full bg-[#080C0B] border border-white/5 focus:border-brand/40 rounded-xl px-4 py-3 text-white text-[14px] outline-none transition-colors placeholder-[#3A4A43]"
            />
          </div>

          {error && (
            <p className="text-red-400 text-[13px]">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-white/10 text-[#5A6F65] hover:text-white text-[14px] font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-brand hover:bg-brand-hover text-black text-[14px] font-black flex items-center justify-center gap-2 transition-all disabled:opacity-70"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <><Save className="w-4 h-4" /> Save Changes</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── ClipCard ─────────────────────────────────────────────────────────────────

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800";

export default function ClipCard({
  id,
  title: initialTitle,
  thumbnail,
  clipUrl,
  score,
  scoreKey,
  duration,
  isSelected,
  onSelect,
  onDelete,
  onUpdate,
}: ClipCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imgSrc, setImgSrc] = useState(thumbnail || FALLBACK_IMG);
  const [showPreview, setShowPreview] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const isHighScore = scoreKey === "high";

  useEffect(() => { setImgSrc(thumbnail || FALLBACK_IMG); }, [thumbnail]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDelete) return;
    setIsDeleting(true);
    try { await onDelete(id); } catch { /* parent handles */ } finally { setIsDeleting(false); }
  };

  const openPreview = (e: React.MouseEvent) => { e.stopPropagation(); if (clipUrl) setShowPreview(true); };
  const openEdit = (e: React.MouseEvent) => { e.stopPropagation(); setShowEdit(true); };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!clipUrl) return;
    const a = document.createElement("a");
    a.href = clipUrl;
    a.download = `${title}.mp4`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  };

  const handleSaved = (updated: Partial<ClipEditFields>) => {
    if (updated.title) setTitle(updated.title);
    onUpdate?.(id, updated);
  };

  return (
    <>
      {showPreview && clipUrl && (
        <VideoModal clipUrl={clipUrl} title={title} onClose={() => setShowPreview(false)} />
      )}
      {showEdit && (
        <EditModal
          clip={{ id, title, clipUrl }}
          onClose={() => setShowEdit(false)}
          onSaved={handleSaved}
        />
      )}

      <div
        className={`group relative bg-[#0B100E] border rounded-[24px] overflow-hidden transition-all duration-500 ${
          isSelected
            ? "border-brand ring-1 ring-brand/20 shadow-[0_0_50px_rgba(0,229,143,0.15)]"
            : "border-white/5 hover:border-white/20"
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden">
          <Image
            src={imgSrc}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            className="object-cover"
            onError={() => setImgSrc(FALLBACK_IMG)}
          />

          {/* Selection checkbox */}
          <div
            onClick={(e) => { e.stopPropagation(); onSelect(id); }}
            className={`absolute top-3 left-3 w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer z-20 ${
              isSelected
                ? "bg-brand border-brand shadow-[0_0_15px_rgba(0,229,143,0.4)]"
                : "bg-black/40 border-white/20 hover:border-white/40 backdrop-blur-md"
            }`}
          >
            {isSelected && <Check className="w-3 h-3 text-black stroke-[4px]" />}
          </div>

          {/* Score badge */}
          <div className={`absolute top-3 right-3 px-2 py-1 rounded-md backdrop-blur-md border z-20 ${
            isHighScore
              ? "bg-[#00E58F] border-brand text-black shadow-[0_0_20px_rgba(0,229,143,0.4)]"
              : "bg-orange-500 border-orange-500 text-white"
          }`}>
            <span className="text-[9px] font-black tracking-widest leading-none">{score} SCORE</span>
          </div>

          {/* Play overlay */}
          <div
            onClick={openPreview}
            className={`absolute inset-0 flex items-center justify-center transition-all duration-300 z-10 ${
              isHovered && clipUrl
                ? "opacity-100 bg-black/40 backdrop-blur-[2px] cursor-pointer"
                : "opacity-0"
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-xl">
              <Play className="w-4 h-4 text-white fill-white ml-1" />
            </div>
          </div>

          {/* Duration */}
          <div className="absolute bottom-2.5 right-3 px-1.5 py-0.5 rounded-md bg-black/80 text-[9px] font-black text-white z-20">
            {duration}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <h4 className="text-[13px] font-bold text-white truncate tracking-tight leading-tight">{title}</h4>
            <p className="text-[10px] font-medium text-[#5A6F65]">Perfect for TikTok & Reels</p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={openEdit}
                className="text-[#5A6F65] hover:text-brand transition-colors"
                title="Edit clip"
              >
                <Edit className="w-3 h-3" />
              </button>
              <button
                onClick={handleDownload}
                disabled={!clipUrl}
                className="text-[#5A6F65] hover:text-white transition-colors disabled:opacity-30"
                title={clipUrl ? "Download" : "No download available"}
              >
                <Download className="w-3 h-3" />
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-[#5A6F65] hover:text-red-500 transition-colors disabled:opacity-50"
                title="Delete"
              >
                {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              </button>
            </div>

            <button
              onClick={openPreview}
              disabled={!clipUrl}
              className="text-[10px] font-black text-brand uppercase tracking-widest flex items-center gap-1 hover:underline disabled:opacity-30 disabled:no-underline"
              title={clipUrl ? "Preview clip" : "No preview available"}
            >
              PREVIEW <span className="text-[12px] leading-none mb-0.5">›</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
