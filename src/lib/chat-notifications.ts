import { ChatMessagePacket } from "@/types";

export function selectIncomingMessages(messages: ChatMessagePacket[], ownParticipantId: string, seenIds: ReadonlySet<string>): ChatMessagePacket[] {
  return messages.filter((message) => message.senderId !== ownParticipantId && !seenIds.has(message.id));
}
