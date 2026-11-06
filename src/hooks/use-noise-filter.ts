"use client";

import { useState, useCallback } from "react";

const STORAGE_KEY = "addaroom_noise_filter";

function readPersistedNoise(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true";
  } catch {
    return true;
  }
}

export interface UseNoiseFilterResult {
  isNoiseEnabled: boolean;
  toggleNoise: () => void;
  label: string;
}

/**
 * Manages browser-level WebRTC noise reduction preferences.
 * Returns { isNoiseEnabled, toggleNoise, label }.
 * When enabled: noiseSuppression/echoCancellation/autoGainControl = true.
 * When disabled: same constraints set to false.
 * Persists preference to localStorage key "addaroom_noise_filter".
 */
export function useNoiseFilter(): UseNoiseFilterResult {
  const [isNoiseEnabled, setIsNoiseEnabled] = useState<boolean>(() =>
    readPersistedNoise()
  );

  const toggleNoise = useCallback(() => {
    setIsNoiseEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  return {
    isNoiseEnabled,
    toggleNoise,
    label: isNoiseEnabled ? "Noise Reduction On" : "Noise Reduction Off",
  };
}
