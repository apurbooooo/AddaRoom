import { NextResponse } from "next/server";
import { roomStore } from "@/server/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const room = await roomStore.getRoomByCode(code);

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    if (room.status === "ended" || room.expiresAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: "ROOM_ENDED", message: "This room has ended or expired." }, { status: 410 });
    }

    const participants = await roomStore.getActiveParticipants(room.id);
    const host = participants.find((p) => p.id === room.hostParticipantId);

    return NextResponse.json({
      room: {
        id: room.id,
        roomCode: room.roomCode,
        title: room.title,
        capacity: room.capacity,
        status: room.status,
        hostName: host ? host.displayName : "Host",
        participantCount: participants.length,
        participants: participants.map((p) => ({
          id: p.id,
          displayName: p.displayName,
          avatar: p.avatar,
          role: p.role,
          joinedAt: p.joinedAt.toISOString(),
          canScreenShare: p.canScreenShare,
          isMutedByHost: p.isMutedByHost,
        })),
      },
    });
  } catch (error: any) {
    console.error("[API /api/rooms/[code]] Error fetching room details:", error?.message || error, error?.stack);
    return NextResponse.json(
      { error: "Failed to fetch room details" },
      { status: 500 }
    );
  }
}

