import { describe, it, expect, beforeEach } from "vitest";
import { MemoryRoomStore, RoomFullError } from "../db/room-store";
import { generateRoomCode, hashSessionSecret, verifySessionSecret } from "@/lib/crypto";
import { createRoomSchema, joinRoomSchema, setRoomPasswordSchema, moderateRoomSchema } from "@/lib/validations";
import { AVATAR_CATALOG, DEFAULT_AVATAR_ID } from "@/lib/avatar-catalog";
import bcrypt from "bcryptjs";

describe("AddaRoom Security, Crypto & API Validations", () => {
  it("generates unpredictable url-safe room codes", () => {
    const code1 = generateRoomCode();
    const code2 = generateRoomCode();
    expect(code1).toMatch(/^[23456789abcdefghjkmnpqrstuvwxyz]{5}-[23456789abcdefghjkmnpqrstuvwxyz]{5}$/);
    expect(code2).toMatch(/^[23456789abcdefghjkmnpqrstuvwxyz]{5}-[23456789abcdefghjkmnpqrstuvwxyz]{5}$/);
    expect(code1).not.toBe(code2);
  });

  it("verifies session secrets with timing-safe hash comparison", () => {
    const secret = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const hashed = hashSessionSecret(secret);
    expect(hashed).toHaveLength(64);

    expect(verifySessionSecret(secret, hashed)).toBe(true);
    expect(verifySessionSecret("wrong_secret", hashed)).toBe(false);
  });

  it("validates room creation inputs strictly against schema", () => {
    for (const avatar of AVATAR_CATALOG) {
      const result = createRoomSchema.safeParse({
        title: "Weekend Adda",
        capacity: 4,
        hostName: "Apurbo",
        avatar: avatar.id,
      });
      expect(result.success, `Create schema rejected ${avatar.id}`).toBe(true);
    }

    // Valid input
    const valid = createRoomSchema.safeParse({
      title: "Weekend Adda",
      capacity: 4,
      hostName: "Apurbo",
      avatar: "👑",
    });
    expect(valid.success).toBe(true);
    expect(valid.success && valid.data.avatar).toBe(DEFAULT_AVATAR_ID);

    expect(createRoomSchema.safeParse({
      title: "Weekend Adda",
      capacity: 4,
      hostName: "Apurbo",
      avatar: "not-a-catalog-avatar",
    }).success).toBe(false);
    expect(createRoomSchema.safeParse({
      title: "Weekend Adda",
      capacity: 4,
      hostName: "Apurbo",
    }).data?.avatar).toBe(DEFAULT_AVATAR_ID);

    // Invalid capacity (must be 2, 3, 4, or 6 only)
    const invalidCap = createRoomSchema.safeParse({
      title: "Weekend Adda",
      capacity: 5, // Not allowed!
      hostName: "Apurbo",
    });
    expect(invalidCap.success).toBe(false);

    // Empty title
    const emptyTitle = createRoomSchema.safeParse({
      title: "",
      capacity: 6,
      hostName: "Apurbo",
    });
    expect(emptyTitle.success).toBe(false);
  });

  it("validates join inputs", () => {
    for (const avatar of AVATAR_CATALOG) {
      const result = joinRoomSchema.safeParse({
        displayName: "Guest Friend",
        avatar: avatar.id,
      });
      expect(result.success, `Join schema rejected ${avatar.id}`).toBe(true);
    }

    const valid = joinRoomSchema.safeParse({
      displayName: "Guest Friend",
      avatar: "👋",
    });
    expect(valid.success).toBe(true);
    expect(valid.success && valid.data.avatar).toBe(DEFAULT_AVATAR_ID);
    expect(joinRoomSchema.safeParse({
      displayName: "Guest Friend",
      avatar: "not-a-catalog-avatar",
    }).success).toBe(false);
    expect(joinRoomSchema.safeParse({
      displayName: "Guest Friend",
    }).data?.avatar).toBe(DEFAULT_AVATAR_ID);

    const emptyName = joinRoomSchema.safeParse({
      displayName: "   ",
      avatar: "👋",
    });
    expect(emptyName.success).toBe(false);

    expect(joinRoomSchema.safeParse({
      displayName: "Guest Friend",
      avatar: "👑",
    }).data?.avatar).toBe(DEFAULT_AVATAR_ID);
  });

  it("resolves LiveKit URLs correctly with protocol normalization", async () => {
    const { getClientLiveKitUrl, getServerLiveKitUrl } = await import("@/lib/livekit-url");
    const prevLivekitUrl = process.env.LIVEKIT_URL;
    const prevNextPublicUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    try {
      process.env.LIVEKIT_URL = "https://my-livekit.cloud";
      delete process.env.NEXT_PUBLIC_LIVEKIT_URL;
      expect(getClientLiveKitUrl()).toBe("wss://my-livekit.cloud");
      expect(getServerLiveKitUrl()).toBe("https://my-livekit.cloud");

      process.env.LIVEKIT_URL = "wss://my-livekit.cloud";
      expect(getServerLiveKitUrl()).toBe("https://my-livekit.cloud");
      expect(getClientLiveKitUrl()).toBe("wss://my-livekit.cloud");

      delete process.env.LIVEKIT_URL;
      process.env.NEXT_PUBLIC_LIVEKIT_URL = "https://public-livekit.cloud";
      expect(getClientLiveKitUrl()).toBe("wss://public-livekit.cloud");
      expect(getServerLiveKitUrl()).toBe("https://public-livekit.cloud");
    } finally {
      process.env.LIVEKIT_URL = prevLivekitUrl;
      process.env.NEXT_PUBLIC_LIVEKIT_URL = prevNextPublicUrl;
    }
  });

  it("compiles rate limit query parameters as primitive ISO strings without raw Date objects", async () => {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { sql } = await import("drizzle-orm");
    const { rateLimitBuckets } = await import("@/server/db/schema");

    const mockClient = { options: { parsers: {}, serializers: {} } };
    const db = drizzle(mockClient as any, { schema: { rateLimitBuckets } });
    const now = new Date("2026-01-01T12:00:00.000Z");
    const windowExpiry = new Date(now.getTime() - 900000);
    const nowIso = now.toISOString();
    const windowExpiryIso = windowExpiry.toISOString();

    const q = db.insert(rateLimitBuckets).values({
      key: "test-client-key",
      windowStartedAt: now,
      hitCount: 1,
    }).onConflictDoUpdate({
      target: rateLimitBuckets.key,
      set: {
        windowStartedAt: sql`case when ${rateLimitBuckets.windowStartedAt} <= ${windowExpiryIso}::timestamptz then ${nowIso}::timestamptz else ${rateLimitBuckets.windowStartedAt} end`,
        hitCount: sql`case when ${rateLimitBuckets.windowStartedAt} <= ${windowExpiryIso}::timestamptz then 1 else ${rateLimitBuckets.hitCount} + 1 end`,
      },
    }).returning({ hitCount: rateLimitBuckets.hitCount });

    const compiled = q.toSQL();
    expect(compiled.sql).toContain('insert into "rate_limit_buckets"');
    // Ensure all parameters in the compiled query are primitive strings or numbers
    for (const param of compiled.params) {
      expect(typeof param === "string" || typeof param === "number").toBe(true);
      expect(param instanceof Date).toBe(false);
    }
  });
});

