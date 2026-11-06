import { NextResponse } from "next/server";
import { roomStore } from "@/server/db";
import { lockRoomSchema } from "@/lib/validations";

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

    const parsed = lockRoomSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    const room = await roomStore.getRoomByCode(code);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const { participantId, sessionSecret, locked } = parsed.data;
    const participant = await roomStore.verifyParticipantSession(room.id, participantId, sessionSecret);
    if (!participant || participant.role !== "host") {
      return NextResponse.json(
        { error: "Forbidden: Only the room host can lock or unlock the room" },
        { status: 403 }
      );
    }

    const updated = await roomStore.updateRoomLock(room.id, locked);

    return NextResponse.json({
      success: true,
      status: updated.status,
      message: locked ? "Room locked" : "Room unlocked",
    });
  } catch (error: any) {
    console.error("[API /api/rooms/[code]/lock] Error toggling room lock:", error?.message || error, error?.stack);
    return NextResponse.json({ error: "Failed to update room lock" }, { status: 500 });
  }
}

