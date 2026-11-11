import { beforeEach, describe, expect, it, vi } from "vitest";
import { SoundEffectManager } from "@/lib/sound-effects";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  clear() { this.values.clear(); }
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state: AudioContextState = "suspended";
  currentTime = 1;
  destination = {};
  resume = vi.fn(async () => { this.state = "running"; });
  addEventListener = vi.fn();
  createOscillator = vi.fn(() => ({
    type: "sine" as OscillatorType,
    frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
    addEventListener: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }));
  createGain = vi.fn(() => ({
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));

  constructor() { FakeAudioContext.instances.push(this); }
}

describe("SoundEffectManager", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    FakeAudioContext.instances = [];
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("window", { AudioContext: FakeAudioContext });
    vi.stubGlobal("navigator", {});
  });

  it("uses one reusable context and deduplicates an event sound", async () => {
    const manager = new SoundEffectManager();
    expect(manager.needsUserGesture()).toBe(true);
    expect(await manager.unlock()).toBe(true);
    manager.playOnce("incoming:1", "messageIncoming");
    manager.playOnce("incoming:1", "messageIncoming");

    expect(FakeAudioContext.instances).toHaveLength(1);
    expect(FakeAudioContext.instances[0].createOscillator).toHaveBeenCalledTimes(1);
  });

  it("master sound and individual categories gate every sound", () => {
    const manager = new SoundEffectManager();
    manager.setEnabled(false);
    manager.play("messageIncoming");
    manager.setEnabled(true);
    manager.setCategoryEnabled("reactions", false);
    manager.play("reaction");

    expect(FakeAudioContext.instances).toHaveLength(0);
    expect(storage.getItem("addaroom_sound_category_reactions")).toBe("false");
  });

  it.each([
    ["messageIncoming", "chat"], ["messageSent", "chat"],
    ["reaction", "reactions"], ["handRaised", "handRaise"], ["handLowered", "handRaise"],
    ["microphoneOn", "microphone"], ["microphoneOff", "microphone"],
    ["remoteMicrophoneOn", "remoteMicrophone"], ["remoteMicrophoneOff", "remoteMicrophone"],
    ["cameraOn", "camera"], ["cameraOff", "camera"],
    ["join", "participants"], ["leave", "participants"],
    ["screenShareOn", "screenShare"], ["screenShareOff", "screenShare"],
    ["success", "roomActions"], ["error", "roomActions"], ["roomAction", "roomActions"],
    ["queueChange", "mediaQueue"], ["playback", "mediaQueue"],
  ] as const)("respects the %s sound category", (effect, category) => {
    const manager = new SoundEffectManager();
    manager.setCategoryEnabled(category, false);
    manager.play(effect);
    expect(FakeAudioContext.instances).toHaveLength(0);
  });

  it("persists independent sound and vibration preferences and volume", () => {
    const manager = new SoundEffectManager();
    manager.setCategoryEnabled("remoteMicrophone", true);
    manager.setVibrationEnabled(false);
    manager.setVibrationCategoryEnabled("camera", false);
    manager.setVolume(0.35);

    expect(manager.isCategoryEnabled("remoteMicrophone")).toBe(true);
    expect(manager.isVibrationEnabled()).toBe(false);
    expect(manager.getVolume()).toBe(0.35);
    expect(storage.getItem("addaroom_sound_category_remoteMicrophone")).toBe("true");
    expect(storage.getItem("addaroom_vibration_enabled")).toBe("false");
    expect(storage.getItem("addaroom_vibration_category_camera")).toBe("false");
    expect(storage.getItem("addaroom_sound_volume")).toBe("0.35");
  });

  it("reports vibration support by feature detection and swallows unsupported API failures", () => {
    const manager = new SoundEffectManager();
    expect(manager.isVibrationSupported()).toBe(false);
    manager.vibrate("chat");

    const vibrate = vi.fn(() => { throw new Error("browser denied vibration"); });
    vi.stubGlobal("navigator", { vibrate });
    expect(manager.isVibrationSupported()).toBe(true);
    expect(() => manager.vibrate("chat", [20, 30, 20])).not.toThrow();
    expect(vibrate).toHaveBeenCalledWith([20, 30, 20]);
  });

  it("respects master and individual vibration preferences", () => {
    const manager = new SoundEffectManager();
    const vibrate = vi.fn(() => true);
    vi.stubGlobal("navigator", { vibrate });
    manager.setVibrationCategoryEnabled("reactions", false);
    manager.vibrate("reactions", 18);
    manager.vibrate("chat", 28);
    manager.setVibrationEnabled(false);
    manager.vibrate("chat", 28);
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith(28);
  });
});
