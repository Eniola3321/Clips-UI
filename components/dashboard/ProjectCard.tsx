"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Play } from "lucide-react";

interface ProjectCardProps {
  title: string;
  clipsCount: number;
  status: "processing" | "completed";
  thumbnail: string;
}

export default function ProjectCard({ title, clipsCount, status, thumbnail }: ProjectCardProps) {
  const [imgSrc, setImgSrc] = useState(thumbnail);

  useEffect(() => {
    setImgSrc(thumbnail);
  }, [thumbnail]);

  return (
    <div className="group bg-[#0B100E] border border-white/5 rounded-[28px] p-5 hover:border-brand/40 transition-all duration-500 hover:shadow-[0_0_40px_rgba(0,229,143,0.05)] cursor-pointer">
      <div className="flex items-center gap-5">
        <div className="w-24 h-24 rounded-[18px] overflow-hidden relative shrink-0">
          <Image 
            src={imgSrc} 
            alt={title} 
            fill 
            sizes="96px" 
            className="object-cover group-hover:scale-110 transition-transform duration-500" 
            onError={() => {
              setImgSrc("https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800");
            }}
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-brand/90 flex items-center justify-center text-black">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>
          </div>
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <h4 className="text-[15px] font-bold text-white truncate group-hover:text-brand transition-colors">
            {title}
          </h4>
          <p className="text-[12px] text-[#5A6F65] font-medium">
            {clipsCount} clips generated
          </p>
          
          <div className="flex">
            <div className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${
              status === "processing" 
                ? "bg-brand/10 text-brand border border-brand/20 shadow-[0_0_10px_rgba(0,229,143,0.15)]" 
                : "bg-white/[0.03] text-[#8e9895] border border-white/5"
            }`}>
              {status}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
