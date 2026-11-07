import { NextResponse } from "next/server";
import { roomStore } from "@/server/db";
import { mediaQueueStore } from "@/server/db/media-queue-store";
import { sessionAuthSchema } from "@/lib/validations";
import { canRemoveQueueItem } from "@/server/db/media-queue-authorization";

export async function DELETE(req: Request, { params }: { params: Promise<{ code: string; itemId: string }> }) {
  const { code, itemId } = await params;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
  const parsed = sessionAuthSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid session credentials" }, { status: 400 });
  const room = await roomStore.getRoomByCode(code);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  const participant = await roomStore.verifyParticipantSession(room.id, parsed.data.participantId, parsed.data.sessionSecret);
  if (!participant) return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  const snapshot = await mediaQueueStore.getSnapshot(room.roomCode);
  const item = snapshot.items.find((candidate) => candidate.id === itemId);
  if (!item) return NextResponse.json({ error: "Media queue item not found" }, { status: 404 });
  if (!canRemoveQueueItem(participant, item.ownerParticipantId)) return NextResponse.json({ error: "Only the item owner or host can remove this item" }, { status: 403 });
  await mediaQueueStore.removeItem(room.roomCode, itemId);
  return NextResponse.json({ success: true });
}
