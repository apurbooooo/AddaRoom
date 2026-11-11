import type { SoundCategory, SoundEffect, VibrationCategory } from "@/lib/sound-effects";

export const ROOM_NOTIFICATION_DURATION_MS = 5000;
export const ROOM_EVENT_NOTIFICATION_DURATION_MS = 4000;
export const MAX_VISIBLE_ROOM_NOTIFICATIONS = 3;

export type RoomNotificationType =
  | "chat"
  | "reaction"
  | "hand_raise"
  | "hand_lower"
  | "microphone_on"
  | "microphone_off"
  | "camera_on"
  | "camera_off"
  | "join"
  | "leave"
  | "screen_share_on"
  | "screen_share_off"
  | "room_lock"
  | "room_unlock"
  | "host_mute"
  | "host_unmute"
  | "host_remove"
  | "host_transfer"
  | "room_setting"
  | "queue_add"
  | "queue_remove"
  | "playback_start"
  | "playback_pause"
  | "playback_end"
  | "invite_copied"
  | "local_setting"
  | "error";

export type NotificationScope = "local" | "remote" | "room";

export interface RoomEventNotice {
  id: string;
  type: RoomNotificationType;
  scope: NotificationScope;
  participantId?: string;
  senderName: string;
  avatar: string;
  text: string;
  sound?: SoundEffect;
  soundCategory?: SoundCategory;
  vibrationCategory?: VibrationCategory;
  vibrationPattern?: number | number[];
  durationMs?: number;
}

export interface RoomNotification extends RoomEventNotice {
  timestamp: number;
  expiresAt: number;
}

export function getRoomNotificationExpiry(now = Date.now(), duration = ROOM_NOTIFICATION_DURATION_MS): number {
  return now + duration;
}

export function createRoomNotification(event: RoomEventNotice, now = Date.now()): RoomNotification {
  const duration = event.durationMs ?? (event.type === "chat" ? ROOM_NOTIFICATION_DURATION_MS : ROOM_EVENT_NOTIFICATION_DURATION_MS);
  return { ...event, timestamp: now, expiresAt: getRoomNotificationExpiry(now, duration) };
}

export function acceptRoomNotificationEvent(eventId: string, seenIds: Set<string>, maxSeen = 600): boolean {
  if (!eventId || seenIds.has(eventId)) return false;
  seenIds.add(eventId);
  if (seenIds.size > maxSeen) {
    const oldest = seenIds.values().next().value;
    if (oldest) seenIds.delete(oldest);
  }
  return true;
}

export function capRoomNotifications(notifications: RoomNotification[]): RoomNotification[] {
  return notifications.slice(-MAX_VISIBLE_ROOM_NOTIFICATIONS);
}
