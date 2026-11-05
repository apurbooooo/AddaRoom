import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, isNull, sql } from "drizzle-orm";
import { rooms, participants, roomSessions } from "./schema";
import {
  IRoomStore,
  CreateRoomInput,
  JoinRoomInput,
  JoinRoomResult,
  RoomFullError,
  RoomLockedError,
  RoomEndedError,
} from "./room-store";
import { RoomModel, ParticipantModel, RoomCapacity, RoomStatus } from "@/types";
import { generateSecureId, hashSessionSecret, verifySessionSecret } from "@/lib/crypto";

export class PostgresRoomStore implements IRoomStore {
  private db: ReturnType<typeof drizzle>;
  private client: postgres.Sql;

  constructor(databaseUrl: string) {
    this.client = postgres(databaseUrl, { max: 10, idle_timeout: 20 });
    this.db = drizzle(this.client, { schema: { rooms, participants, roomSessions } });
  }

  async createRoom(input: CreateRoomInput): Promise<{ room: RoomModel; hostParticipant: ParticipantModel }> {
    const roomId = generateSecureId("rm");
    const hostId = generateSecureId("part");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const [insertedRoom] = await this.db.insert(rooms).values({
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
    }).returning();

    const [insertedHost] = await this.db.insert(participants).values({
      id: hostId,
      roomId: roomId,
      displayName: input.hostName.trim(),
      avatar: input.hostAvatar || "👑",
      role: "host",
      sessionSecretHash: hashSessionSecret(input.sessionSecret),
      joinedAt: now,
      lastSeenAt: now,
      canScreenShare: true,
      isMutedByHost: false,
    }).returning();

    return {
      room: this.mapRoom(insertedRoom),
      hostParticipant: this.mapParticipant(insertedHost),
    };
  }

  async getRoomByCode(roomCode: string): Promise<RoomModel | null> {
    const [row] = await this.db
      .select()
      .from(rooms)
      .where(eq(rooms.roomCode, roomCode.toLowerCase().trim()))
      .limit(1);

    return row ? this.mapRoom(row) : null;
  }

  async getRoomById(roomId: string): Promise<RoomModel | null> {
    const [row] = await this.db
      .select()
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .limit(1);

    return row ? this.mapRoom(row) : null;
  }

  async getActiveParticipants(roomId: string): Promise<ParticipantModel[]> {
    const rows = await this.db
      .select()
      .from(participants)
      .where(and(eq(participants.roomId, roomId), isNull(participants.leftAt)));

    return rows.map((r) => this.mapParticipant(r));
  }

  async getParticipantById(participantId: string): Promise<ParticipantModel | null> {
    const [row] = await this.db
      .select()
      .from(participants)
      .where(eq(participants.id, participantId))
      .limit(1);

    return row ? this.mapParticipant(row) : null;
  }

  async joinRoom(roomId: string, input: JoinRoomInput): Promise<JoinRoomResult> {
    // Execute inside a database transaction with row-level lock on the room to prevent race conditions
    return await this.db.transaction(async (tx) => {
      // Lock room record FOR UPDATE
      const [room] = await tx
        .select()
        .from(rooms)
        .where(eq(rooms.id, roomId))
        .for("update");

      if (!room) {
        throw new Error("Room not found");
      }
      if (room.status === "ended") {
        throw new RoomEndedError();
      }
      if (room.status === "locked") {
        throw new RoomLockedError();
      }

      // Count active participants
      const [countResult] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(participants)
        .where(and(eq(participants.roomId, roomId), isNull(participants.leftAt)));

      if (countResult.count >= room.capacity) {
        throw new RoomFullError(`Room has reached maximum capacity of ${room.capacity}`);
      }

      const participantId = generateSecureId("part");
      const now = new Date();

      const [insertedParticipant] = await tx
        .insert(participants)
        .values({
          id: participantId,
          roomId: roomId,
          displayName: input.displayName.trim(),
          avatar: input.avatar || "👋",
          role: "member",
          sessionSecretHash: hashSessionSecret(input.sessionSecret),
          joinedAt: now,
          lastSeenAt: now,
          canScreenShare: true,
          isMutedByHost: false,
        })
        .returning();

      return {
        room: this.mapRoom(room),
        participant: this.mapParticipant(insertedParticipant),
      };
    });
  }

