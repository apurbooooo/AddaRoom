"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Room, RoomEvent } from "livekit-client";
import {
  ChatMessagePacket,
  ReactionPacket,
  TypingPacket,
  HandRaisePacket,
  HostCommandPacket,
  LiveKitDataPacket,
} from "@/types";
import { soundManager } from "@/lib/sound-effects";

export interface ActiveReactionItem extends ReactionPacket {
  id: string;
}

/**
 * Validates whether an incoming moderation data-channel packet is authorized.
 *
 * A packet is authorized ONLY if:
 * 1) Server-Originated:
 *    - `participant` is absent (null/undefined)
 *    - `participantIdentity` is absent (null/undefined or empty string "")
 *    - `topic` is exactly "server-room-control"
 * OR
 * 2) Host-Participant-Originated:
 *    - `authorizedHostId` is defined and non-empty
 *    - `participant` is present and has `identity` matching `authorizedHostId`
 *    - If `participantIdentity` is present, it must be consistent and match `participant.identity`
 *
 * Any packet with mismatched identities, an imposter sender, an unauthorized participant
 * attempting to use "server-room-control", or participantIdentity present while pretending
 * to be from the server is rejected.
 */
export function isModerationPacketAuthorized(
  participant: { identity?: string } | undefined | null,
  topic: string | undefined,
  authorizedHostId: string | undefined,
  participantIdentity?: string,
): boolean {
  const effectiveParticipantIdentity = participantIdentity?.trim() || undefined;
  const participantObjIdentity = participant?.identity?.trim() || undefined;

  // 1) Server-Originated Check:
  // Must have NO participant object, NO participant identity, and topic must be "server-room-control"
  const isAbsentParticipant = !participant;
  const isAbsentIdentity = !effectiveParticipantIdentity;
  const isServerTopic = topic === "server-room-control";

  if (isAbsentParticipant && isAbsentIdentity && isServerTopic) {
    return true;
  }

  // If effectiveParticipantIdentity is present, it cannot be treated as server-originated.
  // 2) Host-Participant-Originated Check:
  const hostId = authorizedHostId?.trim();
  if (!hostId) {
    return false;
  }

  if (!participantObjIdentity) {
    return false;
  }

  // Reject inconsistent sender information (mismatched participant and participantIdentity)
  if (effectiveParticipantIdentity && participantObjIdentity !== effectiveParticipantIdentity) {
    return false;
  }

  return participantObjIdentity === hostId;
}

