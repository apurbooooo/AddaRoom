import { describe, expect, it } from "vitest";
import { acceptRoomNotificationEvent, capRoomNotifications, createRoomNotification, getRoomNotificationExpiry, ROOM_EVENT_NOTIFICATION_DURATION_MS, ROOM_NOTIFICATION_DURATION_MS } from "@/lib/room-notifications";

const notification = (id: string, type: "chat" | "join", timestamp: number) => createRoomNotification({
  id,
  type,
  scope: "room",
  senderName: "sender",
  avatar: "persona-male-pfp",
  text: id,
}, timestamp);

describe("room notification timing and stack", () => {
  it("expires every notification exactly five seconds after it is created", () => {
    expect(getRoomNotificationExpiry(1000)).toBe(1000 + ROOM_NOTIFICATION_DURATION_MS);
    expect(ROOM_NOTIFICATION_DURATION_MS).toBe(5000);
    expect(createRoomNotification({ id: "chat-1", type: "chat", scope: "remote", senderName: "A", avatar: "x", text: "hello" }, 1000).expiresAt).toBe(6000);
    expect(createRoomNotification({ id: "join-1", type: "join", scope: "room", senderName: "A", avatar: "x", text: "joined" }, 1000).expiresAt).toBe(1000 + ROOM_EVENT_NOTIFICATION_DURATION_MS);
  });

  it("keeps the newest three notifications without resetting their timestamps", () => {
    const notifications = [1, 2, 3, 4].map((id) => notification(String(id), "chat", id * 1000));
    expect(capRoomNotifications(notifications).map((notification) => notification.id)).toEqual(["2", "3", "4"]);
    expect(capRoomNotifications(notifications)[0].expiresAt).toBe(7000);
  });

  it("deduplicates notification event IDs and bounds the retained event history", () => {
    const seen = new Set<string>();
    expect(acceptRoomNotificationEvent("event-1", seen, 2)).toBe(true);
    expect(acceptRoomNotificationEvent("event-1", seen, 2)).toBe(false);
    acceptRoomNotificationEvent("event-2", seen, 2);
    acceptRoomNotificationEvent("event-3", seen, 2);
    expect(seen.size).toBe(2);
    expect(seen.has("event-1")).toBe(false);
  });

  it.each([
    "chat", "reaction", "hand_raise", "hand_lower", "microphone_on", "microphone_off",
    "camera_on", "camera_off", "join", "leave", "screen_share_on", "screen_share_off",
    "room_lock", "room_unlock", "host_mute", "host_unmute", "host_remove", "host_transfer",
    "room_setting", "queue_add", "queue_remove", "playback_start", "playback_pause",
    "playback_end", "invite_copied", "local_setting", "error",
  ] as const)("preserves the %s event identity, display data, and notification scope", (type) => {
    const event = {
      id: `${type}:event-1`,
      type,
      scope: "room" as const,
      participantId: "participant-1",
      senderName: "A participant",
      avatar: "persona-male-pfp",
      text: "Room activity",
    };
    const notification = createRoomNotification(event, 2000);
    expect(notification).toMatchObject(event);
    expect(notification.timestamp).toBe(2000);
    expect(notification.expiresAt).toBe(2000 + (type === "chat" ? ROOM_NOTIFICATION_DURATION_MS : ROOM_EVENT_NOTIFICATION_DURATION_MS));
  });
});
