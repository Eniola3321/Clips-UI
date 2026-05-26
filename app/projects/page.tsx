import React from "react";
import ProjectsContent from "@/components/projects/ProjectsContent";

async function getProjectsData() {
  // Mock data for now, would be an API call in production
  return [
    { id: "1", title: "Clip #01 - The Big Reveal Hook", thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=800", score: 94, scoreKey: "high", duration: "00:45", style: "Bold & Dynamic" },
    { id: "2", title: "Clip #02 - Technical Deep Dive", thumbnail: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&q=80&w=800", score: 68, scoreKey: "medium", duration: "00:58", style: "Minimalist" },
    { id: "3", title: "Clip #03 - Audience Reaction", thumbnail: "https://images.unsplash.com/photo-1492619334760-227b9a528218?auto=format&fit=crop&q=80&w=800", score: 82, scoreKey: "high", duration: "00:32", style: "Emoji-Rich" },
    { id: "4", title: "Clip #04 - Feature Walkthrough", thumbnail: "https://images.unsplash.com/photo-1587620962725-abab7fe55159?auto=format&fit=crop&q=80&w=800", score: 91, scoreKey: "high", duration: "00:52", style: "Subtitles Only" },
    { id: "5", title: "Clip #05 - Closing Remarks", thumbnail: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&q=80&w=800", score: 42, scoreKey: "low", duration: "01:12", style: "Minimalist" },
    { id: "6", title: "Clip #06 - Product Detail B-Roll", thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800", score: 89, scoreKey: "high", duration: "00:44", style: "Bold & Dynamic" },
  ];
}

export default async function ProjectsPage() {
  const clips = await getProjectsData();

  return <ProjectsContent clips={clips} />;
}
