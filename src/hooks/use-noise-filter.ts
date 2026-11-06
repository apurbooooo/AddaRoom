"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { LocalAudioTrack, Room } from "livekit-client";
import { Track } from "livekit-client";
import type { KrispNoiseFilterProcessor } from "@livekit/krisp-noise-filter";

export type KrispState = "off" | "loading" | "on" | "unsupported" | "failed";

const STORAGE_KEY_NR = "addaroom_noise_filter";

function readPersistedNoise(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = localStorage.getItem(STORAGE_KEY_NR);
    return stored === null ? true : stored === "true";
  } catch {
    return true;
  }
}

/**
 * Dynamic environment and browser capability verification for Krisp.
 * Safari versions below 17.4 are unsupported according to LiveKit documentation.
 * Tests capabilities dynamically rather than relying solely on user-agent strings.
 */
export function isKrispDynamicallySupported(env?: {
  win?: any;
  nav?: any;
}): boolean {
  const win = env?.win !== undefined ? env.win : typeof window !== "undefined" ? window : undefined;
  const nav = env?.nav !== undefined ? env.nav : typeof navigator !== "undefined" ? navigator : undefined;

  if (!win || !nav) {
    return false;
  }

  // 1. AudioContext check
  const AudioCtx = win.AudioContext || win.webkitAudioContext;
  if (!AudioCtx) return false;

  // 2. WebAssembly check
  if (typeof WebAssembly === "undefined" || typeof WebAssembly.instantiate !== "function") {
    return false;
  }

  // 3. AudioWorklet check (required for WebRTC track processors)
  if (typeof win.AudioWorkletNode === "undefined") {
    return false;
  }

  // 4. Web Worker check
  if (typeof win.Worker === "undefined") {
    return false;
  }

  // 5. mediaDevices check
  if (!nav.mediaDevices || typeof nav.mediaDevices.getUserMedia !== "function") {
    return false;
  }

  // 6. Safari version check: Safari < 17.4 lacks necessary AudioWorklet support for Krisp
  const isSafari = /^((?!chrome|android).)*safari/i.test(nav.userAgent || "");
  if (isSafari) {
    const versionMatch = (nav.userAgent || "").match(/Version\/(\d+)(?:\.(\d+))?/i);
    if (versionMatch) {
      const major = parseInt(versionMatch[1], 10);
      const minor = parseInt(versionMatch[2] || "0", 10);
      if (major < 17 || (major === 17 && minor < 4)) {
        return false;
      }
    }
  }

  return true;
}

export interface UseNoiseFilterOptions {
  room?: Room | null;
}

export interface UseNoiseFilterResult {
  // 1. Basic WebRTC Noise Suppression
  isNoiseEnabled: boolean;
  isBrowserProcessingSupported: boolean;
  setNoiseEnabled: (enabled: boolean) => void;
  toggleNoise: () => boolean;
  label: string;

  // 2. Enhanced Krisp Noise Cancellation
  krispState: KrispState;
  isKrispSupported: boolean;
  krispErrorMessage: string | null;
  toggleKrisp: (overrideTrack?: LocalAudioTrack | null) => Promise<boolean>;
  setKrispEnabled: (enabled: boolean, overrideTrack?: LocalAudioTrack | null) => Promise<boolean>;
  reapplyKrispIfNeeded: (track?: LocalAudioTrack | null) => Promise<void>;
  cleanupKrisp: () => Promise<void>;
}

/**
 * Manages both:
 * 1. Basic browser WebRTC noise suppression (echo cancellation, noise suppression, AGC).
 * 2. Enhanced LiveKit Krisp Noise Cancellation track processor on the LocalAudioTrack.
 */
