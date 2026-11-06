"use client";

import { useCallback, useEffect, useState } from "react";
import { Room, RoomEvent } from "livekit-client";

/**
 * Manages audio playback state for iOS Safari and other browsers that block
 * autoplay. Provides a user-gesture handler to call room.startAudio().
 */
export function useAudioPlayback(room: Room | undefined) {
  const [canPlayAudio, setCanPlayAudio] = useState(true);

  useEffect(() => {
    if (!room) return;

    // Set initial state
    setCanPlayAudio(room.canPlaybackAudio);

    const handleAudioPlaybackChanged = () => {
      setCanPlayAudio(room.canPlaybackAudio);
    };

    room.on(RoomEvent.AudioPlaybackStatusChanged, handleAudioPlaybackChanged);

    return () => {
      room.off(RoomEvent.AudioPlaybackStatusChanged, handleAudioPlaybackChanged);
    };
  }, [room]);

  /**
   * Must be called from a user gesture (click/tap) handler.
   * Unlocks audio playback on iOS Safari.
   */
  const startAudio = useCallback(async (): Promise<boolean> => {
    if (!room) return false;
    try {
      await room.startAudio();
      setCanPlayAudio(room.canPlaybackAudio);
      return room.canPlaybackAudio;
    } catch (err) {
      console.warn("[AudioPlayback] Failed to start audio:", err);
      setCanPlayAudio(false);
      return false;
    }
  }, [room]);

  return { canPlayAudio, startAudio };
}
