import { IRoomStore, MemoryRoomStore } from "./room-store";
import { PostgresRoomStore } from "./postgres-store";

// Global singleton pattern to survive Next.js fast-refresh during dev
declare global {
  // eslint-disable-next-line no-var
  var __adda_room_store: IRoomStore | undefined;
}

function initRoomStore(): IRoomStore {
  const dbUrl = process.env.DATABASE_URL;

  if (dbUrl && dbUrl.startsWith("postgres")) {
    try {
      return new PostgresRoomStore(dbUrl);
    } catch (err) {
      console.warn("Failed to connect to PostgreSQL, falling back to MemoryRoomStore:", err);
      return new MemoryRoomStore();
    }
  }

  return new MemoryRoomStore();
}

export const roomStore: IRoomStore = globalThis.__adda_room_store ?? initRoomStore();

if (process.env.NODE_ENV !== "production") {
  globalThis.__adda_room_store = roomStore;
}

export * from "./room-store";
