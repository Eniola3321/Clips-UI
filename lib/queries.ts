import apiClient from "./apiClient";

export const getDashboardData = async () => {
  try {
    const [videosRes, platformsRes] = await Promise.all([
      apiClient.get('/videos?page=1&limit=10'),
      apiClient.get('/platforms')
    ]);

    // Backend returns { data: [...], total, page, limit }
    const videos = videosRes.data.data || (Array.isArray(videosRes.data) ? videosRes.data : []);
    const connectedPlatforms = platformsRes.data.accountCount || 0;
    
    // Count total clips across all videos
    const totalClips = videos.reduce((acc: number, video: any) => acc + (video.clipsCount || 0), 0);

    return {
      stats: {
        clips: totalClips.toString(),
        platforms: connectedPlatforms.toString(),
      },
      projects: videos.slice(0, 6).map((video: any) => ({
        id: video.id,
        title: video.title || "Untitled Video",
        clipsCount: video.clipsCount || 0,
        status: video.status || "completed",
        thumbnail: video.thumbnail || null,
      })),
      totalVideos: videosRes.data.total || videos.length,
    };
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    throw error;
  }
};

export const getVideos = async (page = 1, limit = 10) => {
  const response = await apiClient.get(`/videos?page=${page}&limit=${limit}`);
  // Backend returns { data: [...], total, page, limit }
  return {
    items: response.data.data || (Array.isArray(response.data) ? response.data : []),
    total: response.data.total || 0,
  };
};

export const getProjectsData = async (videoId?: string, page = 1, limit = 20) => {
  try {
    const endpoint = videoId 
      ? `/videos/${videoId}/clips?page=${page}&limit=${limit}` 
      : `/clips?page=${page}&limit=${limit}`;
      
    const response = await apiClient.get(endpoint);
    // Backend returns { data: [...], total, page, limit } or plain array
    const clips = response.data.data || (Array.isArray(response.data) ? response.data : []);

    return clips.map((clip: any) => ({
      id: String(clip.id),
      title: clip.title || `Clip #${clip.id}`,
      thumbnail: clip.thumbnail || null,
      score: clip.viralScore ?? clip.score ?? 0,
      scoreKey: (clip.viralScore ?? clip.score ?? 0) >= 80 ? "high" : (clip.viralScore ?? clip.score ?? 0) >= 50 ? "medium" : "low",
      duration: clip.duration ? formatDuration(clip.duration) : "00:00",
      style: clip.platform || clip.style || "General",
      clipUrl: clip.clipUrl || null,
    }));
  } catch (error) {
    console.error("Failed to fetch projects data:", error);
    throw error;
  }
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export const deleteClip = async (id: string) => {
  await apiClient.delete(`/clips/${id}`);
};

export const updateClip = async (id: string, data: any) => {
  const response = await apiClient.patch(`/clips/${id}`, data);
  return response.data;
};
