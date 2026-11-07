"use client";

import React from "react";
import { Tv, Plus } from "lucide-react";
import { MediaQueueItem } from "@/types";
import { MediaPlayer } from "./media-player";

interface MediaStageProps {
  currentItem: MediaQueueItem | null;
  isPlaying: boolean;
  currentTime: number;
  isHost: boolean;
  canAddMedia?: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onEnded: () => void;
  onOpenAddMedia: () => void;
  onTimeUpdate?: (time: number) => void;
}

export function MediaStage({
  currentItem,
  isPlaying,
  currentTime,
  isHost,
  canAddMedia = true,
  onPlay,
  onPause,
  onSeek,
  onEnded,
  onOpenAddMedia,
  onTimeUpdate,
}: MediaStageProps) {
  if (!currentItem) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-center p-6">
        <div className="p-5 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a]">
          <Tv className="w-10 h-10 text-gray-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-300">No media playing</p>
          <p className="text-xs text-gray-600 mt-1">
            {isHost ? "Add a YouTube video or media URL to start watching together" : "Ask the host to add media"}
          </p>
        </div>
        {canAddMedia && (
          <button
            onClick={onOpenAddMedia}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-[#ceff44] text-black font-bold text-sm shadow-lg shadow-brand/25 transition-all min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            Add to Queue
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <MediaPlayer
        item={currentItem}
        isPlaying={isPlaying}
        currentTime={currentTime}
        isHost={isHost}
        onPlay={onPlay}
        onPause={onPause}
        onSeek={onSeek}
        onEnded={onEnded}
        onTimeUpdate={onTimeUpdate}
      />
    </div>
  );
}
