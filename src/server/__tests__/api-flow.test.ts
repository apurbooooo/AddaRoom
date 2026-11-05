import { describe, it, expect, beforeEach } from "vitest";
import { MemoryRoomStore, RoomFullError } from "../db/room-store";
import { generateRoomCode, hashSessionSecret, verifySessionSecret } from "@/lib/crypto";
import { createRoomSchema, joinRoomSchema } from "@/lib/validations";

describe("AddaRoom Security, Crypto & API Validations", () => {
  it("generates unpredictable url-safe room codes", () => {
    const code1 = generateRoomCode();
    const code2 = generateRoomCode();
    expect(code1).toMatch(/^[23456789abcdefghjkmnpqrstuvwxyz]{3}-[23456789abcdefghjkmnpqrstuvwxyz]{4}$/);
    expect(code2).toMatch(/^[23456789abcdefghjkmnpqrstuvwxyz]{3}-[23456789abcdefghjkmnpqrstuvwxyz]{4}$/);
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
    // Valid input
    const valid = createRoomSchema.safeParse({
      title: "Weekend Adda",
      capacity: 4,
      hostName: "Apurbo",
      avatar: "👑",
    });
    expect(valid.success).toBe(true);

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
    const valid = joinRoomSchema.safeParse({
      displayName: "Guest Friend",
      avatar: "👋",
    });
    expect(valid.success).toBe(true);

    const emptyName = joinRoomSchema.safeParse({
      displayName: "   ",
      avatar: "👋",
    });
    expect(emptyName.success).toBe(false);
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
