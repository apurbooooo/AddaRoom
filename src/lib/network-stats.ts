import { ConnectionQuality } from "livekit-client";
import { ConnectionQualityStatus } from "@/types";

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
      return "reconnecting";
    case ConnectionQuality.Unknown:
    default:
      return "good";
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
        bg: "bg-emerald-500/10 border-emerald-500/30",
        text: "text-emerald-400",
        dot: "bg-emerald-500",
      };
    case "good":
      return {
        bg: "bg-teal-500/10 border-teal-500/30",
        text: "text-teal-400",
        dot: "bg-teal-500",
      };
    case "moderate":
      return {
        bg: "bg-amber-500/10 border-amber-500/30",
        text: "text-amber-400",
        dot: "bg-amber-500",
      };
    case "poor":
    case "reconnecting":
      return {
        bg: "bg-rose-500/10 border-rose-500/30",
        text: "text-rose-400",
        dot: "bg-rose-500 animate-ping",
      };
  }
}