export function useRoomDataChannel(
  room: Room | undefined,
  currentParticipantId: string,
  currentParticipantName: string,
  currentAvatar: string,
  authorizedHostId?: string,
) {
  const [messages, setMessages] = useState<ChatMessagePacket[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set());
  const [activeReactions, setActiveReactions] = useState<ActiveReactionItem[]>([]);
  const [kicked, setKicked] = useState(false);
  const [ended, setEnded] = useState(false);

  const typingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const seenMessageIds = useRef<Set<string>>(new Set());
  const seenReactionIds = useRef<Set<string>>(new Set());

  const notifyIncomingMessage = () => {
    soundManager.playMessage();
    soundManager.vibrate(35);
  };

  // Handle incoming data packets
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (
      payload: Uint8Array,
      participant?: { identity?: string } | null,
      _kind?: unknown,
      topic?: string,
      _encryptionType?: unknown,
      participantIdentity?: string,
    ) => {
      try {
        const textDecoder = new TextDecoder();
        const jsonStr = textDecoder.decode(payload);
        const data: LiveKitDataPacket = JSON.parse(jsonStr);

        switch (data.type) {
          case "chat": {
            if (seenMessageIds.current.has(data.id)) break;
            seenMessageIds.current.add(data.id);
            if (seenMessageIds.current.size > 500) {
              const oldest = seenMessageIds.current.values().next().value;
              if (oldest) seenMessageIds.current.delete(oldest);
            }
            setMessages((prev) => [...prev, data]);
            if (data.senderId !== currentParticipantId) {
              notifyIncomingMessage();
            }
            break;
          }
          case "reaction": {
            if (seenReactionIds.current.has(data.id)) break;
            seenReactionIds.current.add(data.id);
            setActiveReactions((prev) => [...prev.slice(-30), data]);
            if (data.senderId !== currentParticipantId) soundManager.playReaction();
            // Automatically clean up reaction after 3.5s
            setTimeout(() => {
              setActiveReactions((prev) => prev.filter((r) => r.id !== data.id));
            }, 3500);
            break;
          }
          case "typing": {
            setTypingUsers((prev) => {
              const updated = new Map(prev);
              if (data.isTyping) {
                updated.set(data.senderId, data.senderName);
              } else {
                updated.delete(data.senderId);
              }
              return updated;
            });

            // Auto-clear typing status after 3.5s if no update
            if (data.isTyping) {
              const existing = typingTimeouts.current.get(data.senderId);
              if (existing) clearTimeout(existing);

              const t = setTimeout(() => {
                setTypingUsers((prev) => {
                  const updated = new Map(prev);
                  updated.delete(data.senderId);
                  return updated;
                });
              }, 3500);
              typingTimeouts.current.set(data.senderId, t);
            }
            break;
          }
          case "hand_raise": {
            setRaisedHands((prev) => {
              const next = new Set(prev);
              if (data.isRaised) {
                next.add(data.senderId);
              } else {
                next.delete(data.senderId);
              }
              return next;
            });
            break;
          }
          case "host_command": {
            if (!isModerationPacketAuthorized(participant, topic, authorizedHostId, participantIdentity)) {
              console.warn(
                "[DataChannel] Rejected unauthorized host_command from:",
                participant?.identity || participantIdentity || "unknown",
              );
              break;
            }
            if (data.action === "kick" && data.targetParticipantId === currentParticipantId) {
              setKicked(true);
            }
            if (data.action === "room_ended") {
              setEnded(true);
            }
            break;
          }
        }
      } catch (err) {
        console.warn("Failed to parse incoming data packet:", err);
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
      typingTimeouts.current.forEach((t) => clearTimeout(t));
      typingTimeouts.current.clear();
      seenMessageIds.current.clear();
      seenReactionIds.current.clear();
    };
  }, [room, currentParticipantId, authorizedHostId]);

  // Publish generic data packet via LiveKit
  const publishPacket = useCallback(
    async (packet: LiveKitDataPacket, reliable = true) => {
      if (!room || !room.localParticipant) return;
      try {
        const textEncoder = new TextEncoder();
        const payload = textEncoder.encode(JSON.stringify(packet));
        await room.localParticipant.publishData(payload, {
          reliable,
        });
      } catch (err) {
        console.error("Failed to publish data packet:", err);
      }
    },
    [room]
  );

  const sendMessage = useCallback(
    async (text: string, replyTo?: ChatMessagePacket["replyTo"]) => {
      const clean = text.trim();
      if (!clean) return;

      const packet: ChatMessagePacket = {
        type: "chat",
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        senderId: currentParticipantId,
        senderName: currentParticipantName,
        avatar: currentAvatar,
        text: clean,
        timestamp: Date.now(),
        replyTo,
      };

      // Add locally for instant UI responsiveness
      seenMessageIds.current.add(packet.id);
      setMessages((prev) => [...prev, packet]);
      // Publish to other room participants reliably
      await publishPacket(packet, true);
    },
    [currentParticipantId, currentParticipantName, currentAvatar, publishPacket]
  );

  const sendReaction = useCallback(
    async (emoji: string) => {
      const packet: ReactionPacket = {
        type: "reaction",
        id: `rx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        senderId: currentParticipantId,
        senderName: currentParticipantName,
        emoji,
        timestamp: Date.now(),
      };

      seenReactionIds.current.add(packet.id);
      setActiveReactions((prev) => [...prev.slice(-30), packet]);
      soundManager.playReaction();
      setTimeout(() => {
        setActiveReactions((prev) => prev.filter((r) => r.id !== packet.id));
      }, 3500);

      await publishPacket(packet, false); // loss-tolerant low-latency
    },
    [currentParticipantId, currentParticipantName, publishPacket]
  );

  const sendTyping = useCallback(
    async (isTyping: boolean) => {
      const packet: TypingPacket = {
        type: "typing",
        senderId: currentParticipantId,
        senderName: currentParticipantName,
        isTyping,
      };
      await publishPacket(packet, false);
    },
    [currentParticipantId, currentParticipantName, publishPacket]
  );

  const toggleHandRaise = useCallback(
    async (isCurrentlyRaised: boolean) => {
      const nextRaised = !isCurrentlyRaised;
      setRaisedHands((prev) => {
        const next = new Set(prev);
        if (nextRaised) next.add(currentParticipantId);
        else next.delete(currentParticipantId);
        return next;
      });

      const packet: HandRaisePacket = {
        type: "hand_raise",
        senderId: currentParticipantId,
        senderName: currentParticipantName,
        isRaised: nextRaised,
      };
      await publishPacket(packet, true);
    },
    [currentParticipantId, currentParticipantName, publishPacket]
  );

  const sendHostBroadcast = useCallback(
    async (action: HostCommandPacket["action"], targetParticipantId?: string) => {
      const packet: HostCommandPacket = {
        type: "host_command",
        action,
        targetParticipantId,
      };
      await publishPacket(packet, true);
    },
    [publishPacket]
  );

  return {
    messages,
    activeReactions,
    typingUsers: Array.from(typingUsers.values()),
    raisedHands,
    kicked,
    ended,
    sendMessage,
    sendReaction,
    sendTyping,
    toggleHandRaise,
    sendHostBroadcast,
  };
}
