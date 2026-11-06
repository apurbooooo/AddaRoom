import { ConnectionQuality } from "livekit-client";
import { ConnectionQualityStatus } from "@/types";

export const NETWORK_TELEMETRY_INTERVAL_MS = 3000;
export const NETWORK_TELEMETRY_MAX_AGE_MS = 10000;
export const NETWORK_RTT_THRESHOLDS_MS = { goodBelow: 150, moderateThrough: 300 } as const;

export interface ValidatedNetworkTelemetry {
  rttMs: number | null;
  sentAt: number;
}

export function readSelectedPairRtt(report: RTCStatsReport): number | null {
  let selectedPairId: string | undefined;
  report.forEach((stat: any) => {
    if (stat.type === "transport" && stat.selectedCandidatePairId) selectedPairId = stat.selectedCandidatePairId;
  });
  const pairs: any[] = [];
  report.forEach((stat: any) => {
    if (stat.type === "candidate-pair") pairs.push(stat);
  });
  const selected = pairs.find((pair) => pair.id === selectedPairId) ?? pairs.find((pair) => pair.nominated && pair.state === "succeeded");
  const rttMs = typeof selected?.currentRoundTripTime === "number" ? selected.currentRoundTripTime * 1000 : NaN;
  return Number.isFinite(rttMs) && rttMs >= 0 && rttMs <= 60000 ? Math.round(rttMs) : null;
}

export function validateNetworkTelemetry(
  value: unknown,
  now = Date.now(),
): ValidatedNetworkTelemetry | null {
  if (!value || typeof value !== "object") return null;
  const packet = value as Record<string, unknown>;
  if (packet.type !== "network_telemetry" || packet.version !== 1) return null;
  if (typeof packet.sentAt !== "number" || !Number.isFinite(packet.sentAt) || packet.sentAt > now + 2000 || now - packet.sentAt > NETWORK_TELEMETRY_MAX_AGE_MS) return null;
  if (packet.rttMs !== null && (typeof packet.rttMs !== "number" || !Number.isFinite(packet.rttMs) || packet.rttMs < 0 || packet.rttMs > 60000)) return null;
  return { rttMs: packet.rttMs as number | null, sentAt: packet.sentAt };
}

export interface RealtimeNetworkMetrics {
  status: ConnectionQualityStatus;
  rttMs?: number;
  packetLossPercent?: number;
  jitterMs?: number;
  bitrateKbps?: number;
  actualFps?: number;
  actualWidth?: number;
  actualHeight?: number;
}

export function mapLiveKitQuality(quality: ConnectionQuality): ConnectionQualityStatus {
  switch (quality) {
    case ConnectionQuality.Excellent:
      return "excellent";
    case ConnectionQuality.Good:
      return "good";
    case ConnectionQuality.Poor:
      return "poor";
    case ConnectionQuality.Lost:
      return "lost";
    case ConnectionQuality.Unknown:
    default:
      return "unknown";
  }
}

export function getConnectionStatusColor(status: ConnectionQualityStatus): {
  bg: string;
  text: string;
  dot: string;
} {
  switch (status) {
    case "excellent":
      return {
        bg: "bg-brand/10 border-brand/30",
        text: "text-brand",
        dot: "bg-brand",
      };
    case "good":
      return {
        bg: "bg-green-500/10 border-green-500/30",
        text: "text-green-400",
        dot: "bg-green-500",
      };
    case "moderate":
      return {
        bg: "bg-amber-500/10 border-amber-500/30",
        text: "text-amber-400",
        dot: "bg-amber-500",
      };
    case "poor":
    case "lost":
      return {
        bg: "bg-rose-500/10 border-rose-500/30",
        text: "text-rose-400",
        dot: "bg-rose-500",
      };
    case "unknown":
      return {
        bg: "bg-white/5 border-white/10",
        text: "text-gray-400",
        dot: "bg-gray-500",
      };
  }
}

