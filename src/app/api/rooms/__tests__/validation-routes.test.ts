import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/rate-limit", () => ({
  checkEndpointRateLimit: vi.fn().mockResolvedValue(true),
}));

describe("room validation API routes", () => {
  it("returns useful create-room validation details", async () => {
    const { POST } = await import("@/app/api/rooms/route");
    const response = await POST(new Request("http://localhost/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Valid title",
        capacity: 4,
        hostName: "Host",
        avatar: "unknown-avatar-id",
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "VALIDATION_ERROR",
      message: "Choose an avatar from the gallery",
      details: {
        fieldErrors: {
          avatar: ["Choose an avatar from the gallery"],
        },
      },
    });
  });

  it("returns useful join-room validation details", async () => {
    const { POST } = await import("@/app/api/rooms/[code]/join/route");
    const response = await POST(
      new Request("http://localhost/api/rooms/abcde/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: "Guest",
          avatar: "unknown-avatar-id",
        }),
      }),
      { params: Promise.resolve({ code: "abcde" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "VALIDATION_ERROR",
      message: "Choose an avatar from the gallery",
      details: {
        fieldErrors: {
          avatar: ["Choose an avatar from the gallery"],
        },
      },
    });
  });
});
