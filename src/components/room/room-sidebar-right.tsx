"use client";

import React from "react";
import { ChatPanel } from "@/components/chat/chat-panel";
import { ChatMessagePacket } from "@/types";

interface RoomSidebarRightProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessagePacket[];
  currentParticipantId: string;
  onSendMessage: (text: string, replyTo?: ChatMessagePacket["replyTo"]) => void;
  onSendTyping: (isTyping: boolean) => void;
  typingUsers: string[];
  className?: string;
}

export function RoomSidebarRight({
  isOpen,
  onClose,
  messages,
  currentParticipantId,
  onSendMessage,
  onSendTyping,
  typingUsers,
  className = "",
}: RoomSidebarRightProps) {
  return (
    <aside
      className={`w-80 flex-col flex-shrink-0 bg-[#111111] border-l border-[#1a1a1a] overflow-hidden ${className}`}
    >
      <ChatPanel
        isOpen={isOpen}
        onClose={onClose}
        messages={messages}
        currentParticipantId={currentParticipantId}
        onSendMessage={onSendMessage}
        onSendTyping={onSendTyping}
        typingUsers={typingUsers}
      />
    </aside>
  );
}
