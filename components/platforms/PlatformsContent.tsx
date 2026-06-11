"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/shared/DashboardLayout";
import SectionHeader from "@/components/platforms/SectionHeader";
import PlatformCard from "@/components/platforms/PlatformCard";
import HelpBanner from "@/components/platforms/HelpBanner";
import PlatformsFooter from "@/components/platforms/PlatformsFooter";
import apiClient from "@/lib/apiClient";
import { 
  InstagramIcon, 
  TikTokIcon, 
  YoutubeIcon, 
  TwitterIcon,
} from "@/components/shared/Icons";
import { 
  Search, 
  Bell, 
  Share2, 
  Wallet,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useWallet } from "@/components/WalletProvider";
import WalletButton from "@/components/shared/WalletButton";

export default function PlatformsContent() {
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { address, connect, disconnect, isConnecting } = useWallet();

  useEffect(() => {
    const fetchPlatforms = async () => {
      try {
        const response = await apiClient.get('/platforms');
        setConnectedPlatforms(response.data.platforms || []);
      } catch (error) {
        console.error("Failed to fetch platforms:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlatforms();
  }, []);

  const isConnected = (name: string) => 
    connectedPlatforms.some(p => p.toUpperCase() === name.toUpperCase().replace(' / TWITTER', ''));

  return (
    <DashboardLayout showHeader={false}>
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between py-5 px-4 sm:px-6 lg:px-10 border-b border-white/[0.03] bg-[#050505]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-12"> 
          <nav className="hidden lg:flex items-center gap-8 text-[13px] font-bold uppercase tracking-wider text-[#5A6F65]">
            {["Connections", "Clips"].map((item) => (
              <Link 
                key={item} 
                href={item === "Connections" ? "/platforms" : "/clips"}
                className={`hover:text-white transition-colors relative py-1 ${item === "Connections" ? "text-brand" : "text-[#5A6F65]"}`}
              >
                {item}
                {item === "Connections" && (
                  <div className="absolute -bottom-6 left-0 right-0 h-0.5 bg-brand shadow-[0_0_8px_rgba(0,255,156,0.5)]" />
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="hidden md:flex items-center gap-3 bg-white/[0.02] border border-white/5 px-4 py-2 rounded-full w-56 group focus-within:border-brand/40 transition-all">
            <Search className="w-4 h-4 text-[#3A4A43]" />
            <input 
              type="text" 
              placeholder="Search platforms..." 
              className="bg-transparent border-none outline-none text-[12px] w-full text-white placeholder-[#3A4A43]"
            />
          </div>
          
          <button className="relative p-2.5 rounded-full bg-white/[0.02] border border-white/5 text-[#5A6F65] hover:text-white transition-all">
            <Bell className="w-5 h-5" />
            <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-brand rounded-full border-2 border-[#050505]" />
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-10 py-12 space-y-16 max-w-[1400px] mx-auto w-full">
        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-[44px] sm:text-[56px] font-black tracking-tight text-white leading-tight">
            Connect <span className="text-brand">Accounts</span>
          </h1>
          <p className="text-[#5A6F65] text-[16px] sm:text-[18px] max-w-2xl font-medium leading-relaxed">Link your social media and Web3 wallets to start generating AI-powered clips and earning rewards automatically.</p>
        </div>

        {/* Social Platforms */}
        <section>
          <SectionHeader 
            title="Social Platforms" 
            icon={Share2} 
            label={`${connectedPlatforms.length} CONNECTED`} 
          />
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 text-brand animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <PlatformCard 
                name="TikTok" 
                description="Manage your main TikTok video feed"
                icon={TikTokIcon} 
                status={isConnected("TikTok") ? "ACTIVE" : "NOT LINKED"} 
                ctaText={isConnected("TikTok") ? "Manage" : "Connect Account"}
                variant="vertical"
              />
              <PlatformCard 
                name="Instagram" 
                description="Connect to sync Reels"
                icon={InstagramIcon} 
                status={isConnected("Instagram") ? "ACTIVE" : "NOT LINKED"} 
                ctaText={isConnected("Instagram") ? "Manage" : "Connect Account"}
                variant="vertical"
              />
              <PlatformCard 
                name="YouTube" 
                description="Import and sync your long-form YouTube content"
                icon={YoutubeIcon} 
                status={isConnected("YouTube") ? "ACTIVE" : "NOT LINKED"} 
                ctaText={isConnected("YouTube") ? "Manage" : "Connect Account"}
                variant="vertical"
              />
              <PlatformCard 
                name="X / Twitter" 
                description="Auto-post clips to X"
                icon={TwitterIcon} 
                status={isConnected("X") ? "ACTIVE" : "NOT LINKED"} 
                ctaText={isConnected("X") ? "Manage" : "Connect Account"}
                variant="vertical"
              />
            </div>
          )}
        </section>

        {/* Web3 Wallets */}
        <section>
          <SectionHeader 
            title="Web3 Wallets" 
            icon={Wallet} 
            label={address ? "1 CONNECTED" : "REWARDS DESTINATION"}
          />
          <div className="bg-[#111111]/40 backdrop-blur-md border border-white/[0.03] rounded-[24px] p-6 flex items-center justify-between group hover:border-brand/20 transition-all duration-300 relative overflow-hidden">
            {/* subtle glow when connected */}
            {address && (
              <div className="absolute inset-0 bg-brand/[0.03] pointer-events-none" />
            )}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-brand" />
              </div>
              <div>
                <p className="font-bold text-white text-[15px]">Stellar Wallet</p>
                {address ? (
                  <p className="text-xs text-brand font-mono mt-0.5">
                    {address.slice(0, 8)}…{address.slice(-6)}
                  </p>
                ) : (
                  <p className="text-xs text-[#5A6F65] mt-0.5">Freighter · xBull · Lobstr · Albedo</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {address ? (
                <>
                  <div className="flex items-center gap-1.5 text-brand text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    CONNECTED
                  </div>
                  <button
                    onClick={disconnect}
                    className="text-xs text-[#5A6F65] hover:text-red-400 transition-colors font-medium border border-white/5 hover:border-red-400/30 px-3 py-1.5 rounded-xl"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <WalletButton className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand/10 border border-brand/20 text-brand hover:bg-brand/20 transition-all font-bold text-sm disabled:opacity-60" />
              )}
            </div>
          </div>
        </section>

        {/* Help Banner */}
        <HelpBanner />

        {/* Footer */}
        <PlatformsFooter />
      </div>
    </DashboardLayout>
  );
}
