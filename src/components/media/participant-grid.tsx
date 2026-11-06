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
      <div className="flex-1 flex flex-col md:flex-row gap-3 p-3 overflow-hidden h-full">
        {/* Main Stage: Screen Share */}
        <div className="flex-1 h-full min-h-[300px]">
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
        <div className="flex md:flex-col gap-2.5 overflow-x-auto md:overflow-y-auto max-h-40 md:max-h-full md:w-56 flex-shrink-0">
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
    <div className="flex-1 p-3 overflow-y-auto">
      <div className={`grid gap-3 h-full max-w-7xl mx-auto ${gridClasses} auto-rows-fr`}>
        {allParticipants.map((p) => (
          <div key={p.identity} className="w-full h-full min-h-[180px] sm:min-h-[220px]">
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
