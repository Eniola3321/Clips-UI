"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import ProcessingHeader from "@/components/dashboard/ProcessingHeader";
import { Sparkles, Clock, Zap, RefreshCw, X } from "lucide-react";

export default function ProcessingPage() {
  const [progress, setProgress] = useState(0);
  
  // Animate progress to 87% for realistic feel
  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(87);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans relative overflow-hidden">
      {/* Background Gradients */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-[#00FF85]/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#00FF85]/3 blur-[120px] rounded-full" />
      </div>

      <ProcessingHeader />

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center space-y-6 mb-12">
          {/* Pulsing Sparkle Icon */}
          <div className="relative">
            <div className="absolute inset-0 bg-[#00FF85]/20 blur-2xl rounded-full animate-pulse" />
            <div className="relative w-24 h-24 rounded-full bg-[#101614] border border-[#00FF85]/30 flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,255,133,0.1)]">
              <Sparkles className="w-10 h-10 text-[#00FF85] drop-shadow-[0_0_10px_rgba(0,255,133,0.5)]" />
            </div>
          </div>
          
          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              AI is finding viral moments...
            </h1>
            <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto font-medium">
              Our neural network is analyzing video retention patterns
            </p>
          </div>
        </div>

        {/* Main Processing Card */}
        <div className="w-full max-w-4xl bg-[#0A0F0D] border border-white/5 rounded-[32px] p-8 md:p-10 shadow-2xl relative overflow-hidden group">
          {/* Subtle Glow Edge */}
          <div className="absolute inset-0 border border-[#00FF85]/10 rounded-[32px] pointer-events-none group-hover:border-[#00FF85]/20 transition-colors" />
          
          <div className="space-y-8">
            {/* Header Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-[#111815] border border-white/5 flex items-center justify-center">
                  <RefreshCw className="w-3.5 h-3.5 text-[#00FF85] animate-spin-slow" />
                </div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Processing Stream</span>
              </div>
              <span className="text-3xl font-black text-[#00FF85]">{progress}%</span>
            </div>

            {/* Progress Bar Container */}
            <div className="relative h-4 w-full bg-[#111815] rounded-full overflow-hidden border border-white/5">
              <div 
                className="absolute top-0 left-0 h-full bg-[#00FF85] rounded-full transition-all duration-[2000ms] ease-out shadow-[0_0_20px_rgba(0,255,133,0.4)]"
                style={{ width: `${progress}%` }}
              >
                {/* Glow Overlay on Bar */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>
            </div>

            {/* Info Row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 text-gray-400 text-sm font-medium">
                <Clock className="w-4 h-4" />
                <span>Estimated time remaining: 1 minute 15 seconds</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <div className="w-2 h-2 rounded-full bg-[#00FF85] animate-pulse shadow-[0_0_8px_#00FF85]" />
                <span className="text-gray-300">GPU Accelerated</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-4xl mt-6">
          {/* Card 1 */}
          <div className="bg-[#0A0F0D] border border-white/5 rounded-2xl p-6 flex flex-col items-center text-center space-y-2 group hover:border-[#00FF85]/20 transition-all">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Moments Found</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">12</span>
              <span className="text-[#00FF85] text-sm font-bold flex items-center gap-0.5">
                <span className="text-[10px]">↑</span>5
              </span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-[#0A0F0D] border border-white/5 rounded-2xl p-6 flex flex-col items-center text-center space-y-2 group hover:border-[#00FF85]/20 transition-all">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Input Quality</span>
            <div className="flex flex-col">
              <span className="text-3xl font-extrabold text-white">4K</span>
              <span className="text-gray-500 text-xs font-bold">Ultra HD</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-[#0A0F0D] border border-white/5 rounded-2xl p-6 flex flex-col items-center text-center space-y-2 group hover:border-[#00FF85]/20 transition-all">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">AI Throughput</span>
            <div className="flex flex-col">
              <span className="text-3xl font-extrabold text-white">2.5x</span>
              <span className="text-[#00FF85] text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-1">
                <Zap className="w-3 h-3 fill-current" /> Turbo
              </span>
            </div>
          </div>
        </div>

        {/* Action Area */}
        <div className="mt-12 flex flex-col items-center space-y-4">
          <button className="flex items-center gap-2.5 px-8 py-3.5 rounded-full border border-white/10 bg-[#0A0F0D] hover:bg-[#111815] hover:border-white/20 text-gray-300 font-bold text-sm transition-all active:scale-[0.98]">
            <X className="w-4 h-4" />
            Cancel Processing
          </button>
          <p className="text-gray-500 text-xs text-center max-w-sm leading-relaxed">
            Closing this window won't stop the processing. We'll email you once your clips are ready.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full flex flex-col md:flex-row items-center justify-between px-10 py-8 border-t border-white/5 mt-auto bg-transparent relative z-10 gap-4">
        <p className="text-gray-500 text-xs font-medium">
          © 2024 ClipCash AI. All rights reserved.
        </p>
        <div className="flex items-center gap-8">
          <Link href="/privacy" className="text-gray-500 hover:text-gray-300 text-xs font-medium transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="text-gray-500 hover:text-gray-300 text-xs font-medium transition-colors">Terms of Service</Link>
          <Link href="/status" className="text-gray-500 hover:text-gray-300 text-xs font-medium transition-colors">Status</Link>
        </div>
      </footer>
    </div>
  );
}

