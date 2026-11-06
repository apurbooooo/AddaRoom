/**
 * URL normalization utilities for LiveKit Cloud and self-hosted instances.
 * Guarantees correct WebSocket protocol (wss:// or ws://) for browser clients
 * and HTTP protocol (https:// or http://) for server-side API clients.
 */

export function getClientLiveKitUrl(): string {
  const raw = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL || "ws://localhost:7880";
  const trimmed = raw.trim();
  if (trimmed.startsWith("https://")) {
    return trimmed.replace(/^https:\/\//, "wss://");
  }
  if (trimmed.startsWith("http://")) {
    return trimmed.replace(/^http:\/\//, "ws://");
  }
  return trimmed;
}

export function getServerLiveKitUrl(): string {
  const raw = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL || "http://localhost:7880";
  const trimmed = raw.trim();
  if (trimmed.startsWith("wss://")) {
    return trimmed.replace(/^wss:\/\//, "https://");
  }
  if (trimmed.startsWith("ws://")) {
    return trimmed.replace(/^ws:\/\//, "http://");
  }
  return trimmed;
}

