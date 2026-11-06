import { AccessToken, RoomServiceClient, TrackSource, DataPacket_Kind } from "livekit-server-sdk";
import { getServerLiveKitUrl } from "@/lib/livekit-url";
import { DEFAULT_AVATAR_ID } from "@/lib/avatar-catalog";

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
  canScreenShare?: boolean;
  isMutedByHost?: boolean;
}): Promise<string> {
  const { apiKey, apiSecret } = getLiveKitConfig();
  const at = new AccessToken(apiKey, apiSecret, {
    identity: params.participantId,
    name: params.participantName,
    metadata: JSON.stringify({
      avatar: params.avatar || DEFAULT_AVATAR_ID,
      isHost: params.isHost,
    }),
    ttl: "2h", // 2-hour TTL prevents expiry mid-session while still limiting stale-token exposure
  });

  at.addGrant({
    roomJoin: true,
    room: params.roomCode,
    canPublish: params.canPublish ?? true,
    canPublishSources: getParticipantTrackSources({
      canScreenShare: params.canScreenShare ?? true,
      isMutedByHost: params.isMutedByHost ?? false,
    }),
    canPublishData: true,
    canSubscribe: true,
    roomAdmin: params.isHost,
  });

  return await at.toJwt();
}

export function getParticipantTrackSources(options: { canScreenShare: boolean; isMutedByHost: boolean }): TrackSource[] {
  const sources = [TrackSource.CAMERA];
  if (!options.isMutedByHost) sources.push(TrackSource.MICROPHONE);
  if (options.canScreenShare) sources.push(TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO);
  return sources;
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
  const client = getRoomServiceClient();
  const active = await client.listParticipants(roomCode);
  if (!active.some((participant) => participant.identity === participantId)) return;
  // removeParticipant alone permits rejoin with the same unexpired JWT. LiveKit
  // rejects access tokens issued before this timestamp after the removal.
  await client.removeParticipant(roomCode, participantId, {
    revokeTokenTs: BigInt(Math.floor(Date.now() / 1000)),
  });
}

export async function notifyLiveKitParticipantKicked(roomCode: string, participantId: string): Promise<void> {
  const client = getRoomServiceClient();
  const packet = new TextEncoder().encode(JSON.stringify({
    type: "host_command",
    action: "kick",
    targetParticipantId: participantId,
  }));
  try {
    await client.sendData(roomCode, packet, DataPacket_Kind.RELIABLE, {
      destinationIdentities: [participantId],
      topic: "server-room-control",
    });
  } catch {
    // A participant may already be disconnected; token and session revocation
    // still take precedence over best-effort in-room feedback.
  }
}

export async function muteLiveKitParticipant(roomCode: string, participantId: string, trackSid: string): Promise<void> {
  const client = getRoomServiceClient();
  await client.mutePublishedTrack(roomCode, participantId, trackSid, true);
}

export async function setLiveKitParticipantHostPermissions(
  roomCode: string,
  participantId: string,
  permissions: { canScreenShare: boolean; isMutedByHost: boolean },
): Promise<void> {
  const client = getRoomServiceClient();
  const active = await client.listParticipants(roomCode);
  if (!active.some((participant) => participant.identity === participantId)) return;

  await client.updateParticipant(roomCode, participantId, {
    permission: {
      canSubscribe: true,
      canPublish: true,
      canPublishData: true,
      canPublishSources: getParticipantTrackSources(permissions),
    },
  });

  const participant = active.find((item) => item.identity === participantId);
  for (const track of participant?.tracks ?? []) {
    const isMicrophone = track.source === TrackSource.MICROPHONE;
    const isScreenShareTrack = track.source === TrackSource.SCREEN_SHARE || track.source === TrackSource.SCREEN_SHARE_AUDIO;
    if (isMicrophone && permissions.isMutedByHost) {
      await client.mutePublishedTrack(roomCode, participantId, track.sid, true);
    } else if (isMicrophone && !permissions.isMutedByHost) {
      await client.mutePublishedTrack(roomCode, participantId, track.sid, false);
    }
    if (isScreenShareTrack && !permissions.canScreenShare) {
      await client.mutePublishedTrack(roomCode, participantId, track.sid, true);
    } else if (isScreenShareTrack && permissions.canScreenShare) {
      await client.mutePublishedTrack(roomCode, participantId, track.sid, false);
    }
  }
}
