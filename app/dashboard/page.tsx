import React from "react";
import DashboardContent from "@/components/dashboard/DashboardContent";
import apiClient from "@/lib/apiClient";

async function getDashboardData() {
  try {
    const [videosRes, platformsRes] = await Promise.all([
      apiClient.get("/videos?page=1&limit=6"),
      apiClient.get("/platforms"),
    ]);

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
  } catch {
    // Return empty state if user is not logged in or API is unreachable
    return {
      stats: { earnings: "—", clips: "0", platforms: "0" },
      projects: [],
      totalVideos: 0,
    };
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  return <DashboardContent stats={data.stats} projects={data.projects} />;
}
