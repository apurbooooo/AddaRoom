"use client";

import React from "react";
import { Youtube, Link, Film, Trash2, Play, Plus } from "lucide-react";
import { MediaQueueItem } from "@/types";

interface MediaQueuePanelProps {
  queue: MediaQueueItem[];
  currentIndex: number;
  isPlaying: boolean;
  isHost: boolean;
  localParticipantId: string;
  onPlayItem: (index: number) => void;
  onRemoveItem: (itemId: string) => void;
  onOpenAddMedia: () => void;
}

function typeIcon(type: MediaQueueItem["type"]) {
  switch (type) {
    case "youtube":
      return <Youtube className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />;
    case "url":
      return <Link className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />;
    case "file":
      return <Film className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />;
  }
}

export function MediaQueuePanel({
  queue,
  currentIndex,
  isPlaying,
  isHost,
  localParticipantId,
  onPlayItem,
  onRemoveItem,
  onOpenAddMedia,
}: MediaQueuePanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-[#1a1a1a] flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
          Media Queue ({queue.length})
        </span>
        {true && (
          <button
            onClick={onOpenAddMedia}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-brand/20 hover:bg-brand/30 text-brand text-xs font-semibold transition-colors min-h-[28px]"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 p-2">
        {queue.length === 0 ? (
          <p className="text-xs text-gray-600 italic p-2 text-center">
            {isHost ? "Add media to start watching together" : "No media in queue"}
          </p>
        ) : (
          queue.map((item, idx) => {
            const isCurrent = idx === currentIndex;
            return (
              <div
                key={item.id}
                className={`flex items-center gap-2 p-2 rounded-xl transition-colors ${
                  isCurrent
                    ? "bg-brand/10 border-l-2 border-brand pl-1.5"
                    : "hover:bg-black/40"
                }`}
              >
                {typeIcon(item.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                  <p className="text-[10px] text-gray-500 truncate">by {item.addedByName}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {(isHost || item.addedBy === localParticipantId) && !isCurrent && (
                    <button
                      onClick={() => onPlayItem(idx)}
                      className="p-1 rounded-lg hover:bg-brand/20 text-brand transition-colors min-w-[24px] min-h-[24px] flex items-center justify-center"
                      title="Play this item"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                  )}
                  {isCurrent && isPlaying && (
                    <span className="w-2 h-2 rounded-full bg-brand animate-pulse flex-shrink-0" />
                  )}
                  {(isHost || item.addedBy === localParticipantId) && (
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400 transition-colors min-w-[24px] min-h-[24px] flex items-center justify-center"
                      title="Remove from queue"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
