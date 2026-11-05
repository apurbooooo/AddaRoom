"use client";

import React, { useMemo } from "react";
import { ActiveReactionItem } from "@/hooks/use-room-data-channel";

interface FloatingReactionsProps {
  reactions: ActiveReactionItem[];
}

export function FloatingReactions({ reactions }: FloatingReactionsProps) {
  // Precompute stable random horizontal offsets for each reaction id
  const renderedReactions = useMemo(() => {
    return reactions.map((r) => {
      // hash string to get pseudo-random offset between 15% and 85%
      let hash = 0;
      for (let i = 0; i < r.id.length; i++) {
        hash = (hash << 5) - hash + r.id.charCodeAt(i);
        hash |= 0;
      }
      const leftPercent = 20 + Math.abs(hash % 60);
      return {
        ...r,
        leftPercent,
      };
    });
  }, [reactions]);

  if (renderedReactions.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {renderedReactions.map((item) => (
        <div
          key={item.id}
          className="absolute bottom-20 flex flex-col items-center animate-float-up select-none"
          style={{ left: `${item.leftPercent}%` }}
        >
          <span className="text-4xl drop-shadow-lg filter transition-transform">
            {item.emoji}
          </span>
          <span className="mt-1 px-2 py-0.5 text-[11px] font-semibold text-white/90 bg-slate-900/80 rounded-full border border-white/10 backdrop-blur-sm shadow-md">
            {item.senderName}
          </span>
        </div>
      ))}
    </div>
  );
}

