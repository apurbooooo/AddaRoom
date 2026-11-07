import { createHmac } from "node:crypto";
import { roomStore } from "@/server/db";

const WINDOW_MS = 15 * 60 * 1000;

export async function checkEndpointRateLimit(
  request: Request,
  endpoint: "create-room" | "join-room" | "media-queue-write",
): Promise<boolean> {
  const secret = process.env.RATE_LIMIT_SECRET
    || process.env.LIVEKIT_API_SECRET
    || (process.env.NODE_ENV === "production" ? "" : "local-development-rate-limit-key");
  if (!secret || (process.env.NODE_ENV === "production" && secret === "local-development-rate-limit-key")) {
    throw new Error("RATE_LIMIT_SECRET or LIVEKIT_API_SECRET must be configured in production");
  }

  // In production, only trust these headers from the configured edge proxy.
  // Docker binds the app port to loopback and Caddy overwrites X-Real-IP.
  const address = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown-client";
  const key = createHmac("sha256", secret).update(`${endpoint}:${address}`).digest("hex");
  const limit = endpoint === "create-room" ? 5 : endpoint === "media-queue-write" ? 60 : 20;
  return roomStore.consumeRateLimit(key, limit, WINDOW_MS);
}
