CREATE TABLE "participants" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"room_id" varchar(64) NOT NULL,
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
--> statement-breakpoint
CREATE TABLE "rate_limit_buckets" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"hit_count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"room_id" varchar(64) NOT NULL,
	"participant_id" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"room_code" varchar(32) NOT NULL,
	"title" varchar(120) NOT NULL,
	"capacity" integer DEFAULT 6 NOT NULL,
	"status" varchar(24) DEFAULT 'active' NOT NULL,
	"host_participant_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"settings" jsonb DEFAULT '{"allowScreenShare":true,"allowChat":true}'::jsonb,
	CONSTRAINT "rooms_room_code_unique" UNIQUE("room_code")
);
--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_sessions" ADD CONSTRAINT "room_sessions_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_sessions" ADD CONSTRAINT "room_sessions_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "participants_room_id_idx" ON "participants" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "participants_left_at_idx" ON "participants" USING btree ("left_at");--> statement-breakpoint
CREATE INDEX "rate_limit_window_idx" ON "rate_limit_buckets" USING btree ("window_started_at");--> statement-breakpoint
CREATE INDEX "sessions_participant_idx" ON "room_sessions" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "rooms_code_idx" ON "rooms" USING btree ("room_code");--> statement-breakpoint
CREATE INDEX "rooms_status_idx" ON "rooms" USING btree ("status");