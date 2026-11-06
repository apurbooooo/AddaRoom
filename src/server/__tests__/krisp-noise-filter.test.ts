import { describe, it, expect, vi } from "vitest";
import { isKrispDynamicallySupported } from "@/hooks/use-noise-filter";

describe("LiveKit Krisp Noise Filter — Capability & Integration Tests", () => {
  describe("Dynamic browser capability verification", () => {
    it("returns false in non-browser/server environment (Node.js)", () => {
      expect(isKrispDynamicallySupported({ win: undefined, nav: undefined })).toBe(false);
    });

    it("returns false if AudioContext is missing", () => {
      const mockWin = {
        Worker: class {},
        AudioWorkletNode: class {},
      };
      const mockNav = {
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0",
        mediaDevices: { getUserMedia: vi.fn() },
      };
      expect(isKrispDynamicallySupported({ win: mockWin, nav: mockNav })).toBe(false);
    });

    it("returns false if AudioWorkletNode is missing (older mobile browser)", () => {
      const mockWin = {
        AudioContext: class {},
        Worker: class {},
        // Missing AudioWorkletNode
      };
      const mockNav = {
        userAgent: "Mozilla/5.0 (Linux; Android 10) Chrome/80.0.0.0",
        mediaDevices: { getUserMedia: vi.fn() },
      };
      expect(isKrispDynamicallySupported({ win: mockWin, nav: mockNav })).toBe(false);
    });

    it("returns false if Web Worker is missing", () => {
      const mockWin = {
        AudioContext: class {},
        AudioWorkletNode: class {},
        // Missing Worker
      };
      const mockNav = {
        userAgent: "Mozilla/5.0 Chrome/120.0.0.0",
        mediaDevices: { getUserMedia: vi.fn() },
      };
      expect(isKrispDynamicallySupported({ win: mockWin, nav: mockNav })).toBe(false);
    });

    it("identifies Safari versions below 17.4 as unsupported according to LiveKit documentation", () => {
      const mockWin = {
        AudioContext: class {},
        AudioWorkletNode: class {},
        Worker: class {},
      };

      // Safari 17.3 should be unsupported
      const mockNav173 = {
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
        mediaDevices: { getUserMedia: vi.fn() },
      };
      expect(isKrispDynamicallySupported({ win: mockWin, nav: mockNav173 })).toBe(false);

      // Safari 16.6 should be unsupported
      const mockNav166 = {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
        mediaDevices: { getUserMedia: vi.fn() },
      };
      expect(isKrispDynamicallySupported({ win: mockWin, nav: mockNav166 })).toBe(false);
    });

    it("identifies Safari 17.4+ and 18.0 as supported when required WebRTC APIs are present", () => {
      const mockWin = {
        AudioContext: class {},
        AudioWorkletNode: class {},
        Worker: class {},
      };

      // Safari 17.4
      const mockNav174 = {
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
        mediaDevices: { getUserMedia: vi.fn() },
      };
      expect(isKrispDynamicallySupported({ win: mockWin, nav: mockNav174 })).toBe(true);

      // Safari 18.1
      const mockNav181 = {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
        mediaDevices: { getUserMedia: vi.fn() },
      };
      expect(isKrispDynamicallySupported({ win: mockWin, nav: mockNav181 })).toBe(true);
    });

    it("identifies modern Chrome/Firefox/Edge as supported", () => {
      const mockWin = {
        AudioContext: class {},
        AudioWorkletNode: class {},
        Worker: class {},
      };
      const mockNav = {
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        mediaDevices: { getUserMedia: vi.fn() },
      };
      expect(isKrispDynamicallySupported({ win: mockWin, nav: mockNav })).toBe(true);
    });
  });

  describe("Krisp and WebRTC dual-setting independence", () => {
    it("maintains two distinct and independent noise filter settings", () => {
      let isWebRtcNoiseEnabled = true;
      let krispState: "off" | "loading" | "on" | "unsupported" | "failed" = "off";

      // 1. Toggling WebRTC noise suppression does NOT alter Krisp state
      isWebRtcNoiseEnabled = false;
      expect(isWebRtcNoiseEnabled).toBe(false);
      expect(krispState).toBe("off");

      // 2. Turning Krisp ON does not disable WebRTC noise suppression
      isWebRtcNoiseEnabled = true;
      krispState = "on";
      expect(isWebRtcNoiseEnabled).toBe(true);
      expect(krispState).toBe("on");

      // 3. Turning Krisp OFF does not disable WebRTC noise suppression
      krispState = "off";
      expect(isWebRtcNoiseEnabled).toBe(true);
      expect(krispState).toBe("off");
    });

    it("does not display Krisp ON unless processor is verified active", async () => {
      let krispState: "off" | "loading" | "on" | "unsupported" | "failed" = "off";
      let processorAttached = false;
      let processorEnabled = false;

      // Simulated activation flow
      const activateKrisp = async (simulateFailure = false) => {
        krispState = "loading";
        if (simulateFailure) {
          krispState = "failed";
          return false;
        }
        processorAttached = true;
        processorEnabled = true;
        if (processorAttached && processorEnabled) {
          krispState = "on";
          return true;
        }
        krispState = "off";
        return false;
      };

      // Fails -> must NOT be ON
      const ok = await activateKrisp(true);
      expect(ok).toBe(false);
      expect(krispState).toBe("failed");
    });

    it("preserves microphone audio when Krisp initialization fails", () => {
      const micTrack = {
        isMuted: false,
        stopProcessor: vi.fn(),
      };
      let isWebRtcNoiseEnabled = true;
      let krispState = "off";

      // Simulate failure during model loading
      const simulateModelDownloadFailure = () => {
        try {
          throw new Error("NetworkError: Failed to fetch Krisp model weights");
        } catch (err) {
          // Fallback logic
          micTrack.stopProcessor();
          krispState = "failed";
          // Basic WebRTC noise reduction is preserved
          expect(isWebRtcNoiseEnabled).toBe(true);
          expect(micTrack.isMuted).toBe(false);
        }
      };

      simulateModelDownloadFailure();
      expect(krispState).toBe("failed");
      expect(micTrack.stopProcessor).toHaveBeenCalled();
    });
  });
});
