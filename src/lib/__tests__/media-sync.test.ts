import { describe, expect, it } from "vitest";
import { projectedPlaybackTime, shouldAcceptPlaybackVersion } from "@/lib/media-sync";

describe("media synchronization helpers", () => {
  it("projects a playing timestamp using the sender clock", () => {
    expect(projectedPlaybackTime(10, true, 1_000, 2_500)).toBe(11.5);
  });
  it("does not project paused timestamps", () => {
    expect(projectedPlaybackTime(10, false, 1_000, 2_500)).toBe(10);
  });
  it("never projects backwards for a future sender timestamp", () => {
    expect(projectedPlaybackTime(10, true, 3_000, 2_500)).toBe(10);
  });
  it("rejects equal and older versions", () => {
    expect(shouldAcceptPlaybackVersion(4, 4)).toBe(false);
    expect(shouldAcceptPlaybackVersion(3, 4)).toBe(false);
  });
  it("accepts newer and legacy unversioned packets", () => {
    expect(shouldAcceptPlaybackVersion(5, 4)).toBe(true);
    expect(shouldAcceptPlaybackVersion(undefined, 99)).toBe(true);
  });
});
