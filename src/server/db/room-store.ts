import {
  RoomModel,
  ParticipantModel,
  RoomCapacity,
  RoomStatus,
  ParticipantRole,
} from "@/types";
import { generateSecureId, hashSessionSecret, verifySessionSecret } from "@/lib/crypto";

export interface CreateRoomInput {
  roomCode: string;
  title: string;
  capacity: RoomCapacity;
  hostName: string;
  hostAvatar?: string;
  sessionSecret: string;
}

export interface JoinRoomInput {
  displayName: string;
  avatar?: string;
  sessionSecret: string;
}

export interface JoinRoomResult {
  room: RoomModel;
  participant: ParticipantModel;
}

export interface IRoomStore {
  consumeRateLimit(key: string, limit: number, windowMs: number): Promise<boolean>;
  createRoom(input: CreateRoomInput): Promise<{ room: RoomModel; hostParticipant: ParticipantModel }>;
  getRoomByCode(roomCode: string): Promise<RoomModel | null>;
  getRoomById(roomId: string): Promise<RoomModel | null>;
  getActiveParticipants(roomId: string): Promise<ParticipantModel[]>;
  getParticipantById(participantId: string): Promise<ParticipantModel | null>;
  joinRoom(roomId: string, input: JoinRoomInput): Promise<JoinRoomResult>;
  verifyParticipantSession(roomId: string, participantId: string, sessionSecret: string): Promise<ParticipantModel | null>;
  leaveRoom(participantId: string): Promise<void>;
  endRoom(roomId: string): Promise<void>;
  updateRoomLock(roomId: string, locked: boolean): Promise<RoomModel>;
  updateRoomTitle(roomId: string, title: string): Promise<RoomModel>;
  transferHost(roomId: string, newHostParticipantId: string): Promise<void>;
  kickParticipant(participantId: string): Promise<void>;
  updateParticipantPermissions(
    participantId: string,
    permissions: { canScreenShare?: boolean; isMutedByHost?: boolean }
  ): Promise<ParticipantModel>;
}

export class RoomFullError extends Error {
  constructor(message = "Room is at maximum capacity") {
    super(message);
    this.name = "RoomFullError";
  }
}

export class RoomLockedError extends Error {
  constructor(message = "Room is locked by the host") {
    super(message);
    this.name = "RoomLockedError";
  }
}

export class RoomEndedError extends Error {
  constructor(message = "Room has ended") {
    super(message);
    this.name = "RoomEndedError";
  }
}

export class UnauthorizedHostError extends Error {
  constructor(message = "Only the room host can perform this action") {
    super(message);
    this.name = "UnauthorizedHostError";
  }
}

/**
 * MemoryRoomStore: High performance in-memory store for development, testing,
 * and zero-dependency environments.
 */
export class MemoryRoomStore implements IRoomStore {
  private rooms: Map<string, RoomModel> = new Map();
  private participants: Map<string, ParticipantModel> = new Map();
  private rateLimitBuckets = new Map<string, { startedAt: number; hits: number }>();
  private rateLimitOperations = 0;

