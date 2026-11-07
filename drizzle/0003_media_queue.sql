CREATE TABLE IF NOT EXISTS "media_queue_items" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "room_code" varchar(32) NOT NULL,
  "source_type" varchar(16) NOT NULL,
  "source_url" varchar(2048) NOT NULL,
  "title" varchar(200) NOT NULL,
  "owner_participant_id" varchar(64) NOT NULL REFERENCES "participants"("id") ON DELETE cascade,
  "position" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_queue_room_position_idx" ON "media_queue_items" USING btree ("room_code", "position");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "media_queue_room_item_idx" ON "media_queue_items" USING btree ("room_code", "id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media_playback_states" (
  "room_code" varchar(32) PRIMARY KEY NOT NULL,
  "current_item_id" varchar(64),
  "playback_state" varchar(16) DEFAULT 'paused' NOT NULL,
  "position_seconds" double precision DEFAULT 0 NOT NULL,
  "playback_started_at" timestamp with time zone,
  "playback_rate" double precision DEFAULT 1 NOT NULL,
  "version" integer DEFAULT 0 NOT NULL,
  "updated_by" varchar(64) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_playback_current_idx" ON "media_playback_states" USING btree ("current_item_id");
