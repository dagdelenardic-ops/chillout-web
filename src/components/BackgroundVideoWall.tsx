"use client";

import { useEffect, useMemo, useState } from "react";

type VideosResponse = {
  videos?: string[];
};

const FALLBACK_VIDEO = ["/images/chill-hero.mp4"];

export function BackgroundVideoWall() {
  const [videos, setVideos] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadVideos = async () => {
      try {
        const response = await fetch("/api/videos", { cache: "no-store" });
        const payload = (await response.json()) as VideosResponse;
        const videoList = Array.isArray(payload.videos) ? payload.videos : [];

        if (cancelled) {
          return;
        }

        if (videoList.length > 0) {
          setVideos(videoList);
          return;
        }

        setVideos(FALLBACK_VIDEO);
      } catch {
        if (!cancelled) {
          setVideos(FALLBACK_VIDEO);
        }
      }
    };

    void loadVideos();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeVideo = useMemo(() => {
    if (videos.length === 0) {
      return null;
    }

    return videos[activeIndex % videos.length];
  }, [activeIndex, videos]);

  if (!activeVideo) {
    return null;
  }

  return (
    <div className="video-backdrop" aria-hidden="true">
      <video
        key={activeVideo}
        className="video-backdrop-media"
        src={activeVideo}
        autoPlay
        muted
        playsInline
        loop={videos.length === 1}
        preload="metadata"
        onLoadedMetadata={(event) => {
          event.currentTarget.playbackRate = 0.82;
        }}
        onEnded={() => {
          setActiveIndex((prev) => (prev + 1) % videos.length);
        }}
      />
    </div>
  );
}
