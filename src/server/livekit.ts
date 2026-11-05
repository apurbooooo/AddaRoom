import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "devkey";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "secret";
const LIVEKIT_URL = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL || "http://localhost:7880";

export async function createLiveKitToken(params: {
  roomCode: string;
  participantId: string;
  participantName: string;
  isHost: boolean;
  avatar?: string;
  canPublish?: boolean;
}): Promise<string> {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: params.participantId,
    name: params.participantName,
    metadata: JSON.stringify({
      avatar: params.avatar || "👋",
      isHost: params.isHost,
    }),
    ttl: "4h", // 4 hours short-lived token
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
  return new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
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
