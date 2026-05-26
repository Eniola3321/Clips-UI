import React from "react";
import DashboardContent from "@/components/dashboard/DashboardContent";

// This would be a real server-side fetch in a production app
async function getDashboardData() {
  // Simulate server-side delay
  // await new Promise(resolve => setTimeout(resolve, 100));

  return {
    stats: {
      earnings: "$12,450.80",
      clips: "142",
      platforms: "4",
    },
    projects: [
      {
        title: "Apex Legends Clutch Moments",
        clipsCount: 2,
        status: "processing",
        thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=400&h=400"
      },
      {
        title: "React Native Tutorial 2024",
        clipsCount: 12,
        status: "completed",
        thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&q=80&w=400&h=400"
      },
      {
        title: "Weekly Podcast Highlight #42",
        clipsCount: 5,
        status: "completed",
        thumbnail: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&q=80&w=400&h=400"
      }
    ]
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return <DashboardContent stats={data.stats} projects={data.projects} />;
}
