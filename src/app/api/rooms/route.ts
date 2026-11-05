import { NextResponse } from "next/server";
import { roomStore } from "@/server/db";
import { createRoomSchema } from "@/lib/validations";
import { generateRoomCode, generateSessionSecret } from "@/lib/crypto";
import { createLiveKitToken } from "@/server/livekit";

export async function POST(req: Request) {
  try {
    const body = await req.json();
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

    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880";

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
    console.error("Error creating room:", error);
    return NextResponse.json(
      { error: "Failed to create room. Please try again." },
      { status: 500 }
    );
  }
}
