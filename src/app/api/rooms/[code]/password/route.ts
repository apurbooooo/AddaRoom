import { NextResponse } from "next/server";
import { roomStore } from "@/server/db";
import { setRoomPasswordSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;

/**
 * POST /api/rooms/[code]/password
 * Body: { participantId, sessionSecret, password? }
 * - password present & non-empty → set/change password
 * - password absent or empty → remove password
 */
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

    const parsed = setRoomPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
    }

    const room = await roomStore.getRoomByCode(code);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const { participantId, sessionSecret, password } = parsed.data;
    const host = await roomStore.verifyParticipantSession(room.id, participantId, sessionSecret);
    if (!host || host.role !== "host") {
      return NextResponse.json({ error: "Forbidden: Only the host can set a room password" }, { status: 403 });
    }

    if (password && password.trim().length > 0) {
      // Set/change password — hash server-side only
      const hash = await bcrypt.hash(password.trim(), BCRYPT_ROUNDS);
      await roomStore.setRoomPassword(room.id, hash);
      console.log(`[API /password] Password set for room ${code}`);
      return NextResponse.json({ success: true, hasPassword: true });
    } else {
      // Remove password
      await roomStore.setRoomPassword(room.id, null);
      console.log(`[API /password] Password removed for room ${code}`);
      return NextResponse.json({ success: true, hasPassword: false });
    }
  } catch (error: any) {
    console.error("[API /api/rooms/[code]/password] Error:", error?.message || error);
    return NextResponse.json({ error: "Failed to update room password" }, { status: 500 });
  }
}

/**
 * DELETE /api/rooms/[code]/password
 * Body: { participantId, sessionSecret }
 * Alias for POST with no password — removes the password.
 */
export async function DELETE(
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

    const parsed = setRoomPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const room = await roomStore.getRoomByCode(code);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const { participantId, sessionSecret } = parsed.data;
    const host = await roomStore.verifyParticipantSession(room.id, participantId, sessionSecret);
    if (!host || host.role !== "host") {
      return NextResponse.json({ error: "Forbidden: Only the host can remove a room password" }, { status: 403 });
    }

    await roomStore.setRoomPassword(room.id, null);
    console.log(`[API /password] Password removed for room ${code}`);
    return NextResponse.json({ success: true, hasPassword: false });
  } catch (error: any) {
    console.error("[API /api/rooms/[code]/password] DELETE Error:", error?.message || error);
    return NextResponse.json({ error: "Failed to remove room password" }, { status: 500 });
  }
}
