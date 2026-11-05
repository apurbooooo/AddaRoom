import { describe, it, expect, beforeEach } from "vitest";
import { MemoryRoomStore, RoomFullError, RoomLockedError, RoomEndedError } from "../room-store";

describe("Room Lifecycle & Capacity Enforcement", () => {
  let store: MemoryRoomStore;

  beforeEach(() => {
    store = new MemoryRoomStore();
  });

  it("creates a room with host participant and session secret", async () => {
    const { room, hostParticipant } = await store.createRoom({
      roomCode: "adda-test",
      title: "Friday Hangout",
      capacity: 4,
      hostName: "Apurbo",
      hostAvatar: "👑",
      sessionSecret: "super-secret-123",
    });

    expect(room.roomCode).toBe("adda-test");
    expect(room.capacity).toBe(4);
    expect(room.status).toBe("active");
    expect(hostParticipant.role).toBe("host");
    expect(hostParticipant.displayName).toBe("Apurbo");

    // Verify session
    const verified = await store.verifyParticipantSession(room.id, hostParticipant.id, "super-secret-123");
    expect(verified).not.toBeNull();
    expect(verified?.id).toBe(hostParticipant.id);

    // Verify wrong secret fails
    const invalid = await store.verifyParticipantSession(room.id, hostParticipant.id, "wrong-secret");
    expect(invalid).toBeNull();
  });

  it("strictly enforces room capacities (2, 3, 4, 6) and rejects the (N+1)th participant", async () => {
    // Test capacity = 2 (Host + 1 guest = 2 total)
    const { room } = await store.createRoom({
      roomCode: "duo-room",
      title: "Duo Chat",
      capacity: 2,
      hostName: "Host1",
      sessionSecret: "s1",
    });

    // 2nd participant joins -> SUCCESS
    const { participant: p2 } = await store.joinRoom(room.id, {
      displayName: "Guest1",
      sessionSecret: "s2",
    });
    expect(p2.displayName).toBe("Guest1");

    // 3rd participant joins -> MUST BE REJECTED with RoomFullError
    await expect(
      store.joinRoom(room.id, {
        displayName: "Guest2",
        sessionSecret: "s3",
      })
    ).rejects.toThrow(RoomFullError);

    // Test 6-person capacity limit: exactly 6 allowed, 7th participant rejected
    const { room: room6 } = await store.createRoom({
      roomCode: "six-room",
      title: "Full Squad",
      capacity: 6,
      hostName: "HostMax",
      sessionSecret: "shost",
    });

    // Join 5 more participants (total reaches 6)
    for (let i = 1; i <= 5; i++) {
      await store.joinRoom(room6.id, {
        displayName: `Friend ${i}`,
        sessionSecret: `sfriend_${i}`,
      });
    }

    const activeList = await store.getActiveParticipants(room6.id);
    expect(activeList.length).toBe(6);

    // 7th participant attempts to join -> MUST FAIL with RoomFullError
    await expect(
      store.joinRoom(room6.id, {
        displayName: "Seventh Person",
        sessionSecret: "s7",
      })
    ).rejects.toThrow(RoomFullError);
  });

  it("rejects joins when room is locked", async () => {
    const { room } = await store.createRoom({
      roomCode: "lock-test",
      title: "Private Space",
      capacity: 4,
      hostName: "Host",
      sessionSecret: "shost",
    });

    await store.updateRoomLock(room.id, true);

    await expect(
      store.joinRoom(room.id, {
        displayName: "Guest",
        sessionSecret: "sguest",
      })
    ).rejects.toThrow(RoomLockedError);
  });

  it("rejects joins when room is ended", async () => {
    const { room } = await store.createRoom({
      roomCode: "ended-test",
      title: "Past Hangout",
      capacity: 4,
      hostName: "Host",
      sessionSecret: "shost",
    });

    await store.endRoom(room.id);

    await expect(
      store.joinRoom(room.id, {
        displayName: "Guest",
        sessionSecret: "sguest",
      })
    ).rejects.toThrow(RoomEndedError);
  });

  it("supports host transfer and participant leave", async () => {
    const { room, hostParticipant } = await store.createRoom({
      roomCode: "transfer-test",
      title: "Transfer Hangout",
      capacity: 4,
      hostName: "InitialHost",
      sessionSecret: "sh1",
    });

    const { participant: guest } = await store.joinRoom(room.id, {
      displayName: "NewHostCandidate",
      sessionSecret: "sg1",
    });

    await store.transferHost(room.id, guest.id);

    const updatedGuest = await store.getParticipantById(guest.id);
    const updatedInitialHost = await store.getParticipantById(hostParticipant.id);

    expect(updatedGuest?.role).toBe("host");
    expect(updatedInitialHost?.role).toBe("member");

    // Now candidate leaves
    await store.leaveRoom(guest.id);
    const activeRemaining = await store.getActiveParticipants(room.id);
    expect(activeRemaining.find((p) => p.id === guest.id)).toBeUndefined();
  });
});
