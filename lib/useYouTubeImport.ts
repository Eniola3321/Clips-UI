"use client";

import { useState, useCallback } from "react";
import apiClient from "@/lib/apiClient";
import { saveActiveJob } from "@/lib/processingStore";

// ─── Types ────────────────────────────────────────────────────────────────────

export type YouTubeImportPhase =
  | "idle"
  | "fetching-info"     // GET /videos/youtube-info/:videoId
  | "downloading"       // streaming from /api/youtube-dl
  | "uploading"         // POST /videos (multipart)
  | "done"
  | "error";

export interface YouTubeImportState {
  phase:           YouTubeImportPhase;
  /** 0–100 during "downloading" and "uploading" phases */
  progress:        number;
  /** Human-readable label for the current phase */
  label:           string;
  /** Set when phase === "error" */
  error:           string | null;
  /** Video title returned by the info endpoint */
  videoTitle:      string | null;
  /** Warning from backend (e.g. "video is close to 20-minute limit") */
  warning:         string | null;
  /** videoId returned by POST /videos — available when phase === "done" */
  videoId:         string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract the 11-character YouTube video ID from any supported URL format:
 *   https://www.youtube.com/watch?v=dQw4w9WgXcQ
 *   https://youtu.be/dQw4w9WgXcQ
 *   https://youtube.com/shorts/dQw4w9WgXcQ
 *   https://youtube.com/embed/dQw4w9WgXcQ
 */
export function extractYouTubeId(url: string): string | null {
  try {
    const { hostname, pathname, searchParams } = new URL(url);
    const host = hostname.replace("www.", "");

    if (host === "youtu.be") {
      // youtu.be/<id>
      const id = pathname.slice(1).split("?")[0];
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    if (host === "youtube.com") {
      // /watch?v=<id>
      const v = searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

      // /shorts/<id>  or  /embed/<id>  or  /v/<id>
      const match = pathname.match(
        /\/(?:shorts|embed|v)\/([a-zA-Z0-9_-]{11})/
      );
      if (match) return match[1];
    }
  } catch {
    // invalid URL
  }
  return null;
}

/** Returns true for any YouTube hostname */
export function isYouTubeUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace("www.", "");
    return host === "youtube.com" || host === "youtu.be";
  } catch {
    return false;
  }
}

/**
 * Download the video via our server-side /api/youtube-dl proxy using
 * XMLHttpRequest so we get granular onprogress events.
 * Returns a File object ready to hand to FormData.
 */
function downloadViaProxy(
  downloadUrl: string,
  filename: string,
  onProgress: (pct: number) => void
): Promise<File> {
  return new Promise((resolve, reject) => {
    const proxied =
      "/api/youtube-dl?url=" + encodeURIComponent(downloadUrl);

    const xhr = new XMLHttpRequest();
    xhr.open("GET", proxied, true);
    xhr.responseType = "blob";

    xhr.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      } else {
        // No Content-Length — pulse at an indeterminate value
        onProgress(-1);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const blob = xhr.response as Blob;
        resolve(new File([blob], `${filename}.mp4`, { type: "video/mp4" }));
      } else {
        reject(new Error(`Download failed — server returned ${xhr.status}.`));
      }
    };

    xhr.onerror  = () => reject(new Error("Network error while downloading video."));
    xhr.onabort  = () => reject(new Error("Download was cancelled."));
    xhr.send();
  });
}

/**
 * Upload the file to POST /videos using XMLHttpRequest for upload progress.
 * Returns the videoId string on success.
 */
function uploadToBackend(
  file: File,
  title: string,
  onProgress: (pct: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file",       file);
    formData.append("title",      title);
    formData.append("sourceType", "youtube");
    formData.append("style",      "viral");
    // targetPlatforms is NOT accepted by POST /videos — omitted intentionally

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/proxy/videos", true);
    xhr.withCredentials = true; // send session cookies

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          const id =
            data?.video?.id ??
            data?.id         ??
            data?.data?.id   ??
            data?.videoId    ??
            null;
          if (!id) {
            reject(new Error("Upload succeeded but no video ID was returned."));
          } else {
            resolve(String(id));
          }
        } catch {
          reject(new Error("Could not parse upload response."));
        }
      } else {
        // Try to extract a message from the error body
        let msg = `Upload failed (${xhr.status}).`;
        try {
          const body = JSON.parse(xhr.responseText);
          const raw  = body?.message;
          msg        = Array.isArray(raw) ? raw[0] : raw ?? msg;
        } catch { /* keep default message */ }
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => reject(new Error("Network error while uploading video."));
    xhr.onabort = () => reject(new Error("Upload was cancelled."));
    xhr.send(formData);
  });
}

