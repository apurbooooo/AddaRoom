"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Room, RoomEvent, DataPacket_Kind } from "livekit-client";
import { MediaQueueItem, PlaybackSyncPacket } from "@/types";

interface UseMediaQueueOptions {
  room: Room | null;
  isHost: boolean;
  localParticipantId: string;
}

interface UseMediaQueueReturn {
  queue: MediaQueueItem[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  currentItem: MediaQueueItem | null;
  addItem: (item: Omit<MediaQueueItem, "id">) => void;
  removeItem: (itemId: string) => void;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  nextItem: () => void;
  setCurrentTime: (t: number) => void;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

export function useMediaQueue({
  room,
  isHost,
  localParticipantId,
}: UseMediaQueueOptions): UseMediaQueueReturn {
  const [queue, setQueue] = useState<MediaQueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const currentItem = queue[currentIndex] ?? null;

  // Keep a ref for the latest state to use in event handlers without stale closures
  const stateRef = useRef({ queue, currentIndex, isPlaying, currentTime });
  stateRef.current = { queue, currentIndex, isPlaying, currentTime };

  const sendPacket = useCallback(
    (packet: PlaybackSyncPacket) => {
      if (!room) return;
      try {
        const data = new TextEncoder().encode(JSON.stringify(packet));
        room.localParticipant.publishData(data, { reliable: true });
      } catch (err) {
        console.warn("[useMediaQueue] publishData failed:", err);
      }
    },
    [room]
  );

  // Listen to incoming data packets
  useEffect(() => {
    if (!room) return;

    const handleData = (payload: Uint8Array) => {
      try {
        const text = new TextDecoder().decode(payload);
        const packet = JSON.parse(text) as PlaybackSyncPacket;
        if (packet.type !== "playback_sync") return;

        switch (packet.action) {
          case "queue_update":
            if (packet.queue !== undefined) setQueue(packet.queue);
            if (packet.currentIndex !== undefined) setCurrentIndex(packet.currentIndex);
            break;
          case "play":
            setIsPlaying(true);
            if (packet.currentTime !== undefined) setCurrentTime(packet.currentTime);
            break;
          case "pause":
            setIsPlaying(false);
            if (packet.currentTime !== undefined) setCurrentTime(packet.currentTime);
            break;
          case "seek":
            if (packet.currentTime !== undefined) setCurrentTime(packet.currentTime);
            break;
          case "next":
            setCurrentIndex((prev) => {
              const nextIdx = prev + 1;
              return nextIdx < stateRef.current.queue.length ? nextIdx : prev;
            });
            setIsPlaying(true);
            setCurrentTime(0);
            break;
        }
      } catch {
        // ignore malformed packets
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room]);

  // When a new participant joins, host sends current state
  useEffect(() => {
    if (!room || !isHost) return;

    const handleParticipantConnected = () => {
      const { queue: q, currentIndex: ci, isPlaying: ip, currentTime: ct } = stateRef.current;
      if (q.length === 0) return;
      sendPacket({
        type: "playback_sync",
        action: "queue_update",
        queue: q,
        currentIndex: ci,
        currentTime: ct,
      });
    };

    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    return () => {
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
    };
  }, [room, isHost, sendPacket]);

  const addItem = useCallback(
    (item: Omit<MediaQueueItem, "id">) => {
      const newItem: MediaQueueItem = { ...item, id: generateId() };
      setQueue((prev) => {
        const next = [...prev, newItem];
        if (isHost) {
          sendPacket({
            type: "playback_sync",
            action: "queue_update",
            queue: next,
            currentIndex: stateRef.current.currentIndex,
          });
        }
        return next;
      });
    },
    [isHost, sendPacket]
  );

  const removeItem = useCallback(
    (itemId: string) => {
      setQueue((prev) => {
        const next = prev.filter((i) => i.id !== itemId);
        if (isHost) {
          sendPacket({
            type: "playback_sync",
            action: "queue_update",
            queue: next,
            currentIndex: stateRef.current.currentIndex,
          });
        }
        return next;
      });
    },
    [isHost, sendPacket]
  );

  const play = useCallback(() => {
    setIsPlaying(true);
    if (isHost) {
      sendPacket({ type: "playback_sync", action: "play", currentTime: stateRef.current.currentTime });
    }
  }, [isHost, sendPacket]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    if (isHost) {
      sendPacket({ type: "playback_sync", action: "pause", currentTime: stateRef.current.currentTime });
    }
  }, [isHost, sendPacket]);

  const seek = useCallback(
    (time: number) => {
      setCurrentTime(time);
      if (isHost) {
        sendPacket({ type: "playback_sync", action: "seek", currentTime: time });
      }
    },
    [isHost, sendPacket]
  );

  const nextItem = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = prev + 1 < stateRef.current.queue.length ? prev + 1 : prev;
      if (isHost) {
        sendPacket({ type: "playback_sync", action: "next" });
      }
      return next;
    });
    setIsPlaying(true);
    setCurrentTime(0);
  }, [isHost, sendPacket]);

  return {
    queue,
    currentIndex,
    isPlaying,
    currentTime,
    currentItem,
    addItem,
    removeItem,
    play,
    pause,
    seek,
    nextItem,
    setCurrentTime,
  };
}
