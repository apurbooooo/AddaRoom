import { NextResponse } from "next/server";
import { roomStore } from "@/server/db";
import { sessionAuthSchema } from "@/lib/validations";
import { createLiveKitToken } from "@/server/livekit";
import { getClientLiveKitUrl } from "@/lib/livekit-url";

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
      return NextResponse.json({ error: "Invalid session credentials" }, { status: 400 });
    }

    const room = await roomStore.getRoomByCode(code);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.status === "ended" || room.expiresAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: "ROOM_ENDED", message: "This room has ended or expired." }, { status: 410 });
    }

    const { participantId, sessionSecret } = parsed.data;
    const participant = await roomStore.verifyParticipantSession(room.id, participantId, sessionSecret);

    if (!participant) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    const livekitToken = await createLiveKitToken({
      roomCode: room.roomCode,
      participantId: participant.id,
      participantName: participant.displayName,
      isHost: participant.role === "host",
      avatar: participant.avatar,
      canPublish: !participant.isMutedByHost,
      canScreenShare: participant.canScreenShare,
      isMutedByHost: participant.isMutedByHost,
    });

    const livekitUrl = getClientLiveKitUrl();

    return NextResponse.json({
      room: {
        id: room.id,
        roomCode: room.roomCode,
        title: room.title,
        capacity: room.capacity,
        status: room.status,
      },
      session: {
        roomId: room.id,
        roomCode: room.roomCode,
        participantId: participant.id,
        sessionSecret: sessionSecret,
        displayName: participant.displayName,
        avatar: participant.avatar,
        role: participant.role,
      },
      livekitToken,
      livekitUrl,
    });
  } catch (error: any) {
    console.error("[API /api/rooms/[code]/session] Error resuming session:", error?.message || error, error?.stack);
    return NextResponse.json({ error: "Failed to resume session" }, { status: 500 });
  }
}
