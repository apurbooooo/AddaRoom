"use client";

import { useEffect, useState } from "react";
import { ConnectionQuality, Room, RoomEvent } from "livekit-client";
import { ConnectionQualityStatus } from "@/types";
import {
  NETWORK_TELEMETRY_INTERVAL_MS,
  NETWORK_TELEMETRY_MAX_AGE_MS,
  readSelectedPairRtt,
  validateNetworkTelemetry,
  mapLiveKitQuality,
} from "@/lib/network-stats";

export interface ParticipantNetworkTelemetry {
  rttMs: number | null;
  updatedAt: number;
  quality: ConnectionQualityStatus;
}

/** Shares each participant's measured WebRTC RTT to the LiveKit SFU, never peer-to-peer. */
export function useNetworkTelemetry(room?: Room) {
  const [metrics, setMetrics] = useState<Record<string, ParticipantNetworkTelemetry>>({});

  useEffect(() => {
    if (!room) {
      setMetrics({});
      return;
    }
    let active = true;
    let lastAcceptedAt = new Map<string, number>();
    let rttWindow: number[] = [];
    const localId = room.localParticipant.identity;

    const handleData = (payload: Uint8Array, sender?: { identity?: string }) => {
      if (!sender?.identity || sender.identity === localId) return;
      try {
        const packet = JSON.parse(new TextDecoder().decode(payload));
        const telemetry = validateNetworkTelemetry(packet);
        if (!telemetry) return;
        const now = Date.now();
        const last = lastAcceptedAt.get(sender.identity) ?? 0;
        if (now - last < 2000) return;
        lastAcceptedAt.set(sender.identity, now);
        const participant = room.remoteParticipants.get(sender.identity);
        setMetrics((previous) => ({ ...previous, [sender.identity!]: { rttMs: telemetry.rttMs, updatedAt: telemetry.sentAt, quality: mapLiveKitQuality(participant?.connectionQuality ?? ConnectionQuality.Unknown) } }));
      } catch {
        // Other application data packets and malformed payloads are ignored.
      }
    };
    room.on(RoomEvent.DataReceived, handleData);

    const sendMetric = async () => {
      try {
        const transports = room.engine.pcManager;
        const reports = await Promise.all([
          transports?.publisher.getStats(),
          transports?.subscriber?.getStats(),
        ]);
        const samples = reports.filter((report): report is RTCStatsReport => !!report)
          .map(readSelectedPairRtt).filter((value): value is number => value !== null);
        const sample = samples.length ? Math.round(samples.reduce((sum, value) => sum + value, 0) / samples.length) : null;
        if (sample !== null) rttWindow = [...rttWindow, sample].slice(-3);
        else rttWindow = [];
        const rttMs = rttWindow.length ? Math.round(rttWindow.reduce((sum, value) => sum + value, 0) / rttWindow.length) : null;
        const sentAt = Date.now();
        if (!active) return;
        setMetrics((previous) => ({ ...previous, [localId]: { rttMs, updatedAt: sentAt, quality: mapLiveKitQuality(room.localParticipant.connectionQuality) } }));
        const bytes = new TextEncoder().encode(JSON.stringify({ type: "network_telemetry", version: 1, rttMs, sentAt }));
        await room.localParticipant.publishData(bytes, { reliable: false });
      } catch {
        // Stats are unavailable during reconnects; the current reading will expire.
      }
    };

    void sendMetric();
    const timer = setInterval(() => {
      void sendMetric();
      const cutoff = Date.now() - NETWORK_TELEMETRY_MAX_AGE_MS;
      setMetrics((previous) => Object.fromEntries(Object.entries(previous).filter(([, value]) => value.updatedAt >= cutoff)));
    }, NETWORK_TELEMETRY_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(timer);
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room]);

  return metrics;
}
