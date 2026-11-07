import { describe, expect, it } from "vitest";
import { canControlQueueItem, canRemoveQueueItem, isActiveRoomParticipant } from "@/server/db/media-queue-authorization";

const owner = { id: "owner", role: "member" as const, roomId: "room-a", leftAt: null };
const member = { id: "member", role: "member" as const, roomId: "room-a", leftAt: null };
const host = { id: "host", role: "host" as const, roomId: "room-a", leftAt: null };

describe("media queue authorization policy", () => {
  it("allows only the item owner to control an item", () => {
    expect(canControlQueueItem(owner, "owner")).toBe(true);
    expect(canControlQueueItem(member, "owner")).toBe(false);
  });
  it("allows the verified host to moderate any item without impersonating its owner", () => {
    expect(canControlQueueItem(host, "owner")).toBe(true);
    expect(canRemoveQueueItem(host, "owner")).toBe(true);
    expect(host.id).not.toBe("owner");
  });
  it("rejects a participant from another room", () => {
    expect(isActiveRoomParticipant({ ...owner, roomId: "room-b" }, "room-a")).toBe(false);
  });
  it("rejects a participant who has left", () => {
    expect(isActiveRoomParticipant({ ...owner, leftAt: new Date() }, "room-a")).toBe(false);
  });
  it("accepts an active participant in the matching room", () => {
    expect(isActiveRoomParticipant(owner, "room-a")).toBe(true);
  });
});
