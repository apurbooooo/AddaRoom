export interface QueueActor { id: string; role: "host" | "member"; roomId: string; leftAt: Date | null; }

export function canControlQueueItem(actor: QueueActor, ownerParticipantId: string): boolean {
  return actor.role === "host" || actor.id === ownerParticipantId;
}

export function canRemoveQueueItem(actor: QueueActor, ownerParticipantId: string): boolean {
  return canControlQueueItem(actor, ownerParticipantId);
}

export function isActiveRoomParticipant(actor: QueueActor, roomId: string, now = Date.now()): boolean {
  return actor.roomId === roomId && actor.leftAt === null && Number.isFinite(now);
}