  async consumeRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    if (++this.rateLimitOperations % 128 === 0) {
      for (const [bucketKey, value] of this.rateLimitBuckets) {
        if (now - value.startedAt >= windowMs) this.rateLimitBuckets.delete(bucketKey);
      }
    }
    const bucket = this.rateLimitBuckets.get(key);
    if (!bucket || now - bucket.startedAt >= windowMs) {
      this.rateLimitBuckets.set(key, { startedAt: now, hits: 1 });
      return true;
    }
    bucket.hits++;
    return bucket.hits <= limit;
  }

  async createRoom(input: CreateRoomInput): Promise<{ room: RoomModel; hostParticipant: ParticipantModel }> {
    const roomId = generateSecureId("rm");
    const hostId = generateSecureId("part");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const room: RoomModel = {
      id: roomId,
      roomCode: input.roomCode.toLowerCase().trim(),
      title: input.title.trim(),
      capacity: input.capacity,
      status: "active",
      hostParticipantId: hostId,
      createdAt: now,
      expiresAt: expiresAt,
      settings: {
        allowScreenShare: true,
        allowChat: true,
      },
    };

    const hostParticipant: ParticipantModel = {
      id: hostId,
      roomId: roomId,
      displayName: input.hostName.trim(),
      avatar: input.hostAvatar || "👑",
      role: "host",
      sessionSecretHash: hashSessionSecret(input.sessionSecret),
      joinedAt: now,
      lastSeenAt: now,
      leftAt: null,
      canScreenShare: true,
      isMutedByHost: false,
    };

    this.rooms.set(room.id, room);
    this.participants.set(hostParticipant.id, hostParticipant);

    return { room, hostParticipant };
  }

  async getRoomByCode(roomCode: string): Promise<RoomModel | null> {
    const normalized = roomCode.toLowerCase().trim();
    for (const r of this.rooms.values()) {
      if (r.roomCode === normalized) {
        return { ...r };
      }
    }
    return null;
  }

  async getRoomById(roomId: string): Promise<RoomModel | null> {
    const r = this.rooms.get(roomId);
    return r ? { ...r } : null;
  }

  async getActiveParticipants(roomId: string): Promise<ParticipantModel[]> {
    const list: ParticipantModel[] = [];
    for (const p of this.participants.values()) {
      if (p.roomId === roomId && p.leftAt === null) {
        list.push({ ...p });
      }
    }
    return list;
  }

  async getParticipantById(participantId: string): Promise<ParticipantModel | null> {
    const p = this.participants.get(participantId);
    return p ? { ...p } : null;
  }

  async joinRoom(roomId: string, input: JoinRoomInput): Promise<JoinRoomResult> {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error("Room not found");
    }
    if (room.status === "ended") {
      throw new RoomEndedError();
    }
    if (room.expiresAt.getTime() <= Date.now()) {
      room.status = "ended";
      throw new RoomEndedError("Room has expired");
    }
    if (room.status === "locked") {
      throw new RoomLockedError();
    }

    // Keep the check and insert in one synchronous turn so concurrent joins
    // cannot both observe the same free slot in this process-local store.
    let activeCount = 0;
    for (const participant of this.participants.values()) {
      if (participant.roomId === roomId && participant.leftAt === null) activeCount++;
    }
    if (activeCount >= room.capacity) {
      throw new RoomFullError(`Room has reached maximum capacity of ${room.capacity}`);
    }

    const now = new Date();
    const participantId = generateSecureId("part");

    const participant: ParticipantModel = {
      id: participantId,
      roomId: roomId,
      displayName: input.displayName.trim(),
      avatar: input.avatar || "👋",
      role: "member",
      sessionSecretHash: hashSessionSecret(input.sessionSecret),
      joinedAt: now,
      lastSeenAt: now,
      leftAt: null,
      canScreenShare: true,
      isMutedByHost: false,
    };

    this.participants.set(participantId, participant);
    return { room: { ...room }, participant: { ...participant } };
  }

  async verifyParticipantSession(
    roomId: string,
    participantId: string,
    sessionSecret: string
  ): Promise<ParticipantModel | null> {
    const p = this.participants.get(participantId);
    if (!p || p.roomId !== roomId || p.leftAt !== null) {
      return null;
    }

    const room = this.rooms.get(roomId);
    if (!room || room.status === "ended" || room.expiresAt.getTime() <= Date.now()) return null;

    const valid = verifySessionSecret(sessionSecret, p.sessionSecretHash);
    if (!valid) {
      return null;
    }

    p.lastSeenAt = new Date();
    return { ...p };
  }

  async leaveRoom(participantId: string): Promise<void> {
    const p = this.participants.get(participantId);
    if (!p) return;
    p.leftAt = new Date();

    // If host leaves, can auto-promote oldest active participant
    const room = this.rooms.get(p.roomId);
    if (room && room.hostParticipantId === participantId && room.status === "active") {
      const remaining = await this.getActiveParticipants(room.id);
      if (remaining.length > 0) {
        // Promote next participant to host
        remaining.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
        const nextHost = this.participants.get(remaining[0].id);
        if (nextHost) {
          nextHost.role = "host";
          room.hostParticipantId = nextHost.id;
        }
      }
    }
  }

  async endRoom(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.status = "ended";
    // Mark all active participants as left
    for (const p of this.participants.values()) {
      if (p.roomId === roomId && p.leftAt === null) {
        p.leftAt = new Date();
      }
    }
  }

  async updateRoomLock(roomId: string, locked: boolean): Promise<RoomModel> {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error("Room not found");
    room.status = locked ? "locked" : "active";
    return { ...room };
  }

  async updateRoomTitle(roomId: string, title: string): Promise<RoomModel> {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error("Room not found");
    room.title = title.trim();
    return { ...room };
  }

  async transferHost(roomId: string, newHostParticipantId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error("Room not found");

    const target = this.participants.get(newHostParticipantId);
    if (!target || target.roomId !== roomId || target.leftAt !== null) {
      throw new Error("Target participant not active in room");
    }

    // Demote current host
    if (room.hostParticipantId) {
      const oldHost = this.participants.get(room.hostParticipantId);
      if (oldHost) {
        oldHost.role = "member";
      }
    }

    // Promote new host
    target.role = "host";
    room.hostParticipantId = newHostParticipantId;
  }

  async kickParticipant(participantId: string): Promise<void> {
    const p = this.participants.get(participantId);
    if (!p) return;
    p.leftAt = new Date();
  }

  async updateParticipantPermissions(
    participantId: string,
    permissions: { canScreenShare?: boolean; isMutedByHost?: boolean }
  ): Promise<ParticipantModel> {
    const p = this.participants.get(participantId);
    if (!p) throw new Error("Participant not found");
    if (typeof permissions.canScreenShare === "boolean") {
      p.canScreenShare = permissions.canScreenShare;
    }
    if (typeof permissions.isMutedByHost === "boolean") {
      p.isMutedByHost = permissions.isMutedByHost;
    }
    return { ...p };
  }
}

