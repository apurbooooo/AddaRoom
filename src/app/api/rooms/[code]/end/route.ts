import { NextResponse } from "next/server";
import { roomStore } from "@/server/db";
import { sessionAuthSchema } from "@/lib/validations";
import { closeLiveKitRoom } from "@/server/livekit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = sessionAuthSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }

    const room = await roomStore.getRoomByCode(code);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const { participantId, sessionSecret } = parsed.data;
    const participant = await roomStore.verifyParticipantSession(room.id, participantId, sessionSecret);
    if (!participant || participant.role !== "host") {
      return NextResponse.json(
        { error: "Forbidden: Only the room host can end the room" },
        { status: 403 }
      );
    }

    await roomStore.endRoom(room.id);
    await closeLiveKitRoom(room.roomCode);

    return NextResponse.json({ success: true, message: "Room ended" });
  } catch (error: any) {
    console.error("[API /api/rooms/[code]/end] Error ending room:", error?.message || error, error?.stack);
    return NextResponse.json({ error: "Failed to end room" }, { status: 500 });
  }
}

