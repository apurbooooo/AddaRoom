import type { RoomNotification } from "@/components/room/room-notification-toast";

export const ROOM_NOTIFICATION_DURATION_MS = 5000;
export const MAX_VISIBLE_ROOM_NOTIFICATIONS = 3;

export function getRoomNotificationExpiry(now = Date.now()): number {
  return now + ROOM_NOTIFICATION_DURATION_MS;
}

export function capRoomNotifications(notifications: RoomNotification[]): RoomNotification[] {
  return notifications.slice(-MAX_VISIBLE_ROOM_NOTIFICATIONS);
}
