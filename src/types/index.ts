export type RoomCapacity = 2 | 3 | 4 | 6;

export type RoomStatus = "active" | "locked" | "ended";

export type ParticipantRole = "host" | "member";

export interface RoomSettings {
  allowScreenShare: boolean;
  allowChat: boolean;
}

export interface RoomModel {
  id: string;
  roomCode: string;
  title: string;
  capacity: RoomCapacity;
  status: RoomStatus;
  hostParticipantId: string | null;
  roomPasswordHash: string | null;
  createdAt: Date;
  expiresAt: Date;
  settings: RoomSettings;
}

export interface ParticipantModel {
  id: string;
  roomId: string;
  displayName: string;
  avatar: string;
  role: ParticipantRole;
  sessionSecretHash: string;
  joinedAt: Date;
  lastSeenAt: Date;
  leftAt: Date | null;
  canScreenShare: boolean;
  isMutedByHost: boolean;
}

export interface PublicParticipant {
  id: string;
  displayName: string;
  avatar: string;
  role: ParticipantRole;
  joinedAt: string;
  canScreenShare: boolean;
  isMutedByHost: boolean;
}

export interface PublicRoomInfo {
  id: string;
  roomCode: string;
  title: string;
  capacity: RoomCapacity;
  status: RoomStatus;
  hostName: string;
  participantCount: number;
  hasPassword: boolean;
  participants: PublicParticipant[];
}

// Client Session Token saved in localStorage or cookie
export interface ClientSession {
  roomId: string;
  roomCode: string;
  participantId: string;
  sessionSecret: string;
  displayName: string;
  avatar: string;
  role: ParticipantRole;
}

// LiveKit Realtime Data Packets
export interface ChatMessagePacket {
  type: "chat";
  id: string;
  senderId: string;
  senderName: string;
  avatar: string;
  text: string;
  timestamp: number;
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
}

export interface ReactionPacket {
  type: "reaction";
  id: string;
  senderId: string;
  senderName: string;
  emoji: string;
  timestamp: number;
}

export interface TypingPacket {
  type: "typing";
  senderId: string;
  senderName: string;
  isTyping: boolean;
}

export interface HandRaisePacket {
  type: "hand_raise";
  senderId: string;
  senderName: string;
  isRaised: boolean;
}

export interface HostCommandPacket {
  type: "host_command";
  action: "kick" | "mute" | "lock_state" | "room_ended" | "host_transferred";
  targetParticipantId?: string;
  payload?: any;
}

export type LiveKitDataPacket =
  | ChatMessagePacket
  | ReactionPacket
  | TypingPacket
  | HandRaisePacket
  | HostCommandPacket;

export interface NetworkTelemetryPacket {
  type: "network_telemetry";
  version: 1;
  rttMs: number | null;
  sentAt: number;
}

export type ScreenShareQualityMode = "auto" | "high" | "high60" | "balanced" | "saver";

export type ConnectionQualityStatus = "excellent" | "good" | "moderate" | "poor" | "lost" | "unknown";

export interface OverlayChatConfig {
  enabled: boolean;
  opacity: number; // 0.2 to 1.0
  position: "bottom-left" | "bottom-right" | "top-left" | "top-right";
  fadeOutSeconds: number; // 3 to 15
  hideOwnMessages: boolean;
}

// Watch Party — Media Queue & Playback Sync
export interface MediaQueueItem {
  id: string;
  type: "youtube" | "file" | "url";
  title: string;
  src: string;
  addedBy: string;
  addedByName: string;
}

export interface PlaybackSyncPacket {
  type: "playback_sync";
  action: "play" | "pause" | "seek" | "next" | "queue_update";
  currentTime?: number;
  itemId?: string;
  queue?: MediaQueueItem[];
  currentIndex?: number;
}

