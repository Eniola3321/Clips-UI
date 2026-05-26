import apiClient from "./apiClient";

export const getDashboardData = async () => {
  try {
    const [videosRes, platformsRes] = await Promise.all([
      apiClient.get('/videos?limit=10'),
      apiClient.get('/platforms')
    ]);

    const videos = videosRes.data.items || (Array.isArray(videosRes.data) ? videosRes.data : []);
    const connectedPlatforms = platformsRes.data.accountCount || 0;
    
    // Count total clips across all videos
    const totalClips = videos.reduce((acc: number, video: any) => acc + (video.clipsCount || 0), 0);

    return {
      stats: {
        clips: totalClips.toString(),
        platforms: connectedPlatforms.toString(),
      },
      projects: videos.slice(0, 3).map((video: any) => ({
        id: video.id,
        title: video.title || "Untitled Video",
        clipsCount: video.clipsCount || 0,
        status: video.status || "completed",
        thumbnail: video.thumbnail || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=400&h=400"
      })),
      totalVideos: videosRes.data.total || videos.length
    };
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    throw error;
  }
};

export const getVideos = async (page = 1, limit = 10) => {
  const response = await apiClient.get(`/videos?page=${page}&limit=${limit}`);
  return response.data;
};

export const getProjectsData = async (videoId?: string, page = 1, limit = 20) => {
  try {
    const endpoint = videoId 
      ? `/videos/${videoId}/clips?page=${page}&limit=${limit}` 
      : `/clips?page=${page}&limit=${limit}`;
      
    const response = await apiClient.get(endpoint);
    const clips = response.data.items || (Array.isArray(response.data) ? response.data : []);

    return clips.map((clip: any) => ({
      id: clip.id,
      title: clip.title || `Clip #${clip.id.slice(0, 4)}`,
      thumbnail: clip.thumbnail || "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=800",
      score: clip.score || 0,
      scoreKey: (clip.score || 0) > 80 ? "high" : (clip.score || 0) > 50 ? "medium" : "low",
      duration: clip.duration || "00:00",
      style: clip.style || "Default"
    }));
  } catch (error) {
    console.error("Failed to fetch projects data:", error);
    throw error;
  }
};

export const deleteClip = async (id: string) => {
  await apiClient.delete(`/clips/${id}`);
};

export const updateClip = async (id: string, data: any) => {
  const response = await apiClient.patch(`/clips/${id}`, data);
  return response.data;
};
