import { z } from "zod";

export const createRoomSchema = z.object({
  title: z.string().trim().min(2, "Room title must be at least 2 characters").max(60, "Room title too long"),
  capacity: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(6)]),
  hostName: z.string().trim().min(1, "Name must be at least 1 character").max(30, "Name too long"),
  avatar: z.string().max(8).optional().default("👑"),
});

export const joinRoomSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required").max(30, "Display name too long"),
  avatar: z.string().max(8).optional().default("👋"),
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
});
