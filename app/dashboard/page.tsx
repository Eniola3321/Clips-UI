"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import DashboardContent from "@/components/dashboard/DashboardContent";
import apiClient from "@/lib/apiClient";

async function getDashboardData() {
  const [videosRes, platformsRes] = await Promise.all([
    apiClient.get("/videos?page=1&limit=6"),
    apiClient.get("/platforms"),
  ]);

  console.log("[DashboardPage] /videos response:", videosRes.data);
  console.log("[DashboardPage] /platforms response:", platformsRes.data);

  const videos = videosRes.data.data || (Array.isArray(videosRes.data) ? videosRes.data : []);
  const totalClips = videos.reduce((acc: number, v: any) => acc + (v.clipsCount || 0), 0);

  return {
    stats: {
      earnings: "—",
      clips: totalClips.toString(),
      platforms: String(platformsRes.data.accountCount || 0),
    },
    projects: videos.map((video: any) => ({
      id: video.id,
      title: video.title || "Untitled Video",
      clipsCount: video.clipsCount || 0,
      status: video.status || "completed",
      thumbnail: video.thumbnail || null,
    })),
    totalVideos: videosRes.data.total || videos.length,
  };
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboardData"],
    queryFn: getDashboardData,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen bg-[#050505]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-brand animate-spin" />
          <p className="text-[#5A6F65] text-sm font-medium">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const fallbackData = {
    stats: { earnings: "—", clips: "0", platforms: "0" },
    projects: [],
    totalVideos: 0,
  };

  return <DashboardContent stats={data?.stats || fallbackData.stats} projects={data?.projects || fallbackData.projects} />;
}
