import { describe, expect, it } from "vitest";
import { capRoomNotifications, getRoomNotificationExpiry, ROOM_NOTIFICATION_DURATION_MS } from "@/lib/room-notifications";

describe("room notification timing and stack", () => {
  it("expires every notification exactly five seconds after it is created", () => {
    expect(getRoomNotificationExpiry(1000)).toBe(1000 + ROOM_NOTIFICATION_DURATION_MS);
    expect(ROOM_NOTIFICATION_DURATION_MS).toBe(5000);
  });

  it("keeps the newest three notifications without resetting their timestamps", () => {
    const notifications = [1, 2, 3, 4].map((id) => ({ id: String(id), kind: "chat" as const, senderName: "sender", avatar: "avatar", text: String(id), expiresAt: id * 1000 }));
    expect(capRoomNotifications(notifications).map((notification) => notification.id)).toEqual(["2", "3", "4"]);
    expect(capRoomNotifications(notifications)[0].expiresAt).toBe(2000);
  });
});
