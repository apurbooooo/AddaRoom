import { NextResponse } from "next/server";
import { roomStore } from "@/server/db";
import { moderateRoomSchema } from "@/lib/validations";
import { kickLiveKitParticipant, notifyLiveKitParticipantKicked, setLiveKitParticipantHostPermissions } from "@/server/livekit";

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

    const parsed = moderateRoomSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid moderation command" }, { status: 400 });
    }

    const room = await roomStore.getRoomByCode(code);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const { participantId, sessionSecret, action, targetParticipantId, canScreenShare, muted } = parsed.data;
    const host = await roomStore.verifyParticipantSession(room.id, participantId, sessionSecret);
    if (!host || host.role !== "host") {
      return NextResponse.json(
        { error: "Forbidden: Only the room host can moderate the room" },
        { status: 403 }
      );
    }

    const target = await roomStore.getParticipantById(targetParticipantId);
    if (!target || target.roomId !== room.id || target.leftAt !== null) {
      return NextResponse.json({ error: "Target participant is not active in this room" }, { status: 404 });
    }
    if (targetParticipantId === host.id) {
      return NextResponse.json({ error: "You cannot moderate yourself" }, { status: 400 });
    }

    if (action === "kick") {
      // Revoke the online LiveKit token before the database session. If the
      // participant is offline, the database session check still blocks all
      // application re-entry and token renewal.
      await notifyLiveKitParticipantKicked(room.roomCode, targetParticipantId);
      await kickLiveKitParticipant(room.roomCode, targetParticipantId);
      await roomStore.kickParticipant(targetParticipantId);
      return NextResponse.json({ success: true, message: "Participant removed" });
    }

    if (action === "mute") {
      const nextMuted = muted!;
      await setLiveKitParticipantHostPermissions(room.roomCode, targetParticipantId, {
        canScreenShare: target.canScreenShare,
        isMutedByHost: nextMuted,
      });
      const updated = await roomStore.updateParticipantPermissions(targetParticipantId, { isMutedByHost: nextMuted });
      return NextResponse.json({ success: true, participant: updated, muted: nextMuted });
    }

    if (action === "transfer_host") {
      await roomStore.transferHost(room.id, targetParticipantId);
      return NextResponse.json({ success: true, message: "Host transferred successfully" });
    }

    if (action === "toggle_screen_share") {
      const nextAllowed = canScreenShare ?? true;
      await setLiveKitParticipantHostPermissions(room.roomCode, targetParticipantId, {
        canScreenShare: nextAllowed,
        isMutedByHost: target.isMutedByHost,
      });
      const updated = await roomStore.updateParticipantPermissions(targetParticipantId, { canScreenShare: nextAllowed });
      return NextResponse.json({ success: true, participant: updated });
    }

    return NextResponse.json({ error: "Unsupported moderation action" }, { status: 400 });
  } catch (error: any) {
    console.error("[API /api/rooms/[code]/moderate] Error performing moderation action:", error?.message || error, error?.stack);
    return NextResponse.json({ error: "Moderation action failed" }, { status: 500 });
  }
}

