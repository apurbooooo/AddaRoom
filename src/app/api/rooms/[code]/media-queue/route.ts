import { NextResponse } from "next/server";
import { z } from "zod";
import { roomStore } from "@/server/db";
import { mediaQueueStore, StalePlaybackVersionError } from "@/server/db/media-queue-store";
import { mediaQueueAddSchema, mediaQueuePlaybackSchema } from "@/lib/validations";
import { checkEndpointRateLimit } from "@/server/rate-limit";
import { canControlQueueItem } from "@/server/db/media-queue-authorization";

async function authenticate(code: string, participantId: string, sessionSecret: string) {
  const room = await roomStore.getRoomByCode(code);
  if (!room) return { error: NextResponse.json({ error: "Room not found" }, { status: 404 }) } as const;
  const participant = await roomStore.verifyParticipantSession(room.id, participantId, sessionSecret);
  if (!participant) return { error: NextResponse.json({ error: "Invalid or expired session" }, { status: 401 }) } as const;
  return { room, participant } as const;
}

async function presentSnapshot(snapshot: Awaited<ReturnType<typeof mediaQueueStore.getSnapshot>>) {
  const items = await Promise.all(snapshot.items.map(async (item) => {
    const owner = await roomStore.getParticipantById(item.ownerParticipantId);
    return { ...item, addedBy: item.ownerParticipantId, addedByName: owner?.displayName || item.ownerParticipantId, avatar: owner?.avatar || "👋" };
  }));
  return { ...snapshot, items };
}

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const participantId = req.headers.get("x-addaroom-participant-id") || "";
  const sessionSecret = req.headers.get("x-addaroom-session-secret") || "";
  const auth = await authenticate(code, participantId, sessionSecret);
  if ("error" in auth) return auth.error;
  const snapshot = await mediaQueueStore.getSnapshot(auth.room.roomCode);
  return NextResponse.json({ ...(await presentSnapshot(snapshot)), serverTime: Date.now() });
}

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!(await checkEndpointRateLimit(req, "media-queue-write"))) return NextResponse.json({ error: "RATE_LIMITED", message: "Too many queue commands. Try again shortly." }, { status: 429 });
  const { code } = await params;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
  const action = z.object({ action: z.string() }).safeParse(body);
  if (!action.success) return NextResponse.json({ error: "Missing queue action" }, { status: 400 });
  if (action.data.action === "add") {
    const parsed = mediaQueueAddSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid media queue item", details: parsed.error.flatten() }, { status: 400 });
    const auth = await authenticate(code, parsed.data.participantId, parsed.data.sessionSecret);
    if ("error" in auth) return auth.error;
    try {
      const item = await mediaQueueStore.addItem({ roomCode: auth.room.roomCode, sourceType: parsed.data.sourceType, sourceUrl: parsed.data.sourceUrl, title: parsed.data.title, ownerParticipantId: auth.participant.id });
      return NextResponse.json({ item, snapshot: await presentSnapshot(await mediaQueueStore.getSnapshot(auth.room.roomCode)) }, { status: 201 });
    } catch (error: any) { return NextResponse.json({ error: error?.message || "Unsupported media source" }, { status: 400 }); }
  }
  const parsed = mediaQueuePlaybackSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid playback command", details: parsed.error.flatten() }, { status: 400 });
  const auth = await authenticate(code, parsed.data.participantId, parsed.data.sessionSecret);
  if ("error" in auth) return auth.error;
  const snapshot = await mediaQueueStore.getSnapshot(auth.room.roomCode);
  const targetItemId = parsed.data.currentItemId ?? snapshot.playback?.currentItemId ?? null;
  const current = snapshot.items.find((item) => item.id === targetItemId);
  if (current && !canControlQueueItem(auth.participant, current.ownerParticipantId)) return NextResponse.json({ error: "Only the media owner or host can control this item" }, { status: 403 });
  if (!current && targetItemId) return NextResponse.json({ error: "Media queue item not found" }, { status: 404 });
  if (!current && auth.participant.role !== "host") return NextResponse.json({ error: "Only the host can change playback when no current item is selected" }, { status: 403 });
  try {
    const playback = await mediaQueueStore.updatePlayback({ roomCode: auth.room.roomCode, participantId: auth.participant.id, currentItemId: targetItemId, playbackState: parsed.data.action === "play" ? "playing" : "paused", positionSeconds: parsed.data.action === "restart" ? 0 : parsed.data.positionSeconds, playbackRate: parsed.data.playbackRate, expectedVersion: parsed.data.expectedVersion });
    return NextResponse.json({ playback, snapshot: await presentSnapshot(await mediaQueueStore.getSnapshot(auth.room.roomCode)), serverTime: Date.now() });
  } catch (error) {
    if (error instanceof StalePlaybackVersionError) return NextResponse.json({ error: error.message }, { status: 409 });
    throw error;
  }
}
