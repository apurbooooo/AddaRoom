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
    return new PostgresRoomStore(dbUrl);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL must point to PostgreSQL in production; in-memory storage is development/test only");
  }
  return new MemoryRoomStore();
}

function getRoomStore(): IRoomStore {
  if (globalThis.__adda_room_store) return globalThis.__adda_room_store;
  const store = initRoomStore();
  // Reuse the connection pool/store in all server runtimes, including Next.js
  // production workers. Module-level construction stays lazy for build-time imports.
  globalThis.__adda_room_store = store;
  return store;
}

export const roomStore: IRoomStore = new Proxy({} as IRoomStore, {
  get(_target, property) {
    const store = getRoomStore();
    const value = Reflect.get(store, property, store) as unknown;
    return typeof value === "function" ? value.bind(store) : value;
  },
});

export * from "./room-store";

