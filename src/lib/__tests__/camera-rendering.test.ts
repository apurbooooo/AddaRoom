import { describe, expect, it } from "vitest";
import { Track } from "livekit-client";
import { getCameraRenderState, getCameraTransform, isRenderableCameraTrack } from "@/lib/camera-rendering";

describe("camera rendering state", () => {
  it("shows off when no camera publication exists", () => expect(getCameraRenderState(undefined)).toBe("off"));
  it("shows initializing for a published camera without an attached track", () => expect(getCameraRenderState({})).toBe("initializing"));
  it("shows ready only when a track exists", () => expect(getCameraRenderState({ track: {} })).toBe("ready"));
  it("shows muted for a muted publication", () => expect(getCameraRenderState({ track: {}, isMuted: true })).toBe("muted"));
  it("accepts only camera video tracks", () => {
    expect(isRenderableCameraTrack({ source: Track.Source.Camera, kind: Track.Kind.Video })).toBe(true);
    expect(isRenderableCameraTrack({ source: Track.Source.ScreenShare, kind: Track.Kind.Video })).toBe(false);
  });
  it("does not mirror local preview by default", () => expect(getCameraTransform({ isLocal: true, mirrorLocalPreview: false, source: Track.Source.Camera })).toBe("none"));
  it("ignores the legacy mirror flag for local camera previews", () => expect(getCameraTransform({ isLocal: true, mirrorLocalPreview: true, source: Track.Source.Camera })).toBe("none"));
  it("never mirrors remote camera, local camera, or screen share", () => {
    expect(getCameraTransform({ isLocal: true, mirrorLocalPreview: false, source: Track.Source.Camera })).toBe("none");
    expect(getCameraTransform({ isLocal: false, mirrorLocalPreview: true, source: Track.Source.Camera })).toBe("none");
    expect(getCameraTransform({ isLocal: true, mirrorLocalPreview: true, source: Track.Source.ScreenShare })).toBe("none");
  });
});
