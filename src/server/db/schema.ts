import { pgTable, varchar, integer, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";

export const rooms = pgTable("rooms", {
  id: varchar("id", { length: 64 }).primaryKey(),
  roomCode: varchar("room_code", { length: 32 }).notNull().unique(),
  title: varchar("title", { length: 120 }).notNull(),
  capacity: integer("capacity").notNull().default(6),
  status: varchar("status", { length: 24 }).notNull().default("active"), // 'active' | 'locked' | 'ended'
  hostParticipantId: varchar("host_participant_id", { length: 64 }),
  roomPasswordHash: varchar("room_password_hash", { length: 128 }), // nullable — set when host locks with password
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  settings: jsonb("settings").$type<{
    allowScreenShare: boolean;
    allowChat: boolean;
  }>().default({ allowScreenShare: true, allowChat: true }),
}, (table) => [
  index("rooms_code_idx").on(table.roomCode),
  index("rooms_status_idx").on(table.status),
]);

export const participants = pgTable("participants", {
  id: varchar("id", { length: 64 }).primaryKey(),
  roomId: varchar("room_id", { length: 64 }).notNull().references(() => rooms.id, { onDelete: "cascade" }),
  displayName: varchar("display_name", { length: 50 }).notNull(),
  avatar: varchar("avatar", { length: 16 }).notNull().default("👋"),
  role: varchar("role", { length: 24 }).notNull().default("member"), // 'host' | 'member'
  sessionSecretHash: varchar("session_secret_hash", { length: 128 }).notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  leftAt: timestamp("left_at", { withTimezone: true }),
  canScreenShare: boolean("can_screen_share").notNull().default(true),
  isMutedByHost: boolean("is_muted_by_host").notNull().default(false),
}, (table) => [
  index("participants_room_id_idx").on(table.roomId),
  index("participants_left_at_idx").on(table.leftAt),
]);

export const roomSessions = pgTable("room_sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  roomId: varchar("room_id", { length: 64 }).notNull().references(() => rooms.id, { onDelete: "cascade" }),
  participantId: varchar("participant_id", { length: 64 }).notNull().references(() => participants.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("sessions_participant_idx").on(table.participantId),
]);

export const rateLimitBuckets = pgTable("rate_limit_buckets", {
  key: varchar("key", { length: 64 }).primaryKey(),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
  hitCount: integer("hit_count").notNull(),
}, (table) => [index("rate_limit_window_idx").on(table.windowStartedAt)]);

