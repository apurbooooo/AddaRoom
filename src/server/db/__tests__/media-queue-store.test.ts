import { describe, expect, it } from "vitest";
import { MediaQueueStore, StalePlaybackVersionError } from "@/server/db/media-queue-store";

describe("media queue repository", () => {
  it("persists an item and initializes playback for a room", async () => {
    const store = new MediaQueueStore();
    const item = await store.addItem({ roomCode: "queue-test-1", sourceType: "youtube", sourceUrl: "https://youtu.be/dQw4w9WgXcQ", title: "Video", ownerParticipantId: "part-owner" });
    const snapshot = await store.getSnapshot("queue-test-1");
    expect(snapshot.items[0].id).toBe(item.id);
    expect(snapshot.playback?.currentItemId).toBe(item.id);
  });
  it("rejects unsupported direct URLs before persistence", async () => {
    const store = new MediaQueueStore();
    await expect(store.addItem({ roomCode: "queue-test-2", sourceType: "direct", sourceUrl: "file:///private/movie.mp4", title: "Movie", ownerParticipantId: "part-owner" })).rejects.toThrow();
  });
  it("rejects stale playback versions", async () => {
    const store = new MediaQueueStore();
    await store.addItem({ roomCode: "queue-test-3", sourceType: "youtube", sourceUrl: "dQw4w9WgXcQ", title: "Video", ownerParticipantId: "part-owner" });
    const first = await store.updatePlayback({ roomCode: "queue-test-3", participantId: "part-owner", currentItemId: null, playbackState: "playing", positionSeconds: 0, expectedVersion: 0 });
    expect(first.version).toBe(1);
    await expect(store.updatePlayback({ roomCode: "queue-test-3", participantId: "part-owner", currentItemId: null, playbackState: "paused", positionSeconds: 1, expectedVersion: 0 })).rejects.toBeInstanceOf(StalePlaybackVersionError);
  });
  it("reindexes remaining items after deletion", async () => {
    const store = new MediaQueueStore();
    const first = await store.addItem({ roomCode: "queue-test-4", sourceType: "youtube", sourceUrl: "dQw4w9WgXcQ", title: "One", ownerParticipantId: "part-owner" });
    await store.addItem({ roomCode: "queue-test-4", sourceType: "youtube", sourceUrl: "dQw4w9WgXcQ", title: "Two", ownerParticipantId: "part-owner" });
    await store.removeItem("queue-test-4", first.id);
    const snapshot = await store.getSnapshot("queue-test-4");
    expect(snapshot.items).toHaveLength(1);
    expect(snapshot.items[0].position).toBe(0);
  });
});
