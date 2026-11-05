import { NextResponse } from "next/server";
import { roomStore } from "@/server/db";
import { sessionAuthSchema } from "@/lib/validations";

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
    if (!participant) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    await roomStore.leaveRoom(participantId);

    return NextResponse.json({ success: true, message: "Left room successfully" });
  } catch (error: any) {
    console.error("Error leaving room:", error);
    return NextResponse.json({ error: "Failed to leave room" }, { status: 500 });
  }
}

