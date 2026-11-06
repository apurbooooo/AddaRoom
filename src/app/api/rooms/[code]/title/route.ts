import { NextResponse } from "next/server";
import { roomStore } from "@/server/db";
import { updateTitleSchema } from "@/lib/validations";

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

    const parsed = updateTitleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid title input" }, { status: 400 });
    }

    const room = await roomStore.getRoomByCode(code);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const { participantId, sessionSecret, title } = parsed.data;
    const participant = await roomStore.verifyParticipantSession(room.id, participantId, sessionSecret);
    if (!participant || participant.role !== "host") {
      return NextResponse.json(
        { error: "Forbidden: Only the room host can change the title" },
        { status: 403 }
      );
    }

    const updated = await roomStore.updateRoomTitle(room.id, title);

    return NextResponse.json({
      success: true,
      title: updated.title,
    });
  } catch (error: any) {
    console.error("[API /api/rooms/[code]/title] Error updating room title:", error?.message || error, error?.stack);
    return NextResponse.json({ error: "Failed to update room title" }, { status: 500 });
  }
}

