import { Track } from "livekit-client";

export type CameraRenderState = "off" | "initializing" | "ready" | "muted";

export function getCameraRenderState(publication: { track?: unknown; isMuted?: boolean } | undefined): CameraRenderState {
  if (!publication) return "off";
  if (publication.isMuted) return "muted";
  if (publication.track) return "ready";
  return "initializing";
}

export function isRenderableCameraTrack(track: { source?: Track.Source; kind?: Track.Kind } | undefined): boolean {
  return track?.source === Track.Source.Camera && track?.kind === Track.Kind.Video;
}

export function getCameraTransform(options: { isLocal: boolean; mirrorLocalPreview?: boolean; source?: Track.Source }): string {
  // Camera frames are rendered exactly as published. Mirroring the local tile
  // also mirrors readable labels and controls overlaid on the video.
  return "none";
}
