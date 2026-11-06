import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { getServerLiveKitUrl } from "@/lib/livekit-url";

function getLiveKitConfig() {
  const production = process.env.NODE_ENV === "production";
  const apiKey = process.env.LIVEKIT_API_KEY || (production ? "" : "devkey");
  const apiSecret = process.env.LIVEKIT_API_SECRET || (production ? "" : "secret");
  const rawUrl = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL || (production ? "" : "http://localhost:7880");

  if (!apiKey || !apiSecret || !rawUrl ||
      (production && (apiKey === "devkey" || apiSecret === "secret"))) {
    throw new Error("LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL (or NEXT_PUBLIC_LIVEKIT_URL) must be configured in production");
  }

  const serverUrl = getServerLiveKitUrl();
  return { apiKey, apiSecret, serverUrl };
}

export function assertLiveKitConfigured(): void {
  getLiveKitConfig();
}

export async function createLiveKitToken(params: {
  roomCode: string;
  participantId: string;
  participantName: string;
  isHost: boolean;
  avatar?: string;
  canPublish?: boolean;
}): Promise<string> {
  const { apiKey, apiSecret } = getLiveKitConfig();
  const at = new AccessToken(apiKey, apiSecret, {
    identity: params.participantId,
    name: params.participantName,
    metadata: JSON.stringify({
      avatar: params.avatar || "👋",
      isHost: params.isHost,
    }),
    ttl: "10m", // Limit stale-token rejoin exposure on self-hosted LiveKit
  });

  at.addGrant({
    roomJoin: true,
    room: params.roomCode,
    canPublish: params.canPublish ?? true,
    canPublishData: true,
    canSubscribe: true,
    roomAdmin: params.isHost,
  });

  return await at.toJwt();
}

export function getRoomServiceClient(): RoomServiceClient {
  const { apiKey, apiSecret, serverUrl } = getLiveKitConfig();
  return new RoomServiceClient(serverUrl, apiKey, apiSecret);
}

export async function closeLiveKitRoom(roomCode: string): Promise<void> {
  try {
    const client = getRoomServiceClient();
    await client.deleteRoom(roomCode);
  } catch (err) {
    console.warn(`[LiveKit] Note: deleteRoom for "${roomCode}" warning/error:`, err);
  }
}

export async function kickLiveKitParticipant(roomCode: string, participantId: string): Promise<void> {
  try {
    const client = getRoomServiceClient();
    await client.removeParticipant(roomCode, participantId);
  } catch (err) {
    console.warn(`[LiveKit] Note: kickLiveKitParticipant for "${participantId}" warning/error:`, err);
  }
}

export async function muteLiveKitParticipant(roomCode: string, participantId: string, trackSid: string): Promise<void> {
  try {
    const client = getRoomServiceClient();
    await client.mutePublishedTrack(roomCode, participantId, trackSid, true);
  } catch (err) {
    console.warn(`[LiveKit] Note: muteLiveKitParticipant for "${participantId}" warning/error:`, err);
  }
}