// ─── Phase labels ─────────────────────────────────────────────────────────────

function labelFor(phase: YouTubeImportPhase, progress: number): string {
  switch (phase) {
    case "fetching-info":  return "Fetching video info…";
    case "downloading":
      return progress >= 0
        ? `Downloading from YouTube… ${progress}%`
        : "Downloading from YouTube…";
    case "uploading":
      return `Uploading to ClipsCash… ${progress}%`;
    case "done":           return "Upload complete!";
    case "error":          return "Import failed";
    default:               return "";
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const INITIAL: YouTubeImportState = {
  phase:      "idle",
  progress:   0,
  label:      "",
  error:      null,
  videoTitle: null,
  warning:    null,
  videoId:    null,
};

/**
 * useYouTubeImport
 *
 * Encapsulates the full 5-step YouTube → ClipsCash import pipeline:
 *   1. Extract video ID from URL
 *   2. GET /videos/youtube-info/:videoId  (JWT-protected, rate-limited)
 *   3. Download via /api/youtube-dl proxy (server-side, avoids CORS)
 *   4. POST /videos                       (existing upload endpoint)
 *   5. saveActiveJob + return videoId     (navigate to /processing)
 *
 * Usage:
 *   const { state, run, reset } = useYouTubeImport();
 *   await run(youtubeUrl, "tiktok");
 *   if (state.videoId) router.push(`/dashboard/processing?videoId=${state.videoId}`);
 */
export function useYouTubeImport() {
  const [state, setState] = useState<YouTubeImportState>(INITIAL);

  const set = useCallback(
    (patch: Partial<YouTubeImportState>) =>
      setState((prev) => ({ ...prev, ...patch })),
    []
  );

  const reset = useCallback(() => setState(INITIAL), []);

  const run = useCallback(
    async (url: string, targetPlatform: string): Promise<string | null> => {
      // ── Step 1: extract video ID ───────────────────────────────────────────
      const videoId = extractYouTubeId(url);
      if (!videoId) {
        set({
          phase: "error",
          label: "Import failed",
          error: "Could not extract a YouTube video ID from that URL.",
        });
        return null;
      }

      try {
        // ── Step 2: fetch metadata from our backend ────────────────────────
        set({ phase: "fetching-info", progress: 0, error: null,
              label: labelFor("fetching-info", 0) });

        const infoRes = await apiClient.get(
          `/videos/youtube-info/${videoId}`
        );
        const {
          downloadUrl,
          title       = `YouTube video ${videoId}`,
          warning     = null,
        } = infoRes.data as {
          downloadUrl: string;
          title?:      string;
          durationSeconds?: number;
          warning?:    string;
        };

        if (!downloadUrl) {
          throw new Error("Backend did not return a download URL.");
        }

        set({ videoTitle: title, warning });

        // ── Step 3: download via /api/youtube-dl proxy ─────────────────────
        set({ phase: "downloading", progress: 0,
              label: labelFor("downloading", 0) });

        const file = await downloadViaProxy(
          downloadUrl,
          title,
          (pct) => set({ progress: pct, label: labelFor("downloading", pct) })
        );

        // ── Step 4: upload to /videos ──────────────────────────────────────
        set({ phase: "uploading", progress: 0,
              label: labelFor("uploading", 0) });

        const newVideoId = await uploadToBackend(
          file,
          title,
          (pct) => set({ progress: pct, label: labelFor("uploading", pct) })
        );

        // ── Step 5: persist job + signal done ─────────────────────────────
        saveActiveJob(newVideoId);
        set({ phase: "done", progress: 100,
              label: labelFor("done", 100), videoId: newVideoId });

        return newVideoId;
      } catch (err: any) {
        const raw: string =
          err?.response?.data?.message ??
          err?.message                 ??
          "Import failed. Please try again.";

        const msg = Array.isArray(raw) ? raw[0] : raw;

        // Map known backend errors to friendly messages
        let friendly = msg;
        if (err?.response?.status === 401) {
          friendly = "Session expired — please log in and try again.";
        } else if (err?.response?.status === 429) {
          friendly = "Too many requests — please wait a moment and try again.";
        } else if (msg.toLowerCase().includes("20 minute")) {
          friendly = "Videos over 20 minutes are not supported. Try a shorter clip.";
        } else if (msg.toLowerCase().includes("invalid video")) {
          friendly = "That video ID is not valid or the video is unavailable.";
        }

        set({ phase: "error", label: "Import failed", error: friendly });
        return null;
      }
    },
    [set]
  );

  return { state, run, reset };
}
