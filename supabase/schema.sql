-- ==============================================================================
-- AddaRoom — Supabase / PostgreSQL Initial Schema
-- Run this in the Supabase Dashboard -> SQL Editor (or via psql)
-- ==============================================================================

-- 1. Rooms Table
CREATE TABLE IF NOT EXISTS "rooms" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"room_code" varchar(32) NOT NULL UNIQUE,
	"title" varchar(120) NOT NULL,
	"capacity" integer DEFAULT 6 NOT NULL,
	"status" varchar(24) DEFAULT 'active' NOT NULL,
	"host_participant_id" varchar(64),
	"room_password_hash" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"settings" jsonb DEFAULT '{"allowScreenShare":true,"allowChat":true}'::jsonb
);

-- 2. Participants Table
CREATE TABLE IF NOT EXISTS "participants" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"room_id" varchar(64) NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE,
	"display_name" varchar(50) NOT NULL,
	"avatar" varchar(16) DEFAULT '👋' NOT NULL,
	"role" varchar(24) DEFAULT 'member' NOT NULL,
	"session_secret_hash" varchar(128) NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	"can_screen_share" boolean DEFAULT true NOT NULL,
	"is_muted_by_host" boolean DEFAULT false NOT NULL
);

-- 3. Room Sessions Table
CREATE TABLE IF NOT EXISTS "room_sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"room_id" varchar(64) NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE,
	"participant_id" varchar(64) NOT NULL REFERENCES "participants"("id") ON DELETE CASCADE,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. Rate Limiting Buckets Table
CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"hit_count" integer NOT NULL
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS "rooms_code_idx" ON "rooms"("room_code");
CREATE INDEX IF NOT EXISTS "rooms_status_idx" ON "rooms"("status");
CREATE INDEX IF NOT EXISTS "participants_room_id_idx" ON "participants"("room_id");
CREATE INDEX IF NOT EXISTS "participants_left_at_idx" ON "participants"("left_at");
CREATE INDEX IF NOT EXISTS "sessions_participant_idx" ON "room_sessions"("participant_id");
CREATE INDEX IF NOT EXISTS "rate_limit_window_idx" ON "rate_limit_buckets"("window_started_at");
