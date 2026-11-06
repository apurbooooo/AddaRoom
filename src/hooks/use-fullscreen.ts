"use client";

import { useState, useCallback, useEffect } from "react";

interface UseFullscreenReturn {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  isSupported: boolean;
}

/**
 * Manages browser fullscreen state.
 * Handles iOS Safari gracefully (fullscreen API unavailable).
 */
export function useFullscreen(): UseFullscreenReturn {
  const isSupported =
    typeof document !== "undefined" &&
    typeof document.documentElement.requestFullscreen === "function";

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isSupported) return;
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handler);
    document.addEventListener("webkitfullscreenchange", handler);
    return () => {
      document.removeEventListener("fullscreenchange", handler);
      document.removeEventListener("webkitfullscreenchange", handler);
    };
  }, [isSupported]);

  const toggleFullscreen = useCallback(async () => {
    if (!isSupported) return;
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn("[useFullscreen] Fullscreen toggle failed:", err);
    }
  }, [isSupported]);

  return { isFullscreen, toggleFullscreen, isSupported };
}
