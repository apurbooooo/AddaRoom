"use client";

import React, { useMemo } from "react";
import { ChatMessagePacket, OverlayChatConfig } from "@/types";

interface ScreenChatOverlayProps {
  messages: ChatMessagePacket[];
  currentParticipantId: string;
  config: OverlayChatConfig;
  onUpdateConfig?: (updates: Partial<OverlayChatConfig>) => void;
}

export function ScreenChatOverlay({
  messages,
  currentParticipantId,
  config,
}: ScreenChatOverlayProps) {
  if (!config.enabled) return null;

  // Filter messages based on time (fade out seconds) and hideOwnMessages
  const now = Date.now();
  const maxAgeMs = config.fadeOutSeconds * 1000;

  // Get active messages within the fade-out window
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const visibleMessages = useMemo(() => {
    return messages
      .filter((m) => {
        if (config.hideOwnMessages && m.senderId === currentParticipantId) {
          return false;
        }
        return now - m.timestamp < maxAgeMs;
      })
      .slice(-6); // Keep up to 6 recent messages in stack
  }, [messages, config.hideOwnMessages, currentParticipantId, now, maxAgeMs]);

  if (visibleMessages.length === 0) return null;

  // Position alignment classes
  const positionClasses = {
    "bottom-left": "bottom-6 left-6 items-start",
    "bottom-right": "bottom-6 right-6 items-end",
    "top-left": "top-14 left-6 items-start",
    "top-right": "top-14 right-6 items-end",
  }[config.position];

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-30 p-4 flex flex-col justify-end ${positionClasses} overflow-hidden`}
    >
      <div className="flex flex-col gap-2 max-w-sm w-full">
        {visibleMessages.map((msg) => {
          const isMe = msg.senderId === currentParticipantId;
          return (
            <div
              key={msg.id}
              className="flex items-start gap-2 animate-in slide-in-from-bottom-2 fade-in duration-200"
              style={{ opacity: config.opacity }}
            >
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-900/90 border border-white/20 flex items-center justify-center text-xs shadow-md">
                {msg.avatar || "💬"}
              </div>
              <div
                className={`flex flex-col px-3 py-1.5 rounded-2xl backdrop-blur-md shadow-lg border text-xs ${
                  isMe
                    ? "bg-indigo-900/80 border-indigo-400/40 text-indigo-50"
                    : "bg-slate-900/85 border-slate-700/60 text-slate-100"
                }`}
              >
                <span className="font-bold text-[10px] tracking-wide text-indigo-300">
                  {msg.senderName}
                </span>
                <span className="text-xs break-words leading-relaxed select-none">
                  {msg.text}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