  async verifyParticipantSession(
    roomId: string,
    participantId: string,
    sessionSecret: string
  ): Promise<ParticipantModel | null> {
    const [row] = await this.db
      .select()
      .from(participants)
      .where(and(eq(participants.id, participantId), eq(participants.roomId, roomId), isNull(participants.leftAt)))
      .limit(1);

    if (!row) return null;

    const valid = verifySessionSecret(sessionSecret, row.sessionSecretHash);
    if (!valid) return null;

    const now = new Date();
    await this.db.update(participants).set({ lastSeenAt: now }).where(eq(participants.id, participantId));
    return this.mapParticipant({ ...row, lastSeenAt: now });
  }

  async leaveRoom(participantId: string): Promise<void> {
    const now = new Date();
    await this.db
      .update(participants)
      .set({ leftAt: now })
      .where(eq(participants.id, participantId));
  }

  async endRoom(roomId: string): Promise<void> {
    const now = new Date();
    await this.db.transaction(async (tx) => {
      await tx.update(rooms).set({ status: "ended" }).where(eq(rooms.id, roomId));
      await tx.update(participants).set({ leftAt: now }).where(and(eq(participants.roomId, roomId), isNull(participants.leftAt)));
    });
  }

  async updateRoomLock(roomId: string, locked: boolean): Promise<RoomModel> {
    const [updated] = await this.db
      .update(rooms)
      .set({ status: locked ? "locked" : "active" })
      .where(eq(rooms.id, roomId))
      .returning();

    if (!updated) throw new Error("Room not found");
    return this.mapRoom(updated);
  }

  async updateRoomTitle(roomId: string, title: string): Promise<RoomModel> {
    const [updated] = await this.db
      .update(rooms)
      .set({ title: title.trim() })
      .where(eq(rooms.id, roomId))
      .returning();

    if (!updated) throw new Error("Room not found");
    return this.mapRoom(updated);
  }

  async transferHost(roomId: string, newHostParticipantId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [room] = await tx.select().from(rooms).where(eq(rooms.id, roomId)).for("update");
      if (!room) throw new Error("Room not found");

      if (room.hostParticipantId) {
        await tx.update(participants).set({ role: "member" }).where(eq(participants.id, room.hostParticipantId));
      }
      await tx.update(participants).set({ role: "host" }).where(eq(participants.id, newHostParticipantId));
      await tx.update(rooms).set({ hostParticipantId: newHostParticipantId }).where(eq(rooms.id, roomId));
    });
  }

  async kickParticipant(participantId: string): Promise<void> {
    const now = new Date();
    await this.db.update(participants).set({ leftAt: now }).where(eq(participants.id, participantId));
  }

  async updateParticipantPermissions(
    participantId: string,
    permissions: { canScreenShare?: boolean; isMutedByHost?: boolean }
  ): Promise<ParticipantModel> {
    const updateData: Partial<typeof participants.$inferInsert> = {};
    if (typeof permissions.canScreenShare === "boolean") {
      updateData.canScreenShare = permissions.canScreenShare;
    }
    if (typeof permissions.isMutedByHost === "boolean") {
      updateData.isMutedByHost = permissions.isMutedByHost;
    }

    const [updated] = await this.db
      .update(participants)
      .set(updateData)
      .where(eq(participants.id, participantId))
      .returning();

    if (!updated) throw new Error("Participant not found");
    return this.mapParticipant(updated);
  }

  private mapRoom(r: typeof rooms.$inferSelect): RoomModel {
    return {
      id: r.id,
      roomCode: r.roomCode,
      title: r.title,
      capacity: r.capacity as RoomCapacity,
      status: r.status as RoomStatus,
      hostParticipantId: r.hostParticipantId,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
      settings: r.settings || { allowScreenShare: true, allowChat: true },
    };
  }

  private mapParticipant(p: typeof participants.$inferSelect): ParticipantModel {
    return {
      id: p.id,
      roomId: p.roomId,
      displayName: p.displayName,
      avatar: p.avatar,
      role: p.role as any,
      sessionSecretHash: p.sessionSecretHash,
      joinedAt: p.joinedAt,
      lastSeenAt: p.lastSeenAt,
      leftAt: p.leftAt,
      canScreenShare: p.canScreenShare,
      isMutedByHost: p.isMutedByHost,
    };
  }
}
