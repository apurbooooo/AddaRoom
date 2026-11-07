"use client";

import React from "react";
import { Participant } from "livekit-client";
import { ParticipantTile } from "./participant-tile";
import { ScreenShareStage } from "./screen-share-stage";
import { ChatMessagePacket, ScreenShareQualityMode } from "@/types";
import { ParticipantNetworkTelemetry } from "@/hooks/use-network-telemetry";

interface ParticipantGridProps {
  localParticipant: Participant | undefined;
  remoteParticipants: Participant[];
  raisedHands: Set<string>;
  messages: ChatMessagePacket[];
  currentParticipantId: string;
  onSendMessage: (text: string) => void;
  unreadCount: number;
  onOpenChat: () => void;
  networkMetrics: Record<string, ParticipantNetworkTelemetry>;
  onStopScreenShare?: () => void;
  qualityMode: ScreenShareQualityMode;
  onChangeQualityMode?: (mode: ScreenShareQualityMode) => void;
}

export function ParticipantGrid({
  localParticipant,
  remoteParticipants,
  raisedHands,
  messages,
  currentParticipantId,
  onSendMessage,
  unreadCount,
  onOpenChat,
  networkMetrics,
  onStopScreenShare,
  qualityMode,
  onChangeQualityMode,
}: ParticipantGridProps) {
  // Combine all active participants
  const allParticipants = [
    ...(localParticipant ? [localParticipant] : []),
    ...remoteParticipants,
  ];

  // Check if anyone is currently sharing their screen
  const screenSharer = allParticipants.find((p) => p.isScreenShareEnabled);

  if (screenSharer) {
    return (
      <div className="flex-1 flex flex-col md:flex-row gap-3 p-2 sm:p-3 lg:p-5 overflow-hidden h-full bg-[#070707]">
        {/* Main Stage: Screen Share */}
        <div className="flex-1 h-full min-h-[280px] rounded-3xl border border-white/[0.06] bg-[#0d0d0d] p-1.5 shadow-2xl shadow-black/40">
          <ScreenShareStage
            participant={screenSharer}
            isLocal={screenSharer === localParticipant}
            messages={messages}
            currentParticipantId={currentParticipantId}
            onSendMessage={onSendMessage}
            unreadCount={unreadCount}
            onOpenChat={onOpenChat}
            onStopSharing={onStopScreenShare}
            qualityMode={qualityMode}
            onChangeQualityMode={onChangeQualityMode}
          />
        </div>

        {/* Compact Participant Strip */}
        <div className="flex md:flex-col gap-2.5 overflow-x-auto md:overflow-y-auto max-h-40 md:max-h-full md:w-56 flex-shrink-0 rounded-2xl bg-[#0d0d0d]/80 p-2">
          {allParticipants.map((p) => (
            <div
              key={p.identity}
              className="w-36 md:w-full h-24 md:h-32 flex-shrink-0"
            >
              <ParticipantTile
                participant={p}
                isLocal={p === localParticipant}
                isHandRaised={raisedHands.has(p.identity)}
                rttMs={networkMetrics[p.identity]?.rttMs}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Normal Participant Grid (up to 6 people)
  const count = allParticipants.length;

  let gridClasses = "grid-cols-1";
  if (count === 2) {
    gridClasses = "grid-cols-1 sm:grid-cols-2";
  } else if (count === 3 || count === 4) {
    gridClasses = "grid-cols-1 sm:grid-cols-2";
  } else if (count >= 5) {
    gridClasses = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(187,251,43,0.045),transparent_38%),#070707] p-2 sm:p-4 lg:p-6">
      <div className={`grid gap-3 sm:gap-4 h-full min-h-full max-w-[1440px] mx-auto ${gridClasses} auto-rows-fr`}>
          {allParticipants.map((p) => (
          <div key={p.identity} className="w-full h-full min-h-[190px] sm:min-h-[240px] lg:min-h-[280px] rounded-3xl bg-[#0d0d0d] p-1 shadow-xl shadow-black/30">
            <ParticipantTile
              participant={p}
              isLocal={p === localParticipant}
              isHandRaised={raisedHands.has(p.identity)}
              rttMs={networkMetrics[p.identity]?.rttMs}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
