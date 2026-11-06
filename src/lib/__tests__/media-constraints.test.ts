import { describe, expect, it } from "vitest";
import { getScreenShareOptions } from "@/lib/media-constraints";

describe("screen share capture presets", () => {
  it("requests 1080p at 30fps in High mode", () => {
    expect(getScreenShareOptions("high").resolution).toEqual({
      width: 1920,
      height: 1080,
      frameRate: 30,
    });
  });

  it("offers a separate optional 1080p 60fps request", () => {
    expect(getScreenShareOptions("high60").resolution).toEqual({
      width: 1920,
      height: 1080,
      frameRate: 60,
    });
  });

  it("leaves capture quality to the browser in Auto mode", () => {
    expect(getScreenShareOptions("auto")).toEqual({ audio: true, systemAudio: "include" });
  });
});
