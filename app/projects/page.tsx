"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getProjectsData } from "@/lib/queries";
import ProjectsContent from "@/components/projects/ProjectsContent";
import { Loader2 } from "lucide-react";

function ProjectsInner() {
  const searchParams = useSearchParams();
  const videoId = searchParams.get("videoId") ?? undefined;

  const { data: clips = [], isLoading } = useQuery({
    queryKey: ["projectsData", videoId],
    queryFn: () => getProjectsData(videoId),
    // Refetch every 10s if we have a videoId — clips may still be generating
    refetchInterval: videoId ? 10_000 : false,
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-[#050505]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-brand animate-spin" />
          <p className="text-[#5A6F65] text-sm font-medium">Loading clips…</p>
        </div>
      </div>
    );
  }

  return <ProjectsContent clips={clips} />;
}

export default function ProjectsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center min-h-screen bg-[#050505]">
          <Loader2 className="w-10 h-10 text-brand animate-spin" />
        </div>
      }
    >
      <ProjectsInner />
    </Suspense>
  );
}
