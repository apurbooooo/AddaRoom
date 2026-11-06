import { NextResponse } from "next/server";
import { roomStore } from "@/server/db";
import { createRoomSchema } from "@/lib/validations";
import { generateRoomCode, generateSessionSecret } from "@/lib/crypto";
import { assertLiveKitConfigured, createLiveKitToken } from "@/server/livekit";
import { checkEndpointRateLimit } from "@/server/rate-limit";
import { getClientLiveKitUrl } from "@/lib/livekit-url";

export async function POST(req: Request) {
  try {
    assertLiveKitConfigured();
    if (!(await checkEndpointRateLimit(req, "create-room"))) {
      return NextResponse.json({ error: "RATE_LIMITED", message: "Too many room creation requests. Try again later." }, {
        status: 429,
        headers: { "Retry-After": "900" },
      });
    }
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = createRoomSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid room creation input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, capacity, hostName, avatar } = parsed.data;
    const sessionSecret = generateSessionSecret();
    const roomCode = generateRoomCode();

    const { room, hostParticipant } = await roomStore.createRoom({
      roomCode,
      title,
      capacity,
      hostName,
      hostAvatar: avatar,
      sessionSecret,
    });

    const livekitToken = await createLiveKitToken({
      roomCode: room.roomCode,
      participantId: hostParticipant.id,
      participantName: hostParticipant.displayName,
      isHost: true,
      avatar: hostParticipant.avatar,
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
        participantId: hostParticipant.id,
        sessionSecret: sessionSecret,
        displayName: hostParticipant.displayName,
        avatar: hostParticipant.avatar,
        role: "host",
      },
      livekitToken,
      livekitUrl,
    });
  } catch (error: any) {
    console.error("[API /api/rooms] Error creating room:", error?.message || error, error?.stack);
    return NextResponse.json(
      { error: "Failed to create room. Please try again." },
      { status: 500 }
    );
  }
}

