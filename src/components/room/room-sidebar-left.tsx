"use client";

import React from "react";
import { Mic, MicOff, Crown, Volume2, Wifi } from "lucide-react";
import { PublicParticipant } from "@/types";
import { ParticipantNetworkTelemetry } from "@/hooks/use-network-telemetry";
import { getConnectionStatusColor, NETWORK_RTT_THRESHOLDS_MS } from "@/lib/network-stats";
import { AvatarPortrait } from "@/components/avatar/avatar-portrait";

interface RoomSidebarLeftProps {
  participants: PublicParticipant[];
  localParticipantId: string;
  speakingParticipantIds: string[];
  networkMetrics: Record<string, ParticipantNetworkTelemetry>;
  microphoneStates?: Record<string, boolean>;
  className?: string;
}

export function RoomSidebarLeft({
  participants,
  localParticipantId,
  speakingParticipantIds,
  networkMetrics,
  microphoneStates = {},
  className = "",
}: RoomSidebarLeftProps) {
  const isSpeaking = (id: string) => speakingParticipantIds.includes(id);

  return (
    <aside
      className={`w-64 flex-col flex-shrink-0 bg-[#111111] border-r border-[#1a1a1a] overflow-y-auto ${className}`}
    >
      <div className="p-4 border-b border-[#1a1a1a]">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
          Participants ({participants.length})
        </h3>
      </div>

      <div className="p-2 space-y-1">
        {participants.length === 0 ? (
          <p className="text-xs text-gray-600 italic p-3 text-center">Just you here…</p>
        ) : (
          participants.map((p) => {
            const isLocal = p.id === localParticipantId;
            const speaking = isSpeaking(p.id);
            const rttMs = networkMetrics[p.id]?.rttMs ?? null;
            const networkQuality = networkMetrics[p.id]?.quality ?? "unknown";
            const networkColor = rttMs === null ? getConnectionStatusColor(networkQuality).text : rttMs < NETWORK_RTT_THRESHOLDS_MS.goodBelow ? "text-brand" : rttMs <= NETWORK_RTT_THRESHOLDS_MS.moderateThrough ? "text-amber-400" : "text-rose-400";
            return (
              <div
                key={p.id}
                className={`flex items-center gap-2.5 p-2 rounded-xl transition-colors ${
                  speaking ? "bg-brand/5" : "hover:bg-black/40"
                }`}
              >
                {/* Avatar with speaking ring */}
                <div className="relative flex-shrink-0">
                  <AvatarPortrait
                    avatarId={p.avatar || p.id}
                    size={32}
                    isSpeaking={speaking}
                  />
                  {speaking && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#111111] rounded-full flex items-center justify-center">
                      <Volume2 className="w-2 h-2 text-brand" />
                    </span>
                  )}
                </div>

                {/* Name + badges */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-white truncate">
                      {p.displayName}
                      {isLocal && (
                        <span className="ml-1 text-gray-500 font-normal">(you)</span>
                      )}
                    </span>
                    {p.role === "host" && (
                      <span className="flex-shrink-0 px-1 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-brand/20 text-brand border border-brand/30">
                        Host
                      </span>
                    )}
                  </div>
                </div>

                <span className={`flex items-center gap-1 text-[10px] font-medium ${networkColor}`} title={`${rttMs === null ? "RTT unavailable" : `${rttMs} ms`} to LiveKit SFU; self-reported WebRTC measurement`}>
                  <Wifi className="w-3 h-3" />{rttMs === null ? "-- ms" : `${rttMs} ms`}
                </span>

                {/* Mic status */}
                <div className="flex-shrink-0">
                  {microphoneStates[p.id] === false || (microphoneStates[p.id] === undefined && p.isMutedByHost) ? (
                    <MicOff className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-gray-500" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
