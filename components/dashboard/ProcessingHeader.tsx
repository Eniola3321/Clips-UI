"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";
import Logo from "@/components/shared/Logo";

export default function ProcessingHeader() {
  const { user } = useAuth();
  
  return (
    <header className="w-full flex items-center justify-between px-6 py-5 bg-transparent border-b border-white/5 relative z-50">
      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <Logo variant="simple" />
        <span className="text-white font-bold text-xl tracking-tight">ClipCash AI</span>
      </div>

      {/* Center: Navigation Links */}
      <nav className="hidden md:flex items-center gap-8">
        <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Dashboard</Link>
        <Link href="/clips" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">My Clips</Link>
        <Link href="#" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Pricing</Link>
        <Link href="#" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Support</Link>
      </nav>


      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        <button className="hidden sm:block px-5 py-2.5 bg-[#00FF85] hover:bg-[#00E676] text-black font-bold text-sm rounded-full transition-all shadow-[0_0_20px_rgba(0,255,133,0.25)] hover:shadow-[0_0_30px_rgba(0,255,133,0.4)] hover:-translate-y-0.5 active:translate-y-0">
          Upgrade Plan
        </button>
        <div className="w-10 h-10 rounded-full border border-white/10 bg-zinc-800 flex items-center justify-center overflow-hidden relative">
          <Image 
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.profile?.username || "default"}`} 
            alt="User Avatar" 
            fill
            sizes="40px"
            className="object-cover"
          />
        </div>
      </div>
    </header>
  );
}
