import { z } from "zod";
import { AVATAR_CATALOG, DEFAULT_AVATAR_ID } from "@/lib/avatar-catalog";

const avatarIds = new Set(AVATAR_CATALOG.map((avatar) => avatar.id));
const legacyAvatarIds = new Set(["👑", "👋"]);

/**
 * Accept the legacy emoji values that may still be submitted by older clients,
 * but persist a catalog ID so new room data has one consistent representation.
 */
const avatarSchema = z.string().trim().refine(
  (value) => avatarIds.has(value) || legacyAvatarIds.has(value),
  "Choose an avatar from the gallery",
).transform((value) => legacyAvatarIds.has(value) ? DEFAULT_AVATAR_ID : value);

export const createRoomSchema = z.object({
  title: z.string().trim().min(2, "Room title must be at least 2 characters").max(60, "Room title too long"),
  capacity: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(6)]),
  hostName: z.string().trim().min(1, "Name must be at least 1 character").max(30, "Name too long"),
  avatar: avatarSchema.optional().default(DEFAULT_AVATAR_ID),
});

export const joinRoomSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required").max(30, "Display name too long"),
  avatar: avatarSchema.optional().default(DEFAULT_AVATAR_ID),
});

export const sessionAuthSchema = z.object({
  participantId: z.string().min(1),
  sessionSecret: z.string().min(1),
});

export const lockRoomSchema = sessionAuthSchema.extend({
  locked: z.boolean(),
});

export const updateTitleSchema = sessionAuthSchema.extend({
  title: z.string().trim().min(2).max(60),
});

export const moderateRoomSchema = sessionAuthSchema.extend({
  action: z.enum(["kick", "mute", "transfer_host", "toggle_screen_share"]),
  targetParticipantId: z.string().min(1),
  canScreenShare: z.boolean().optional(),
  muted: z.boolean().optional(),
}).refine((data) => data.action !== "mute" || typeof data.muted === "boolean", {
  message: "Mute action requires an explicit muted value",
  path: ["muted"],
});

export const setRoomPasswordSchema = sessionAuthSchema.extend({
  password: z.string().max(50).optional(), // undefined / empty string = remove password
});

export const joinRoomWithPasswordSchema = joinRoomSchema.extend({
  password: z.string().max(50).optional(),
});
