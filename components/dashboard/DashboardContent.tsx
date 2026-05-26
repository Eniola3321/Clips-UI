"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDashboardData, getVideos } from "@/lib/queries";
import DashboardLayout from "@/components/shared/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import PlatformDistribution from "@/components/dashboard/PlatformDistribution";
import AIInsightCard from "@/components/dashboard/AIInsightCard";
import ProjectCard from "@/components/dashboard/ProjectCard";
import { Video, Globe, ChevronDown, Loader2 } from "lucide-react";

interface DashboardContentProps {
  stats: {
    earnings: string;
    clips: string;
    platforms: string;
  };
  projects: any[];
}

export default function DashboardContent({ stats: initialStats, projects: initialProjects }: DashboardContentProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allProjects, setAllProjects] = useState(initialProjects);

  const { data } = useQuery({
    queryKey: ["dashboardData"],
    queryFn: getDashboardData,
    initialData: { stats: initialStats, projects: initialProjects, totalVideos: initialProjects.length },
  });

  const { stats } = data;
  const hasMore = allProjects.length < (data.totalVideos || 0);

  const handleLoadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await getVideos(nextPage);
      const newItems = response.items || response;
      setAllProjects(prev => [...prev, ...newItems]);
      setPage(nextPage);
    } catch (error) {
      console.error("Failed to load more projects:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 lg:px-10 py-8 space-y-10 max-w-[1400px] mx-auto w-full">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard 
            label="Clips Posted" 
            value={stats.clips} 
            trend="+8.2%" 
            icon={Video} 
          />
          <StatCard 
            label="Active Platforms" 
            value={stats.platforms} 
            trend="Steady" 
            icon={Globe} 
          />
        </div>

        {/* Middle Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2">
            <PlatformDistribution />
          </div>
          <div>
            <AIInsightCard />
          </div>
        </div>

        {/* Bottom Section: Recent Projects */}
        <div className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[20px] font-extrabold text-white tracking-tight">Recent Projects</h3>
            <div className="text-[13px] text-[#5A6F65] font-medium">
              Showing {allProjects.length} of {data.totalVideos || allProjects.length}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-2">
            {allProjects.map((project: any, index: number) => (
              <ProjectCard 
                key={project.id || index}
                title={project.title}
                clipsCount={project.clipsCount}
                status={project.status}
                thumbnail={project.thumbnail}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-8">
              <button 
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-8 py-3 bg-[#131A17] border border-[#1E2A24] text-white rounded-xl font-bold hover:bg-[#1A221E] transition-all disabled:opacity-50"
              >
                {loadingMore ? (
                  <Loader2 className="w-5 h-5 animate-spin text-brand" />
                ) : (
                  <>
                    Load More Projects
                    <ChevronDown className="w-5 h-5 text-brand" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