describe("Complete Room Lifecycle End-to-End Simulation", () => {
  let store: MemoryRoomStore;

  beforeEach(() => {
    store = new MemoryRoomStore();
  });

  it("completes full room journey: create -> join -> moderate -> transfer -> end", async () => {
    // 1. Host creates room
    const hostSecret = "host-secret-test";
    const { room, hostParticipant } = await store.createRoom({
      roomCode: "fam-7711",
      title: "Family Adda",
      capacity: 3,
      hostName: "Parent",
      hostAvatar: "👑",
      sessionSecret: hostSecret,
    });

    expect(room.status).toBe("active");
    expect(hostParticipant.role).toBe("host");

    // 2. Guest 1 joins
    const guestSecret1 = "guest-1-secret";
    const { participant: p1 } = await store.joinRoom(room.id, {
      displayName: "Child 1",
      sessionSecret: guestSecret1,
    });
    expect(p1.role).toBe("member");

    // 3. Guest 2 joins (Room now reaches max capacity 3)
    const guestSecret2 = "guest-2-secret";
    const { participant: p2 } = await store.joinRoom(room.id, {
      displayName: "Child 2",
      sessionSecret: guestSecret2,
    });
    expect(p2.role).toBe("member");

    // 4. Guest 3 attempts to join -> REJECTED because capacity = 3
    await expect(
      store.joinRoom(room.id, {
        displayName: "Child 3",
        sessionSecret: "guest-3-secret",
      })
    ).rejects.toThrow(RoomFullError);

    // 5. Host updates room lock
    const lockedRoom = await store.updateRoomLock(room.id, true);
    expect(lockedRoom.status).toBe("locked");

    // 6. Host transfers leadership to Child 1
    await store.transferHost(room.id, p1.id);
    const newHost = await store.getParticipantById(p1.id);
    const demotedHost = await store.getParticipantById(hostParticipant.id);
    expect(newHost?.role).toBe("host");
    expect(demotedHost?.role).toBe("member");

    // 7. New host removes Child 2
    await store.kickParticipant(p2.id);
    const activeRemaining = await store.getActiveParticipants(room.id);
    expect(activeRemaining.length).toBe(2);

    // 8. Host ends the room
    await store.endRoom(room.id);
    const finalRoom = await store.getRoomById(room.id);
    expect(finalRoom?.status).toBe("ended");
  });
});