export function useNoiseFilter(options?: UseNoiseFilterOptions): UseNoiseFilterResult {
  const room = options?.room;

  // 1. Basic WebRTC Noise Reduction
  const [isNoiseEnabled, setIsNoiseEnabled] = useState<boolean>(() => readPersistedNoise());
  const [isBrowserProcessingSupported] = useState(() => {
    if (typeof navigator === "undefined") return true;
    return navigator.mediaDevices?.getSupportedConstraints?.().noiseSuppression ?? true;
  });

  // 2. Krisp Noise Cancellation State
  const [isKrispSupported] = useState(() => isKrispDynamicallySupported());
  const [krispState, setKrispState] = useState<KrispState>(() =>
    isKrispDynamicallySupported() ? "off" : "unsupported"
  );
  const [krispErrorMessage, setKrispErrorMessage] = useState<string | null>(null);

  const processorRef = useRef<KrispNoiseFilterProcessor | null>(null);
  const krispRequestedRef = useRef<boolean>(false);

  const setNoiseEnabled = useCallback((enabled: boolean) => {
    setIsNoiseEnabled(enabled);
    try {
      localStorage.setItem(STORAGE_KEY_NR, String(enabled));
    } catch {}
  }, []);

  const toggleNoise = useCallback(() => {
    const next = !isNoiseEnabled;
    setNoiseEnabled(next);
    return next;
  }, [isNoiseEnabled, setNoiseEnabled]);

  const getLocalMicrophoneTrack = useCallback((): LocalAudioTrack | null => {
    if (!room) return null;
    const pub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
    if (pub?.track && pub.track.kind === Track.Kind.Audio) {
      return pub.track as LocalAudioTrack;
    }
    for (const p of room.localParticipant.audioTrackPublications.values()) {
      if (p.track && p.track.kind === Track.Kind.Audio) {
        return p.track as LocalAudioTrack;
      }
    }
    return null;
  }, [room]);

  const setKrispEnabled = useCallback(
    async (enabled: boolean, overrideTrack?: LocalAudioTrack | null): Promise<boolean> => {
      if (!enabled) {
        krispRequestedRef.current = false;
        if (processorRef.current) {
          try {
            await processorRef.current.setEnabled(false);
          } catch (err) {
            console.warn("[useNoiseFilter] Failed to disable Krisp processor:", err);
          }
        }
        setKrispState("off");
        setKrispErrorMessage(null);
        return false;
      }

      krispRequestedRef.current = true;

      if (!isKrispDynamicallySupported()) {
        setKrispState("unsupported");
        setKrispErrorMessage(
          "Krisp AI cancellation is not supported on this browser (requires Safari 17.4+ or a modern browser with AudioWorklet)."
        );
        return false;
      }

      const targetTrack = overrideTrack ?? getLocalMicrophoneTrack();
      if (!targetTrack) {
        // Requirement 9: Do not falsely display Krisp ON unless the processor is successfully attached and enabled.
        setKrispState("off");
        setKrispErrorMessage("Please unmute your microphone to activate Krisp noise cancellation.");
        return false;
      }

      setKrispState("loading");
      setKrispErrorMessage(null);

      try {
        // Requirement 2 & 13: Dynamically import KrispNoiseFilter only when user activates it
        const { KrispNoiseFilter, isKrispNoiseFilterSupported } = await import(
          "@livekit/krisp-noise-filter"
        );

        if (typeof isKrispNoiseFilterSupported === "function" && !isKrispNoiseFilterSupported()) {
          setKrispState("unsupported");
          setKrispErrorMessage("Krisp is not supported on this browser according to LiveKit SDK.");
          return false;
        }

        // Ensure target audio track has an audioContext before setting processor (LiveKit requirement)
        if (!(targetTrack as any).audioContext) {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            await targetTrack.setAudioContext(ctx);
          }
        }

        let processor = processorRef.current;
        if (!processor) {
          processor = KrispNoiseFilter();
          processorRef.current = processor;
        }

        // Attach processor using setProcessor() if not already attached
        const currentProcessor = targetTrack.getProcessor();
        if (currentProcessor !== processor) {
          await targetTrack.setProcessor(processor);
        }

        // Enable processor via official API
        await processor.setEnabled(true);

        if (processor.isEnabled()) {
          setKrispState("on");
          setKrispErrorMessage(null);
          return true;
        } else {
          throw new Error("Krisp processor attached but isEnabled() returned false.");
        }
      } catch (err: any) {
        console.warn("[useNoiseFilter] Krisp activation failed:", err);
        // Requirement 10: Preserve microphone functionality if Krisp initialization fails. Automatically retain the basic WebRTC fallback.
        try {
          if (targetTrack.getProcessor()) {
            await targetTrack.stopProcessor();
          }
        } catch {}
        processorRef.current = null;
        setKrispState("failed");
        setKrispErrorMessage(
          err?.message ||
            "Failed to load Krisp noise cancellation model. Microphone remains active with standard WebRTC noise suppression."
        );
        return false;
      }
    },
    [getLocalMicrophoneTrack]
  );

  const toggleKrisp = useCallback(
    async (overrideTrack?: LocalAudioTrack | null): Promise<boolean> => {
      if (krispState === "on") {
        return await setKrispEnabled(false, overrideTrack);
      } else {
        return await setKrispEnabled(true, overrideTrack);
      }
    },
    [krispState, setKrispEnabled]
  );

  const reapplyKrispIfNeeded = useCallback(
    async (track?: LocalAudioTrack | null): Promise<void> => {
      if (!krispRequestedRef.current) return;
      const targetTrack = track ?? getLocalMicrophoneTrack();
      if (!targetTrack) return;

      const currentProcessor = targetTrack.getProcessor();
      if (currentProcessor && processorRef.current && currentProcessor === processorRef.current) {
        if (!processorRef.current.isEnabled()) {
          await processorRef.current.setEnabled(true);
        }
        setKrispState("on");
        return;
      }

      await setKrispEnabled(true, targetTrack);
    },
    [getLocalMicrophoneTrack, setKrispEnabled]
  );

  const cleanupKrisp = useCallback(async (): Promise<void> => {
    krispRequestedRef.current = false;
    const proc = processorRef.current;
    processorRef.current = null;

    if (proc) {
      try {
        await proc.destroy();
      } catch (err) {
        console.warn("[useNoiseFilter] Error destroying Krisp processor:", err);
      }
    }

    const track = getLocalMicrophoneTrack();
    if (track) {
      try {
        if (track.getProcessor()) {
          await track.stopProcessor();
        }
      } catch {}
    }

    setKrispState("off");
    setKrispErrorMessage(null);
  }, [getLocalMicrophoneTrack]);

  // Clean up processor when unmounting
  useEffect(() => {
    return () => {
      const proc = processorRef.current;
      if (proc) {
        proc.destroy().catch(() => {});
        processorRef.current = null;
      }
    };
  }, []);

  return {
    isNoiseEnabled,
    isBrowserProcessingSupported,
    setNoiseEnabled,
    toggleNoise,
    label: isNoiseEnabled ? "Noise Reduction On" : "Noise Reduction Off",
    krispState,
    isKrispSupported,
    krispErrorMessage,
    toggleKrisp,
    setKrispEnabled,
    reapplyKrispIfNeeded,
    cleanupKrisp,
  };
}
