import { describe, expect, it } from "vitest";
import { extractYouTubeVideoId, validateDirectMediaUrl } from "@/lib/media-source-validation";

describe("media source validation", () => {
  it("extracts standard YouTube watch URLs", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("extracts shorts and youtu.be URLs", () => {
    expect(extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeVideoId("https://youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("rejects malformed YouTube identifiers", () => {
    expect(extractYouTubeVideoId("https://youtube.com/watch?v=bad")).toBeNull();
  });
  it("accepts supported direct media URL extensions", () => {
    expect(validateDirectMediaUrl("https://cdn.example.test/video.mp4")).toEqual({ ok: true, url: "https://cdn.example.test/video.mp4" });
    expect(validateDirectMediaUrl("https://cdn.example.test/video.webm").ok).toBe(true);
  });
  it("accepts extensionless URLs because the response MIME type is authoritative", () => {
    expect(validateDirectMediaUrl("https://cdn.example.test/media").ok).toBe(true);
  });
  it("rejects unsupported protocols", () => {
    expect(validateDirectMediaUrl("file:///tmp/video.mp4").ok).toBe(false);
  });
  it("rejects malformed URLs", () => {
    expect(validateDirectMediaUrl("not a url").ok).toBe(false);
  });
  it("rejects obvious unsupported extensions with an honest explanation", () => {
    const result = validateDirectMediaUrl("https://example.test/page.html");
    expect(result.ok).toBe(false);
  });
});
