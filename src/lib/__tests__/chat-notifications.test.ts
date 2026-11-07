import { describe, expect, it } from "vitest";
import { selectIncomingMessages } from "@/lib/chat-notifications";

const message = (id: string, senderId: string) => ({ type: "chat" as const, id, senderId, senderName: senderId, avatar: "👋", text: `hello-${id}`, timestamp: Date.now() });

describe("chat notification selection", () => {
  it("selects only new messages from other participants", () => {
    const incoming = message("a", "other");
    expect(selectIncomingMessages([incoming, message("b", "self")], "self", new Set())).toHaveLength(1);
    expect(selectIncomingMessages([incoming], "self", new Set())).toEqual([incoming]);
  });
  it("suppresses duplicates after reconnect or repeated event delivery", () => {
    expect(selectIncomingMessages([message("a", "other"), message("b", "other")], "self", new Set(["a"])).map((item) => item.id)).toEqual(["b"]);
  });
  it("does not notify for own messages", () => {
    expect(selectIncomingMessages([message("self-1", "self")], "self", new Set())).toEqual([]);
  });
});
