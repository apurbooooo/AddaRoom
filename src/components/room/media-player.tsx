"use client";

import React, { useRef, useEffect } from "react";
import { Play, Pause, SkipForward } from "lucide-react";
import { MediaQueueItem } from "@/types";

interface MediaPlayerProps {
  item: MediaQueueItem;
  isPlaying: boolean;
  currentTime: number;
  isHost: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onEnded: () => void;
  onTimeUpdate?: (time: number) => void;
}

export function MediaPlayer({
  item,
  isPlaying,
  currentTime,
  isHost,
  onPlay,
  onPause,
  onSeek,
  onEnded,
  onTimeUpdate,
}: MediaPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSyncedTime = useRef<number>(0);

  // Sync isPlaying → video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying]);

  // Sync seeked time from host → video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const diff = Math.abs(video.currentTime - currentTime);
    // Only seek if significantly out of sync (> 1 second drift)
    if (diff > 1) {
      video.currentTime = currentTime;
      lastSyncedTime.current = currentTime;
    }
  }, [currentTime]);

  const handleVideoPlay = () => {
    if (isHost) onPlay();
  };

  const handleVideoPause = () => {
    if (isHost) onPause();
  };

  const handleVideoSeeked = () => {
    const video = videoRef.current;
    if (!video || !isHost) return;
    onSeek(video.currentTime);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    onTimeUpdate?.(video.currentTime);
  };

  if (item.type === "youtube") {
    return (
      <div className="relative w-full h-full flex flex-col">
        <iframe
          src={item.src}
          className="w-full flex-1 border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          title={item.title}
        />
        {!isHost && (
          <div className="px-3 py-1.5 bg-black/70 text-xs text-gray-400 text-center">
            Host controls YouTube playback
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        src={item.src}
        className="w-full h-full object-contain"
        controls={isHost}
        playsInline
        onPlay={handleVideoPlay}
        onPause={handleVideoPause}
        onSeeked={handleVideoSeeked}
        onEnded={onEnded}
        onTimeUpdate={handleTimeUpdate}
      />
      {!isHost && (
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-3 pointer-events-none">
          <div className="px-3 py-1.5 rounded-lg bg-black/70 text-xs text-gray-300">
            {isPlaying ? (
              <span className="flex items-center gap-1.5"><Play className="w-3 h-3 text-brand" /> Playing</span>
            ) : (
              <span className="flex items-center gap-1.5"><Pause className="w-3 h-3" /> Paused</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
