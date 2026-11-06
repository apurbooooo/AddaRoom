import { ScreenShareQualityMode } from "@/types";
import { ScreenShareCaptureOptions } from "livekit-client";

export function isScreenShareSupported(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === "function");
}

export function getScreenShareOptions(mode: ScreenShareQualityMode): ScreenShareCaptureOptions {
  // Ask the browser picker to offer system/tab audio. The browser still decides
  // whether the selected source can provide an audio track.
  const audio = true;
  const systemAudio = "include" as const;

  switch (mode) {
    case "high":
      return {
        audio,
        systemAudio,
        resolution: {
          width: 1920,
          height: 1080,
          frameRate: 30,
        },
      };
    case "high60":
      return {
        audio,
        systemAudio,
        resolution: {
          width: 1920,
          height: 1080,
          frameRate: 60,
        },
      };
    case "balanced":
      return {
        audio,
        systemAudio,
        resolution: {
          width: 1280,
          height: 720,
          frameRate: 30,
        },
      };
    case "saver":
      return {
        audio,
        systemAudio,
        resolution: {
          width: 854,
          height: 480,
          frameRate: 20,
        },
      };
    case "auto":
    default:
      // Leave capture selection to the browser and the user's display picker.
      return { audio, systemAudio };
  }
}

