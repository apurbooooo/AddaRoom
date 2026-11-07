"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Room } from "livekit-client";
import { MediaQueueItem } from "@/types";
import { projectedPlaybackTime } from "@/lib/media-sync";

interface UseMediaQueueOptions { room: Room | null; isHost: boolean; localParticipantId: string; hostParticipantId?: string; roomCode: string; sessionSecret: string; }
interface QueueApiItem { id: string; sourceType: "youtube" | "direct"; sourceUrl: string; title: string; ownerParticipantId: string; addedBy?: string; addedByName?: string; avatar?: string; position: number; }
interface QueueSnapshot { items: QueueApiItem[]; playback: { currentItemId: string | null; playbackState: "playing" | "paused"; positionSeconds: number; playbackStartedAt: string | null; playbackRate: number; version: number } | null; serverTime?: number; }
interface UseMediaQueueReturn { queue: MediaQueueItem[]; currentIndex: number; isPlaying: boolean; currentTime: number; currentItem: MediaQueueItem | null; canControlCurrentItem: boolean; addItem: (item: Omit<MediaQueueItem, "id">) => void; removeItem: (itemId: string) => void; play: () => void; pause: () => void; seek: (time: number) => void; nextItem: () => void; setCurrentTime: (t: number) => void; playItem: (index: number) => void; }

export function useMediaQueue({ isHost, localParticipantId, roomCode, sessionSecret }: UseMediaQueueOptions): UseMediaQueueReturn {
  const [queue, setQueue] = useState<MediaQueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const versionRef = useRef(0);
  const stateRef = useRef({ queue, currentIndex, isPlaying, currentTime });
  stateRef.current = { queue, currentIndex, isPlaying, currentTime };
  const endpoint = `/api/rooms/${encodeURIComponent(roomCode)}/media-queue`;
  const auth = { participantId: localParticipantId, sessionSecret };

  const applySnapshot = useCallback((snapshot: QueueSnapshot) => {
    const nextQueue: MediaQueueItem[] = snapshot.items.map((item) => ({ id: item.id, type: item.sourceType === "youtube" ? "youtube" : "url", title: item.title, src: item.sourceUrl, addedBy: item.ownerParticipantId, addedByName: item.addedByName || item.ownerParticipantId }));
    setQueue(nextQueue);
    const playback = snapshot.playback;
    if (!playback) { setCurrentIndex(0); setIsPlaying(false); setCurrentTime(0); return; }
    const index = nextQueue.findIndex((item) => item.id === playback.currentItemId);
    setCurrentIndex(index >= 0 ? index : 0);
    setIsPlaying(playback.playbackState === "playing");
    setCurrentTime(projectedPlaybackTime(playback.positionSeconds, playback.playbackState === "playing", playback.playbackStartedAt ? new Date(playback.playbackStartedAt).getTime() : undefined, snapshot.serverTime || Date.now()));
    versionRef.current = playback.version;
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(endpoint, { cache: "no-store", headers: { "x-addaroom-participant-id": localParticipantId, "x-addaroom-session-secret": sessionSecret } });
      if (!response.ok) return;
      applySnapshot(await response.json() as QueueSnapshot);
    } catch (error) { console.warn("[useMediaQueue] authoritative refresh failed", error); }
  }, [applySnapshot, endpoint, localParticipantId, sessionSecret]);

  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 4000); return () => window.clearInterval(timer); }, [refresh]);

  const writePlayback = useCallback(async (action: "play" | "pause" | "seek" | "restart" | "ended", position: number, itemId = stateRef.current.queue[stateRef.current.currentIndex]?.id ?? null) => {
    const item = stateRef.current.queue.find((candidate) => candidate.id === itemId);
    if (item && item.addedBy !== localParticipantId && !isHost) return;
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...auth, action, currentItemId: itemId, positionSeconds: Math.max(0, position), expectedVersion: versionRef.current }) });
      if (response.ok) { const data = await response.json(); versionRef.current = data.playback.version; await refresh(); }
      else if (response.status === 409) await refresh();
    } catch { await refresh(); }
  }, [endpoint, isHost, localParticipantId, refresh, sessionSecret]);

  const addItem = useCallback(async (item: Omit<MediaQueueItem, "id">) => {
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...auth, action: "add", sourceType: item.type === "youtube" ? "youtube" : "direct", sourceUrl: item.src, title: item.title }) });
      if (response.ok) await refresh();
    } catch { await refresh(); }
  }, [endpoint, refresh, sessionSecret, localParticipantId]);

  const removeItem = useCallback(async (itemId: string) => {
    const item = stateRef.current.queue.find((candidate) => candidate.id === itemId);
    if (!item || (item.addedBy !== localParticipantId && !isHost)) return;
    try { await fetch(`${endpoint}/${encodeURIComponent(itemId)}`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify(auth) }); } finally { await refresh(); }
  }, [endpoint, isHost, localParticipantId, refresh, sessionSecret]);

  const play = useCallback(() => { const item = stateRef.current.queue[stateRef.current.currentIndex]; if (!item || (item.addedBy !== localParticipantId && !isHost)) return; setIsPlaying(true); void writePlayback("play", stateRef.current.currentTime); }, [isHost, localParticipantId, writePlayback]);
  const pause = useCallback(() => { const item = stateRef.current.queue[stateRef.current.currentIndex]; if (!item || (item.addedBy !== localParticipantId && !isHost)) return; setIsPlaying(false); void writePlayback("pause", stateRef.current.currentTime); }, [isHost, localParticipantId, writePlayback]);
  const seek = useCallback((time: number) => { setCurrentTime(time); void writePlayback("seek", time); }, [writePlayback]);
  const updateCurrentTime = useCallback((time: number) => { setCurrentTime(time); }, []);
  const nextItem = useCallback(() => { const next = stateRef.current.currentIndex + 1; if (next >= stateRef.current.queue.length) return; setCurrentIndex(next); setCurrentTime(0); setIsPlaying(true); void writePlayback("play", 0, stateRef.current.queue[next].id); }, [writePlayback]);
  const playItem = useCallback((index: number) => { const item = stateRef.current.queue[index]; if (!item || (item.addedBy !== localParticipantId && !isHost)) return; setCurrentIndex(index); setCurrentTime(0); setIsPlaying(true); void writePlayback("play", 0, item.id); }, [isHost, localParticipantId, writePlayback]);

  const currentItem = queue[currentIndex] ?? null;
  return { queue, currentIndex, isPlaying, currentTime, currentItem, canControlCurrentItem: !!currentItem && (isHost || currentItem.addedBy === localParticipantId), addItem, removeItem, play, pause, seek, nextItem, setCurrentTime: updateCurrentTime, playItem };
}