describe("Room Password Feature", () => {
  let store: MemoryRoomStore;

  beforeEach(() => {
    store = new MemoryRoomStore();
  });

  async function createRoom() {
    const { room, hostParticipant } = await store.createRoom({
      roomCode: generateRoomCode(),
      title: "Password Test Room",
      capacity: 4,
      hostName: "Host",
      sessionSecret: "host-secret",
    });
    return { room, hostParticipant };
  }

  it("room starts with no password (open access)", async () => {
    const { room } = await createRoom();
    expect(room.roomPasswordHash).toBeNull();
    // verifyRoomPassword returns true when no password set
    const ok = await store.verifyRoomPassword(room.id, undefined);
    expect(ok).toBe(true);
  });

  it("sets a room password with bcrypt hash", async () => {
    const { room } = await createRoom();
    const hash = await bcrypt.hash("secret123", 10);
    await store.setRoomPassword(room.id, hash);

    const updated = await store.getRoomById(room.id);
    expect(updated?.roomPasswordHash).not.toBeNull();
  });

  it("verifies correct password successfully", async () => {
    const { room } = await createRoom();
    const hash = await bcrypt.hash("correct_pass", 10);
    await store.setRoomPassword(room.id, hash);

    const ok = await store.verifyRoomPassword(room.id, "correct_pass");
    expect(ok).toBe(true);
  });

  it("rejects wrong password", async () => {
    const { room } = await createRoom();
    const hash = await bcrypt.hash("correct_pass", 10);
    await store.setRoomPassword(room.id, hash);

    const ok = await store.verifyRoomPassword(room.id, "wrong_pass");
    expect(ok).toBe(false);
  });

  it("rejects undefined password when room has password set", async () => {
    const { room } = await createRoom();
    const hash = await bcrypt.hash("some_pass", 10);
    await store.setRoomPassword(room.id, hash);

    const ok = await store.verifyRoomPassword(room.id, undefined);
    expect(ok).toBe(false);
  });

  it("clears password successfully (removes protection)", async () => {
    const { room } = await createRoom();
    const hash = await bcrypt.hash("some_pass", 10);
    await store.setRoomPassword(room.id, hash);

    // Clear the password
    await store.setRoomPassword(room.id, null);

    const updated = await store.getRoomById(room.id);
    expect(updated?.roomPasswordHash).toBeNull();

    // After clearing, any visitor should get in
    const ok = await store.verifyRoomPassword(room.id, undefined);
    expect(ok).toBe(true);
  });

  it("validates setRoomPasswordSchema — password max 50 chars", () => {
    const valid = setRoomPasswordSchema.safeParse({
      participantId: "part_abc",
      sessionSecret: "sec_xyz",
      password: "shortpass",
    });
    expect(valid.success).toBe(true);

    const tooLong = setRoomPasswordSchema.safeParse({
      participantId: "part_abc",
      sessionSecret: "sec_xyz",
      password: "a".repeat(51),
    });
    expect(tooLong.success).toBe(false);
  });

  it("validates moderateRoomSchema — requires explicit boolean for mute action", () => {
    const validMute = moderateRoomSchema.safeParse({
      participantId: "part_host",
      sessionSecret: "sec_123",
      action: "mute",
      targetParticipantId: "part_target",
      muted: true,
    });
    expect(validMute.success).toBe(true);

    const invalidMute = moderateRoomSchema.safeParse({
      participantId: "part_host",
      sessionSecret: "sec_123",
      action: "mute",
      targetParticipantId: "part_target",
    });
    expect(invalidMute.success).toBe(false);

    const validKick = moderateRoomSchema.safeParse({
      participantId: "part_host",
      sessionSecret: "sec_123",
      action: "kick",
      targetParticipantId: "part_target",
    });
    expect(validKick.success).toBe(true);

    const invalidAction = moderateRoomSchema.safeParse({
      participantId: "part_host",
      sessionSecret: "sec_123",
      action: "ban_forever",
      targetParticipantId: "part_target",
    });
    expect(invalidAction.success).toBe(false);
  });

  it("updates participant permissions for mute and screen share", async () => {
    const { room } = await createRoom();
    const { participant: guest } = await store.joinRoom(room.id, {
      displayName: "Guest",
      sessionSecret: "guest-secret",
    });

    expect(guest.isMutedByHost).toBe(false);
    expect(guest.canScreenShare).toBe(true);

    const mutedGuest = await store.updateParticipantPermissions(guest.id, { isMutedByHost: true });
    expect(mutedGuest.isMutedByHost).toBe(true);

    const restrictedGuest = await store.updateParticipantPermissions(guest.id, { canScreenShare: false });
    expect(restrictedGuest.canScreenShare).toBe(false);
  });

  it("kicked participant cannot re-auth session", async () => {
    const { room } = await createRoom();

    // Guest joins
    const { participant: guest } = await store.joinRoom(room.id, {
      displayName: "Guest",
      sessionSecret: "guest-secret",
    });

    // Host kicks the guest
    await store.kickParticipant(guest.id);

    // Guest tries to re-verify session — should fail because leftAt is set
    const result = await store.verifyParticipantSession(room.id, guest.id, "guest-secret");
    expect(result).toBeNull();
  });
});
