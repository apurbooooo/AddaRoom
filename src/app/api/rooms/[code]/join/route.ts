import { NextResponse } from "next/server";
import { roomStore, RoomFullError, RoomLockedError, RoomEndedError } from "@/server/db";
import { joinRoomSchema } from "@/lib/validations";
import { generateSessionSecret } from "@/lib/crypto";
import { assertLiveKitConfigured, createLiveKitToken } from "@/server/livekit";
import { checkEndpointRateLimit } from "@/server/rate-limit";
import { getClientLiveKitUrl } from "@/lib/livekit-url";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    assertLiveKitConfigured();
    if (!(await checkEndpointRateLimit(req, "join-room"))) {
      return NextResponse.json({ error: "RATE_LIMITED", message: "Too many join requests. Try again later." }, {
        status: 429,
        headers: { "Retry-After": "900" },
      });
    }
    const { code } = await params;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = joinRoomSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid join data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const room = await roomStore.getRoomByCode(code);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const { displayName, avatar } = parsed.data;
    const sessionSecret = generateSessionSecret();

    try {
      const { participant } = await roomStore.joinRoom(room.id, {
        displayName,
        avatar,
        sessionSecret,
      });

      const livekitToken = await createLiveKitToken({
        roomCode: room.roomCode,
        participantId: participant.id,
        participantName: participant.displayName,
        isHost: participant.role === "host",
        avatar: participant.avatar,
        canPublish: true,
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
    } catch (joinErr: any) {
      if (joinErr instanceof RoomFullError) {
        return NextResponse.json(
          { error: "ROOM_FULL", message: joinErr.message },
          { status: 409 }
        );
      }
      if (joinErr instanceof RoomLockedError) {
        return NextResponse.json(
          { error: "ROOM_LOCKED", message: "This room is currently locked by the host." },
          { status: 403 }
        );
      }
      if (joinErr instanceof RoomEndedError) {
        return NextResponse.json(
          { error: "ROOM_ENDED", message: "This room has already ended." },
          { status: 410 }
        );
      }
      throw joinErr;
    }
  } catch (error: any) {
    console.error("[API /api/rooms/[code]/join] Error joining room:", error?.message || error, error?.stack);
    return NextResponse.json(
      { error: "Failed to join room" },
      { status: 500 }
    );
  }
}

