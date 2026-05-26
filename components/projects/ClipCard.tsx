"use client";

import  { useState, useEffect } from "react";
import Image from "next/image";
import { 
  Play, 
  Download, 
  Edit, 
  Share2, 
  Check, 
  Trash2,
  Loader2
} from "lucide-react";

interface ClipCardProps {
  id: string;
  title: string;
  thumbnail: string;
  score: number;
  scoreKey: string;
  duration: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
}

export default function ClipCard({ 
  id, 
  title, 
  thumbnail, 
  score, 
  scoreKey, 
  duration, 
  isSelected, 
  onSelect,
  onDelete
}: ClipCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imgSrc, setImgSrc] = useState(thumbnail);
  const isHighScore = scoreKey === "high";

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(id);
    } catch (err) {
      console.error("Failed to delete clip:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Reset imgSrc if thumbnail prop changes
  useEffect(() => {
    setImgSrc(thumbnail);
  }, [thumbnail]);

  return (
    <div 
      className={`group relative bg-[#0B100E] border rounded-[24px] overflow-hidden transition-all duration-500 ${
        isSelected 
          ? "border-brand ring-1 ring-brand/20 shadow-[0_0_50px_rgba(0,229,143,0.15)]" 
          : "border-white/5 hover:border-white/20"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail Area */}
      <div className="relative aspect-video overflow-hidden group/thumb">
        <Image 
          src={imgSrc} 
          alt={title} 
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          className="object-cover"
          onError={() => {
            setImgSrc("https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800");
          }}
        />
        
        {/* Selection Indicator (Top Left) */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            onSelect(id);
          }}
          className={`absolute top-3 left-3 w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer z-20 ${
            isSelected 
              ? "bg-brand border-brand shadow-[0_0_15px_rgba(0,229,143,0.4)]" 
              : "bg-black/40 border-white/20 hover:border-white/40 backdrop-blur-md"
          }`}
        >
          {isSelected && <Check className="w-3 h-3 text-black stroke-[4px]" />}
        </div>

        {/* Score Badge (Top Right) */}
        <div className={`absolute top-3 right-3 px-2 py-1 rounded-md backdrop-blur-md border z-20 transition-all ${
          isHighScore 
            ? "bg-[#00E58F] border-brand text-black shadow-[0_0_20px_rgba(0,229,143,0.4)]" 
            : "bg-orange-500 border-orange-500 text-white"
        }`}>
          <span className="text-[9px] font-black tracking-widest leading-none">{score} SCORE</span>
        </div>

        {/* Play Overlay (Hover) */}
        <div className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center transition-all duration-300 z-10 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}>
          <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-xl">
             <Play className="w-4 h-4 text-white fill-white ml-1" />
          </div>
        </div>

        {/* Duration (Bottom Right) */}
        <div className="absolute bottom-2.5 right-3 px-1.5 py-0.5 rounded-md bg-black/80 text-[9px] font-black text-white z-20">
          {duration}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <h4 className="text-[13px] font-bold text-white truncate tracking-tight leading-tight">
            {title}
          </h4>
          <p className="text-[10px] font-medium text-[#5A6F65]">
            Perfect for TikTok & Reels
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="text-[#5A6F65] hover:text-white transition-colors" title="Edit">
              <Edit className="w-3 h-3" />
            </button>
            <button className="text-[#5A6F65] hover:text-white transition-colors" title="Download">
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
          <button className="text-[10px] font-black text-brand uppercase tracking-widest flex items-center gap-1 hover:underline">
            PREVIEW <span className="text-[12px] leading-none mb-0.5">›</span>
          </button>
        </div>
      </div>
    </div>
  );
}
