"use client";

import React from "react";
import { ChatMessagePacket, OverlayChatConfig } from "@/types";
import { AvatarPortrait } from "@/components/avatar/avatar-portrait";

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

  const visibleMessages = messages
    .filter((m) => {
      if (config.hideOwnMessages && m.senderId === currentParticipantId) return false;
      return now - m.timestamp < maxAgeMs;
    })
    .slice(-6);

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
              <AvatarPortrait
                avatarId={msg.avatar || msg.senderId}
                size={28}
                className="border border-white/20 shadow-md"
              />
              <div
                className={`flex flex-col px-3 py-1.5 rounded-2xl backdrop-blur-md shadow-lg border text-xs ${
                  isMe
                    ? "bg-brand/15 border-brand/30 text-white"
                    : "bg-black/85 border-white/15 text-gray-100"
                }`}
              >
                <span className="font-bold text-[10px] tracking-wide text-brand">
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

