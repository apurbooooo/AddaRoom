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

function getYouTubeId(src: string): string | null {
  try {
    const url = new URL(src);
    if (url.hostname.includes("youtu.be")) return url.pathname.slice(1).split("/")[0] || null;
    return url.searchParams.get("v") || url.pathname.split("/").pop() || null;
  } catch {
    return null;
  }
}

function YouTubePlayer({ item, isPlaying, currentTime, isHost, onPlay, onPause, onEnded, onTimeUpdate }: MediaPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const suppressEventsRef = useRef(false);
  const lastReportedTimeRef = useRef(0);
  const videoId = getYouTubeId(item.src);

  useEffect(() => {
    if (!videoId || !containerRef.current) return;
    let cancelled = false;
    const start = () => {
      if (cancelled || !containerRef.current || !(window as any).YT?.Player) return;
      playerRef.current?.destroy?.();
      const node = document.createElement("div");
      containerRef.current.replaceChildren(node);
      playerRef.current = new (window as any).YT.Player(node, {
        videoId,
        playerVars: { controls: isHost ? 1 : 0, playsinline: 1, rel: 0, modestbranding: 1, origin: window.location.origin },
        events: {
          onStateChange: (event: any) => {
            if (!isHost || suppressEventsRef.current) return;
            if (event.data === 1) onPlay();
            if (event.data === 2) onPause();
            if (event.data === 0) onEnded();
          },
          onError: () => onPause(),
        },
      });
    };
    if ((window as any).YT?.Player) start();
    else {
      const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!existing) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(script);
      }
      const previous = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => { previous?.(); start(); };
      const timer = window.setInterval(() => { if ((window as any).YT?.Player) { window.clearInterval(timer); start(); } }, 100);
      return () => { cancelled = true; window.clearInterval(timer); playerRef.current?.destroy?.(); };
    }
    return () => { cancelled = true; playerRef.current?.destroy?.(); playerRef.current = null; };
  }, [videoId, isHost, onPlay, onPause, onEnded]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player?.getPlayerState) return;
    suppressEventsRef.current = true;
    if (isPlaying) player.playVideo?.(); else player.pauseVideo?.();
    window.setTimeout(() => { suppressEventsRef.current = false; }, 150);
  }, [isPlaying]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player?.getCurrentTime) return;
    const drift = Math.abs((player.getCurrentTime?.() || 0) - currentTime);
    if (drift > 1.25) {
      suppressEventsRef.current = true;
      player.seekTo?.(currentTime, true);
      window.setTimeout(() => { suppressEventsRef.current = false; }, 150);
    }
  }, [currentTime]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!player?.getCurrentTime) return;
      const time = player.getCurrentTime();
      if (Math.abs(time - lastReportedTimeRef.current) > 0.05) {
        lastReportedTimeRef.current = time;
        onTimeUpdate?.(time);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [onTimeUpdate]);

  if (!videoId) return <div className="grid h-full place-items-center bg-black p-6 text-sm text-rose-300">This YouTube URL could not be embedded.</div>;
  return <div ref={containerRef} className="relative h-full w-full bg-black" aria-label={`${item.title} YouTube player`} />;
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
        <YouTubePlayer {...{ item, isPlaying, currentTime, isHost, onPlay, onPause, onSeek, onEnded, onTimeUpdate }} />
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
