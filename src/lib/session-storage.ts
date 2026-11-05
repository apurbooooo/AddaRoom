import { ClientSession } from "@/types";

const SESSION_PREFIX = "addaroom_session_";

export function saveRoomSession(session: ClientSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${SESSION_PREFIX}${session.roomCode.toLowerCase()}`, JSON.stringify(session));
  } catch (err) {
    console.warn("Failed to persist session to localStorage", err);
  }
}

export function getRoomSession(roomCode: string): ClientSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${SESSION_PREFIX}${roomCode.toLowerCase()}`);
    if (!raw) return null;
    return JSON.parse(raw) as ClientSession;
  } catch {
    return null;
  }
}

export function clearRoomSession(roomCode: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`${SESSION_PREFIX}${roomCode.toLowerCase()}`);
  } catch {}
}
