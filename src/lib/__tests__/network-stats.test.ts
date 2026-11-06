import { describe, expect, it } from "vitest";
import { mapLiveKitQuality, readSelectedPairRtt, validateNetworkTelemetry } from "@/lib/network-stats";
import { ConnectionQuality } from "livekit-client";

describe("network telemetry", () => {
  it("reads RTT from the selected ICE candidate pair only", () => {
    const report = new Map<string, any>([
      ["transport", { id: "transport", type: "transport", selectedCandidatePairId: "selected" }],
      ["selected", { id: "selected", type: "candidate-pair", currentRoundTripTime: 0.042 }],
      ["other", { id: "other", type: "candidate-pair", nominated: true, state: "succeeded", currentRoundTripTime: 0.5 }],
    ]) as unknown as RTCStatsReport;
    expect(readSelectedPairRtt(report)).toBe(42);
  });

  it("returns unavailable when no selected candidate pair has RTT", () => {
    expect(readSelectedPairRtt(new Map() as unknown as RTCStatsReport)).toBeNull();
  });

  it("accepts valid versioned self-reports and rejects malformed or stale reports", () => {
    const now = 100000;
    expect(validateNetworkTelemetry({ type: "network_telemetry", version: 1, rttMs: 185, sentAt: now }, now)).toEqual({ rttMs: 185, sentAt: now });
    expect(validateNetworkTelemetry({ type: "network_telemetry", version: 2, rttMs: 20, sentAt: now }, now)).toBeNull();
    expect(validateNetworkTelemetry({ type: "network_telemetry", version: 1, rttMs: -1, sentAt: now }, now)).toBeNull();
    expect(validateNetworkTelemetry({ type: "network_telemetry", version: 1, rttMs: 20, sentAt: now - 11000 }, now)).toBeNull();
  });

  it("does not turn unknown LiveKit quality into a good state", () => {
    expect(mapLiveKitQuality(ConnectionQuality.Unknown)).toBe("unknown");
    expect(mapLiveKitQuality(ConnectionQuality.Lost)).toBe("lost");
  });
});
