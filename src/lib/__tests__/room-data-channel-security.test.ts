import { describe, expect, it } from "vitest";
import { isModerationPacketAuthorized } from "@/hooks/use-room-data-channel";

describe("Room Data Channel Security & Moderation Verification", () => {
  const VERIFIED_HOST_ID = "part_verified_host_123";
  const ATTACKER_ID = "part_attacker_456";
  const NORMAL_MEMBER_ID = "part_member_789";

  describe("1. Valid server-originated moderation packet", () => {
    it("accepts packet when participant is undefined, participantIdentity is undefined, and topic is 'server-room-control'", () => {
      const authorized = isModerationPacketAuthorized(
        undefined,
        "server-room-control",
        VERIFIED_HOST_ID,
        undefined,
      );
      expect(authorized).toBe(true);
    });

    it("accepts packet when participant is null, participantIdentity is empty string, and topic is 'server-room-control'", () => {
      const authorized = isModerationPacketAuthorized(
        null,
        "server-room-control",
        VERIFIED_HOST_ID,
        "",
      );
      expect(authorized).toBe(true);
    });

    it("accepts server moderation packet even before authorizedHostId is loaded", () => {
      const authorized = isModerationPacketAuthorized(
        undefined,
        "server-room-control",
        undefined,
        undefined,
      );
      expect(authorized).toBe(true);
    });
  });

  describe("2. Participant undefined with attacker participantIdentity (SDK edge case)", () => {
    it("rejects packet when participant is undefined but attacker participantIdentity is present with server topic", () => {
      // In LiveKit v2.23.0, if a participant publishes data and disconnects or is missing from
      // remoteParticipants map, participant can be undefined while participantIdentity is still populated.
      // This packet must NEVER be accepted as server-originated!
      const authorized = isModerationPacketAuthorized(
        undefined,
        "server-room-control",
        VERIFIED_HOST_ID,
        ATTACKER_ID,
      );

      expect(authorized).toBe(false);
    });

    it("rejects packet when participant is null but attacker participantIdentity is present", () => {
      const authorized = isModerationPacketAuthorized(
        null,
        "server-room-control",
        VERIFIED_HOST_ID,
        "part_spoofer_999",
      );

      expect(authorized).toBe(false);
    });
  });

  describe("3. Participant present with mismatched participantIdentity", () => {
    it("rejects packet when participant identity and participantIdentity do not match", () => {
      // Inconsistent sender information
      const authorized = isModerationPacketAuthorized(
        { identity: VERIFIED_HOST_ID },
        undefined,
        VERIFIED_HOST_ID,
        ATTACKER_ID, // Mismatched 6th argument
      );

      expect(authorized).toBe(false);
    });

    it("rejects packet when participant is attacker but participantIdentity claims host", () => {
      const authorized = isModerationPacketAuthorized(
        { identity: ATTACKER_ID },
        undefined,
        VERIFIED_HOST_ID,
        VERIFIED_HOST_ID, // Mismatched 6th argument
      );

      expect(authorized).toBe(false);
    });
  });

  describe("4. Participant present with authorized host identity", () => {
    it("accepts packet when participant.identity matches authorizedHostId and participantIdentity matches", () => {
      const authorized = isModerationPacketAuthorized(
        { identity: VERIFIED_HOST_ID },
        undefined,
        VERIFIED_HOST_ID,
        VERIFIED_HOST_ID,
      );

      expect(authorized).toBe(true);
    });

    it("accepts packet when participant.identity matches authorizedHostId and participantIdentity is omitted", () => {
      const authorized = isModerationPacketAuthorized(
        { identity: VERIFIED_HOST_ID },
        undefined,
        VERIFIED_HOST_ID,
        undefined,
      );

      expect(authorized).toBe(true);
    });
  });

  describe("5. Participant present with unauthorized identity", () => {
    it("rejects packet when participant.identity is an attacker identity", () => {
      const authorized = isModerationPacketAuthorized(
        { identity: ATTACKER_ID },
        undefined,
        VERIFIED_HOST_ID,
        ATTACKER_ID,
      );

      expect(authorized).toBe(false);
    });

    it("rejects packet when participant attaches server-room-control topic", () => {
      const authorized = isModerationPacketAuthorized(
        { identity: ATTACKER_ID },
        "server-room-control",
        VERIFIED_HOST_ID,
        ATTACKER_ID,
      );

      expect(authorized).toBe(false);
    });

    it("rejects packet from a normal room member attempting to broadcast moderation", () => {
      const authorized = isModerationPacketAuthorized(
        { identity: NORMAL_MEMBER_ID },
        undefined,
        VERIFIED_HOST_ID,
        NORMAL_MEMBER_ID,
      );

      expect(authorized).toBe(false);
    });
  });

  describe("6. Missing topic and invalid sender identity", () => {
    it("rejects packet when topic is missing and participant is undefined", () => {
      const authorized = isModerationPacketAuthorized(
        undefined,
        undefined,
        VERIFIED_HOST_ID,
        undefined,
      );

      expect(authorized).toBe(false);
    });

    it("rejects packet when topic is empty string and participant is undefined", () => {
      const authorized = isModerationPacketAuthorized(
        undefined,
        "",
        VERIFIED_HOST_ID,
        "",
      );

      expect(authorized).toBe(false);
    });

    it("rejects packet when participant has empty identity string and topic is missing", () => {
      const authorized = isModerationPacketAuthorized(
        { identity: "" },
        undefined,
        VERIFIED_HOST_ID,
        "",
      );

      expect(authorized).toBe(false);
    });

    it("rejects packet when participant has whitespace identity string", () => {
      const authorized = isModerationPacketAuthorized(
        { identity: "   " },
        undefined,
        VERIFIED_HOST_ID,
        "   ",
      );

      expect(authorized).toBe(false);
    });

    it("rejects packet when authorizedHostId is undefined or whitespace", () => {
      expect(
        isModerationPacketAuthorized(
          { identity: VERIFIED_HOST_ID },
          undefined,
          undefined,
          VERIFIED_HOST_ID,
        ),
      ).toBe(false);

      expect(
        isModerationPacketAuthorized(
          { identity: VERIFIED_HOST_ID },
          undefined,
          "   ",
          VERIFIED_HOST_ID,
        ),
      ).toBe(false);
    });

    it("rejects server-style packet if topic is not 'server-room-control'", () => {
      expect(
        isModerationPacketAuthorized(undefined, "chat", VERIFIED_HOST_ID, undefined),
      ).toBe(false);
      expect(
        isModerationPacketAuthorized(undefined, "media_sync", VERIFIED_HOST_ID, undefined),
      ).toBe(false);
    });
  });

  describe("7. End-to-end packet processing simulation with 6th argument", () => {
    interface SimulatedState {
      kicked: boolean;
      ended: boolean;
    }

    function processIncomingPacket(
      payloadStr: string,
      participant: { identity?: string } | undefined,
      topic: string | undefined,
      currentParticipantId: string,
      authorizedHostId: string | undefined,
      participantIdentity: string | undefined,
      state: SimulatedState,
    ): boolean {
      try {
        const data = JSON.parse(payloadStr);
        if (data.type === "host_command") {
          if (!isModerationPacketAuthorized(participant, topic, authorizedHostId, participantIdentity)) {
            return false;
          }
          if (data.action === "kick" && data.targetParticipantId === currentParticipantId) {
            state.kicked = true;
          }
          if (data.action === "room_ended") {
            state.ended = true;
          }
          return true;
        }
        return true;
      } catch {
        return false;
      }
    }

    it("executes kick when valid server-originated packet arrives", () => {
      const state: SimulatedState = { kicked: false, ended: false };
      const payload = JSON.stringify({
        type: "host_command",
        action: "kick",
        targetParticipantId: "part_target_user",
      });

      const accepted = processIncomingPacket(
        payload,
        undefined,
        "server-room-control",
        "part_target_user",
        VERIFIED_HOST_ID,
        undefined,
        state,
      );

      expect(accepted).toBe(true);
      expect(state.kicked).toBe(true);
    });

    it("rejects spoofed server packet where participant is undefined but participantIdentity is attacker", () => {
      const state: SimulatedState = { kicked: false, ended: false };
      const payload = JSON.stringify({
        type: "host_command",
        action: "kick",
        targetParticipantId: "part_target_user",
      });

      const accepted = processIncomingPacket(
        payload,
        undefined,
        "server-room-control",
        "part_target_user",
        VERIFIED_HOST_ID,
        ATTACKER_ID, // 6th argument from SFU reveals actual sender
        state,
      );

      expect(accepted).toBe(false);
      expect(state.kicked).toBe(false);
    });

    it("rejects packet when attacker impersonates host with mismatched identity", () => {
      const state: SimulatedState = { kicked: false, ended: false };
      const payload = JSON.stringify({
        type: "host_command",
        action: "room_ended",
      });

      const accepted = processIncomingPacket(
        payload,
        { identity: ATTACKER_ID },
        undefined,
        "part_member",
        VERIFIED_HOST_ID,
        ATTACKER_ID,
        state,
      );

      expect(accepted).toBe(false);
      expect(state.ended).toBe(false);
    });

    it("accepts room_ended from verified host with matching participant and participantIdentity", () => {
      const state: SimulatedState = { kicked: false, ended: false };
      const payload = JSON.stringify({
        type: "host_command",
        action: "room_ended",
      });

      const accepted = processIncomingPacket(
        payload,
        { identity: VERIFIED_HOST_ID },
        undefined,
        "part_member",
        VERIFIED_HOST_ID,
        VERIFIED_HOST_ID,
        state,
      );

      expect(accepted).toBe(true);
      expect(state.ended).toBe(true);
    });
  });
});
