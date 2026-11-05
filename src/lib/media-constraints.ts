import { ScreenShareQualityMode } from "@/types";
import { ScreenShareCaptureOptions } from "livekit-client";

export function isScreenShareSupported(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === "function");
}

export function getScreenShareOptions(mode: ScreenShareQualityMode): ScreenShareCaptureOptions {
  // Base configuration
  const audio = true; // Attempt system/tab audio if user checks the box

  switch (mode) {
    case "high":
      return {
        audio,
        resolution: {
          width: 1920,
          height: 1080,
          frameRate: 30,
        },
      };
    case "balanced":
      return {
        audio,
        resolution: {
          width: 1280,
          height: 720,
          frameRate: 30,
        },
      };
    case "saver":
      return {
        audio,
        resolution: {
          width: 854,
          height: 480,
          frameRate: 20,
        },
      };
    case "auto":
    default:
      return {
        audio,
        resolution: {
          width: 1920,
          height: 1080,
          frameRate: 30,
        },
      };
  }
}
