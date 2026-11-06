import { describe, expect, it, vi } from "vitest";
import {
  createRoomConnectionAttempt,
  RoomConnectionClient,
} from "../room-connection-lifecycle";

function createClient(): RoomConnectionClient & { on: ReturnType<typeof vi.fn> } {
  return {
    on: vi.fn(),
    off: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
  };
}

describe("room connection lifecycle", () => {
  it("connects one supplied Room client and registers each listener once", async () => {
    const client = createClient();
    const handler = vi.fn();
    const attempt = createRoomConnectionAttempt(client, "wss://example.test", "safe-token", [
      { event: "connected", handler },
    ]);

    await Promise.all([attempt.connect(), attempt.connect()]);

    expect(client.connect).toHaveBeenCalledTimes(1);
    expect(client.on).toHaveBeenCalledTimes(1);
    expect(client.on).toHaveBeenCalledWith("connected", handler);
  });

  it("cleanup removes listeners and disconnects exactly once", () => {
    const client = createClient();
    const handler = vi.fn();
    const attempt = createRoomConnectionAttempt(client, "url", "token", [
      { event: "connected", handler },
      { event: "reconnecting", handler },
    ]);

    attempt.cleanup();
    attempt.cleanup();

    expect(client.off).toHaveBeenCalledTimes(2);
    expect(client.disconnect).toHaveBeenCalledTimes(1);
    expect(attempt.isActive()).toBe(false);
  });

  it("allows a retry as a new independent attempt without overlapping cleanup", async () => {
    const first = createClient();
    const second = createClient();
    const firstAttempt = createRoomConnectionAttempt(first, "url", "token", []);
    const secondAttempt = createRoomConnectionAttempt(second, "url", "token", []);

    await firstAttempt.connect();
    firstAttempt.cleanup();
    await secondAttempt.connect();

    expect(first.connect).toHaveBeenCalledTimes(1);
    expect(first.disconnect).toHaveBeenCalledTimes(1);
    expect(second.connect).toHaveBeenCalledTimes(1);
    expect(second.disconnect).not.toHaveBeenCalled();
  });

  it("rejects a permanently stalled connection after the configured timeout", async () => {
    vi.useFakeTimers();
    const client = createClient();
    client.connect = vi.fn().mockReturnValue(new Promise(() => {}));
    const attempt = createRoomConnectionAttempt(client, "url", "token", [], 100);
    const connection = attempt.connect();
    const rejection = expect(connection).rejects.toThrow("Connection timed out");

    await vi.advanceTimersByTimeAsync(100);

    await rejection;
    attempt.cleanup();
    vi.useRealTimers();
  });
});
