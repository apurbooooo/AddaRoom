"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Participant, Room, RoomEvent } from "livekit-client";
import {
  ChatMessagePacket,
  ReactionPacket,
  TypingPacket,
  HandRaisePacket,
  HostCommandPacket,
  LiveKitDataPacket,
} from "@/types";
import { soundManager } from "@/lib/sound-effects";
import type { RoomEventNotice } from "@/lib/room-notifications";

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
  onRoomEvent?: (event: RoomEventNotice) => void,
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
  const seenHandEventIds = useRef<Set<string>>(new Set());
  const reactionTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const onRoomEventRef = useRef(onRoomEvent);
  onRoomEventRef.current = onRoomEvent;

  const notifyRoomEvent = (event: RoomEventNotice) => onRoomEventRef.current?.(event);

  // Handle incoming data packets
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (
      payload: Uint8Array,
      participant?: Participant | null,
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
            const messageIsRecent = Number.isFinite(data.timestamp) && Date.now() - data.timestamp <= 60_000 && data.timestamp - Date.now() <= 30_000;
            if (data.senderId !== currentParticipantId && messageIsRecent) {
              notifyRoomEvent({
                id: `chat:${data.id}`,
                type: "chat",
                scope: "remote",
                participantId: data.senderId,
                senderName: data.senderName || "A participant",
                avatar: data.avatar,
                text: data.text,
                sound: "messageIncoming",
                soundCategory: "chat",
                vibrationCategory: "chat",
                vibrationPattern: 28,
              });
            }
            break;
          }
          case "reaction": {
            if (seenReactionIds.current.has(data.id)) break;
            seenReactionIds.current.add(data.id);
            if (seenReactionIds.current.size > 600) {
              const oldest = seenReactionIds.current.values().next().value;
              if (oldest) seenReactionIds.current.delete(oldest);
            }
            setActiveReactions((prev) => [...prev.slice(-30), data]);
            const reactionIsRecent = Number.isFinite(data.timestamp) && Date.now() - data.timestamp <= 15_000 && data.timestamp - Date.now() <= 10_000;
            if (data.senderId !== currentParticipantId && reactionIsRecent) {
              notifyRoomEvent({
                id: `reaction:${data.id}`,
                type: "reaction",
                scope: "remote",
                participantId: data.senderId,
                senderName: data.senderName || "A participant",
                avatar: "",
                text: `reacted ${data.emoji}`,
                sound: "reaction",
                soundCategory: "reactions",
                vibrationCategory: "reactions",
                vibrationPattern: 18,
                durationMs: 3200,
              });
            }
            // Automatically clean up reaction after 3.5s
            const existingTimeout = reactionTimeouts.current.get(data.id);
            if (existingTimeout) clearTimeout(existingTimeout);
            reactionTimeouts.current.set(data.id, setTimeout(() => {
              reactionTimeouts.current.delete(data.id);
              setActiveReactions((prev) => prev.filter((r) => r.id !== data.id));
            }, 3500));
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
            const handIsRecent = !data.timestamp || Date.now() - data.timestamp <= 60_000 && data.timestamp - Date.now() <= 30_000;
            if (data.senderId !== currentParticipantId && handIsRecent) {
              const eventId = data.id || `${data.senderId}:${data.isRaised ? "raised" : "lowered"}:${data.timestamp || 0}`;
              if (!seenHandEventIds.current.has(eventId)) {
                seenHandEventIds.current.add(eventId);
                if (seenHandEventIds.current.size > 300) {
                  const oldest = seenHandEventIds.current.values().next().value;
                  if (oldest) seenHandEventIds.current.delete(oldest);
                }
                notifyRoomEvent({
                  id: `hand:${eventId}`,
                  type: data.isRaised ? "hand_raise" : "hand_lower",
                  scope: "remote",
                  participantId: data.senderId,
                  senderName: data.senderName || "A participant",
                  avatar: "",
                  text: data.isRaised ? "raised their hand ✋" : "lowered their hand",
                  sound: data.isRaised ? "handRaised" : "handLowered",
                  soundCategory: "handRaise",
                  vibrationCategory: "handRaise",
                  vibrationPattern: data.isRaised ? 28 : 16,
                });
              }
            }
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
            const actorName = participant?.name?.trim() || "Host";
            const avatar = (() => {
              try {
                const id = participant?.metadata ? JSON.parse(participant.metadata).avatar : undefined;
                return typeof id === "string" && id ? id : "persona-male-pfp";
              } catch { return "persona-male-pfp"; }
            })();
            if (data.action === "lock_state" && typeof data.payload?.locked === "boolean") {
              notifyRoomEvent({
                id: `host:${participant?.identity || "server"}:lock:${data.payload.locked}:${data.payload.eventId || data.payload.timestamp || "state"}`,
                type: data.payload.locked ? "room_lock" : "room_unlock",
                scope: "room",
                participantId: participant?.identity,
                senderName: actorName,
                avatar,
                text: data.payload.locked ? "locked the room" : "unlocked the room",
                sound: "roomAction",
                soundCategory: "roomActions",
                vibrationCategory: "roomEvents",
              });
            } else if (data.action === "mute") {
              const muted = Boolean(data.payload?.muted);
              const targetName = typeof data.payload?.targetName === "string" && data.payload.targetName.trim() ? data.payload.targetName.trim().slice(0, 60) : "a participant";
              notifyRoomEvent({
                id: `host:${participant?.identity || "server"}:mute:${data.targetParticipantId || "participant"}:${muted}:${data.payload?.eventId || data.payload?.timestamp || Date.now()}`,
                type: muted ? "host_mute" : "host_unmute",
                scope: "room",
                participantId: participant?.identity,
                senderName: actorName,
                avatar,
                text: muted ? `muted ${targetName}'s microphone` : `allowed ${targetName} to use their microphone`,
                sound: "roomAction",
                soundCategory: "roomActions",
                vibrationCategory: "roomEvents",
              });
            } else if (data.action === "kick") {
              const targetName = typeof data.payload?.targetName === "string" && data.payload.targetName.trim() ? data.payload.targetName.trim().slice(0, 60) : "a participant";
              notifyRoomEvent({
                id: `host:${participant?.identity || "server"}:remove:${data.targetParticipantId || "participant"}:${data.payload?.eventId || data.payload?.timestamp || Date.now()}`,
                type: "host_remove",
                scope: "room",
                participantId: participant?.identity,
                senderName: actorName,
                avatar,
                text: `removed ${targetName} from the room`,
                sound: "roomAction",
                soundCategory: "roomActions",
                vibrationCategory: "roomEvents",
              });
            } else if (data.action === "host_transferred") {
              notifyRoomEvent({
                id: `host:${participant?.identity || "server"}:transfer:${data.targetParticipantId || "host"}:${data.payload?.eventId || data.payload?.timestamp || Date.now()}`,
                type: "host_transfer",
                scope: "room",
                participantId: participant?.identity,
                senderName: actorName,
                avatar,
                text: "transferred host privileges",
                sound: "roomAction",
                soundCategory: "roomActions",
              });
            } else if (data.action === "room_setting") {
              notifyRoomEvent({
                id: `host:${participant?.identity || "server"}:setting:${data.payload?.eventId || data.payload?.timestamp || Date.now()}`,
                type: "room_setting",
                scope: "room",
                participantId: participant?.identity,
                senderName: actorName,
                avatar,
                text: "updated room settings",
                sound: "roomAction",
                soundCategory: "roomActions",
                vibrationCategory: "roomEvents",
              });
            } else if (data.action === "room_ended") {
              notifyRoomEvent({
                id: `host:${participant?.identity || "server"}:ended:${data.payload?.eventId || data.payload?.timestamp || Date.now()}`,
                type: "room_setting",
                scope: "room",
                participantId: participant?.identity,
                senderName: actorName,
                avatar,
                text: "ended the room",
                sound: "roomAction",
                soundCategory: "roomActions",
                vibrationCategory: "roomEvents",
              });
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
      reactionTimeouts.current.forEach((t) => clearTimeout(t));
      reactionTimeouts.current.clear();
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
        return true;
      } catch (err) {
        console.error("Failed to publish data packet:", err);
        return false;
      }
    },
    [room]
  );

  const sendMessage = useCallback(
    async (text: string, replyTo?: ChatMessagePacket["replyTo"]) => {
      const clean = text.trim();
      if (!clean) return;
      void soundManager.unlock();

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
      const published = await publishPacket(packet, true);
      if (published) soundManager.playMessageSent(`message-sent:${packet.id}`);
    },
    [currentParticipantId, currentParticipantName, currentAvatar, publishPacket]
  );

  const sendReaction = useCallback(
    async (emoji: string) => {
      void soundManager.unlock();
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
      const reactionTimeout = setTimeout(() => {
        reactionTimeouts.current.delete(packet.id);
        setActiveReactions((prev) => prev.filter((r) => r.id !== packet.id));
      }, 3500);
      reactionTimeouts.current.set(packet.id, reactionTimeout);

      const published = await publishPacket(packet, false); // loss-tolerant low-latency
      if (published) {
        soundManager.playReaction(`reaction:${packet.id}`);
        soundManager.vibrate("reactions", 18);
        notifyRoomEvent({
          id: `reaction:${packet.id}`,
          type: "reaction",
          scope: "local",
          participantId: currentParticipantId,
          senderName: "You",
          avatar: currentAvatar,
          text: `reacted ${emoji}`,
          durationMs: 3000,
        });
      }
    },
    [currentParticipantId, currentParticipantName, currentAvatar, publishPacket]
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
      void soundManager.unlock();
      const nextRaised = !isCurrentlyRaised;
      setRaisedHands((prev) => {
        const next = new Set(prev);
        if (nextRaised) next.add(currentParticipantId);
        else next.delete(currentParticipantId);
        return next;
      });

      const packet: HandRaisePacket = {
        type: "hand_raise",
        id: `hand_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        senderId: currentParticipantId,
        senderName: currentParticipantName,
        isRaised: nextRaised,
        timestamp: Date.now(),
      };
      const published = await publishPacket(packet, true);
      if (published) {
        soundManager.playOnce(`hand:${packet.id}`, nextRaised ? "handRaised" : "handLowered");
        soundManager.vibrate("handRaise", nextRaised ? 28 : 16);
        notifyRoomEvent({
          id: `hand:${packet.id}`,
          type: nextRaised ? "hand_raise" : "hand_lower",
          scope: "local",
          participantId: currentParticipantId,
          senderName: "You",
          avatar: currentAvatar,
          text: nextRaised ? "raised your hand ✋" : "lowered your hand",
        });
      }
    },
    [currentParticipantId, currentParticipantName, currentAvatar, publishPacket]
  );

  const sendHostBroadcast = useCallback(
    async (action: HostCommandPacket["action"], targetParticipantId?: string, payload?: HostCommandPacket["payload"]) => {
      const packet: HostCommandPacket = {
        type: "host_command",
        action,
        targetParticipantId,
        payload,
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
