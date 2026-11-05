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
    const body = await req.json();

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
    console.error("Error ending room:", error);
    return NextResponse.json({ error: "Failed to end room" }, { status: 500 });
  }
}

