"use client";

import React, { useState } from "react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ProjectFilters from "@/components/projects/ProjectFilters";
import ClipGrid from "@/components/projects/ClipGrid";
import SelectionFooter from "@/components/projects/SelectionFooter";

const mockClips = [
  { id: "1", title: "Clip #01 - The Big Reveal Hook", thumbnail: "/projects/thumb1.png", score: 94, scoreKey: "high", duration: "00:45", style: "Bold & Dynamic" },
  { id: "2", title: "Clip #02 - Technical Deep Dive", thumbnail: "/projects/thumb2.png", score: 68, scoreKey: "medium", duration: "00:58", style: "Minimalist" },
  { id: "3", title: "Clip #03 - Audience Reaction", thumbnail: "/projects/thumb3.png", score: 82, scoreKey: "high", duration: "00:32", style: "Emoji-Rich" },
  { id: "4", title: "Clip #04 - Feature Walkthrough", thumbnail: "/projects/thumb1.png", score: 91, scoreKey: "high", duration: "00:52", style: "Subtitles Only" },
  { id: "5", title: "Clip #05 - Closing Remarks", thumbnail: "/projects/thumb2.png", score: 42, scoreKey: "low", duration: "01:12", style: "Minimalist" },
  { id: "6", title: "Clip #06 - Product Detail B-Roll", thumbnail: "/projects/thumb3.png", score: 89, scoreKey: "high", duration: "00:44", style: "Bold & Dynamic" },
];

export default function ProjectsPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [captionsStyle, setCaptionsStyle] = useState("All Styles");
  const [viralityLevels, setViralityLevels] = useState<string[]>(["high", "medium", "low"]);

  // Filtering Logic
  const filteredClips = mockClips.filter(clip => {
    const matchesStyle = captionsStyle === "All Styles" || clip.style === captionsStyle;
    const matchesLevel = viralityLevels.includes(clip.scoreKey);
    return matchesStyle && matchesLevel;
  });

  const activeFilterCount = (captionsStyle !== "All Styles" ? 1 : 0) + (viralityLevels.length < 3 ? 1 : 0);

  const handleViralityToggle = (level: string) => {
    setViralityLevels(prev => 
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  const handleResetFilters = () => {
    setCaptionsStyle("All Styles");
    setViralityLevels(["high", "medium", "low"]);
  };

  const handleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredClips.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredClips.map(c => c.id));
    }
  };

  return (
    <div className="flex h-screen bg-[#050505] text-white font-sans overflow-hidden">
      {/* Background Effects */}
      <div className="fixed top-0 left-0 w-[50vw] h-[50vw] rounded-full bg-brand/5 blur-[120px] pointer-events-none -translate-x-1/4 -translate-y-1/4" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-brand/[0.03] rounded-full blur-[100px] pointer-events-none translate-x-1/3 translate-y-1/3" />

      {/* Single Curation Sidebar */}
      <div className="hidden lg:flex flex-col sticky top-0 h-screen py-10 pl-10 shrink-0">
        <ProjectFilters 
          captionsStyle={captionsStyle}
          onCaptionsStyleChange={setCaptionsStyle}
          viralityLevels={viralityLevels}
          onViralityLevelToggle={handleViralityToggle}
          activeFilterCount={activeFilterCount}
          onResetFilters={handleResetFilters}
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen relative z-10 px-6 sm:px-10 lg:px-16 overflow-hidden">
        <DashboardHeader onMenuClick={() => {}} />

        <div className="flex-1 flex flex-col overflow-hidden w-full max-w-[1400px] mx-auto pt-6">
          {/* Grid Content - now scrollable */}
          <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide pb-10">
            <ClipGrid 
              clips={filteredClips} 
              selectedIds={selectedIds} 
              onSelect={handleSelect} 
              onSelectAll={handleSelectAll}
            />
          </div>
          
          {/* Docked Actions Footer (now truly always visible and grounded) */}
          <SelectionFooter count={selectedIds.length} />
        </div>
      </main>
    </div>
  );
}
