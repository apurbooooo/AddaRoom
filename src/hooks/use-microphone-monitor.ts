"use client";

import { useCallback, useEffect, useState } from "react";
import type { LocalAudioTrack } from "livekit-client";

export interface MicrophoneMonitor {
  level: number;
  devices: MediaDeviceInfo[];
  refreshDevices: () => Promise<void>;
}

export function useMicrophoneMonitor(track?: LocalAudioTrack | null): MicrophoneMonitor {
  const [level, setLevel] = useState(0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const refreshDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices(list.filter((device) => device.kind === "audioinput"));
    } catch {
      setDevices([]);
    }
  }, []);

  useEffect(() => {
    void refreshDevices();
    const handler = () => void refreshDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", handler);
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", handler);
  }, [refreshDevices]);

  useEffect(() => {
    if (!track?.mediaStreamTrack || typeof window === "undefined") {
      setLevel(0);
      return;
    }
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const context = new AudioContextCtor();
    const stream = new MediaStream([track.mediaStreamTrack]);
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;
    let smoothed = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const value of data) {
        const normalized = (value - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / data.length);
      smoothed = smoothed * 0.78 + Math.min(1, rms * 3.2) * 0.22;
      setLevel(Math.round(smoothed * 100));
      frame = requestAnimationFrame(tick);
    };
    void context.resume().catch(() => {});
    tick();
    return () => {
      cancelAnimationFrame(frame);
      source.disconnect();
      analyser.disconnect();
      void context.close().catch(() => {});
      setLevel(0);
    };
  }, [track]);

  return { level, devices, refreshDevices };
}
