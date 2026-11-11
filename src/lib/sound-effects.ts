// One lazy Web Audio context powers every short, synthesized room sound.

const SOUND_KEY = "addaroom_sound_enabled";
const VOLUME_KEY = "addaroom_sound_volume";
const VIBRATION_KEY = "addaroom_vibration_enabled";
const CATEGORY_PREFIX = "addaroom_sound_category_";
const HAPTIC_PREFIX = "addaroom_vibration_category_";

export type SoundCategory =
  | "chat"
  | "reactions"
  | "handRaise"
  | "microphone"
  | "remoteMicrophone"
  | "camera"
  | "participants"
  | "screenShare"
  | "roomActions"
  | "mediaQueue";

export type VibrationCategory =
  | "chat"
  | "reactions"
  | "handRaise"
  | "microphone"
  | "camera"
  | "participants"
  | "roomEvents";

export type SoundEffect =
  | "messageIncoming"
  | "messageSent"
  | "reaction"
  | "handRaised"
  | "handLowered"
  | "microphoneOn"
  | "microphoneOff"
  | "remoteMicrophoneOn"
  | "remoteMicrophoneOff"
  | "cameraOn"
  | "cameraOff"
  | "join"
  | "leave"
  | "screenShareOn"
  | "screenShareOff"
  | "success"
  | "error"
  | "roomAction"
  | "queueChange"
  | "playback";

const SOUND_CATEGORIES: SoundCategory[] = ["chat", "reactions", "handRaise", "microphone", "remoteMicrophone", "camera", "participants", "screenShare", "roomActions", "mediaQueue"];
const VIBRATION_CATEGORIES: VibrationCategory[] = ["chat", "reactions", "handRaise", "microphone", "camera", "participants", "roomEvents"];
const DEFAULT_REMOTE_MIC_ENABLED = true;

const SOUND_DESIGN: Record<SoundEffect, { waveform: OscillatorType; start: number; end: number; duration: number; amplitude: number; category: SoundCategory }> = {
  messageIncoming: { waveform: "sine", start: 587, end: 880, duration: 0.13, amplitude: 0.045, category: "chat" },
  messageSent: { waveform: "sine", start: 480, end: 620, duration: 0.075, amplitude: 0.022, category: "chat" },
  reaction: { waveform: "triangle", start: 523, end: 784, duration: 0.11, amplitude: 0.035, category: "reactions" },
  handRaised: { waveform: "triangle", start: 620, end: 920, duration: 0.14, amplitude: 0.04, category: "handRaise" },
  handLowered: { waveform: "sine", start: 560, end: 430, duration: 0.1, amplitude: 0.026, category: "handRaise" },
  microphoneOn: { waveform: "triangle", start: 520, end: 760, duration: 0.11, amplitude: 0.04, category: "microphone" },
  microphoneOff: { waveform: "triangle", start: 760, end: 420, duration: 0.11, amplitude: 0.04, category: "microphone" },
  remoteMicrophoneOn: { waveform: "sine", start: 700, end: 900, duration: 0.09, amplitude: 0.027, category: "remoteMicrophone" },
  remoteMicrophoneOff: { waveform: "sine", start: 500, end: 350, duration: 0.09, amplitude: 0.026, category: "remoteMicrophone" },
  cameraOn: { waveform: "sine", start: 660, end: 820, duration: 0.09, amplitude: 0.026, category: "camera" },
  cameraOff: { waveform: "sine", start: 620, end: 440, duration: 0.09, amplitude: 0.026, category: "camera" },
  join: { waveform: "sine", start: 440, end: 700, duration: 0.16, amplitude: 0.032, category: "participants" },
  leave: { waveform: "sine", start: 620, end: 390, duration: 0.15, amplitude: 0.03, category: "participants" },
  screenShareOn: { waveform: "triangle", start: 550, end: 740, duration: 0.1, amplitude: 0.026, category: "screenShare" },
  screenShareOff: { waveform: "triangle", start: 620, end: 460, duration: 0.1, amplitude: 0.024, category: "screenShare" },
  success: { waveform: "sine", start: 620, end: 820, duration: 0.1, amplitude: 0.025, category: "roomActions" },
  error: { waveform: "triangle", start: 300, end: 190, duration: 0.17, amplitude: 0.035, category: "roomActions" },
  roomAction: { waveform: "sine", start: 540, end: 700, duration: 0.11, amplitude: 0.025, category: "roomActions" },
  queueChange: { waveform: "sine", start: 490, end: 650, duration: 0.1, amplitude: 0.024, category: "mediaQueue" },
  playback: { waveform: "triangle", start: 520, end: 690, duration: 0.11, amplitude: 0.026, category: "mediaQueue" },
};

function readBoolean(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value === "true";
  } catch {
    return fallback;
  }
}

function writeBoolean(key: string, value: boolean): void {
  try { localStorage.setItem(key, String(value)); } catch { /* Preferences are best-effort. */ }
}

function readVolume(): number {
  if (typeof window === "undefined") return 0.7;
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    if (raw === null) return 0.7;
    const value = Number(raw);
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.7;
  } catch {
    return 0.7;
  }
}

export class SoundEffectManager {
  private ctx: AudioContext | null = null;
  private soundEnabled = readBoolean(SOUND_KEY, true);
  private volume = readVolume();
  private vibrationEnabled = readBoolean(VIBRATION_KEY, true);
  private unlockedByUser = false;
  private categorySettings = new Map<SoundCategory, boolean>();
  private vibrationSettings = new Map<VibrationCategory, boolean>();
  private playedEventIds = new Set<string>();
  private nextStartAt = 0;
  private unlockPromise: Promise<boolean> | null = null;

  constructor() {
    for (const category of SOUND_CATEGORIES) {
      this.categorySettings.set(category, readBoolean(`${CATEGORY_PREFIX}${category}`, category !== "remoteMicrophone"));
    }
    // Retain existing user preferences after the categories were expanded.
    this.categorySettings.set("chat", readBoolean("addaroom_sound_chat", this.categorySettings.get("chat") ?? true));
    this.categorySettings.set("participants", readBoolean("addaroom_sound_participant", this.categorySettings.get("participants") ?? true));
    this.categorySettings.set("microphone", readBoolean("addaroom_sound_microphone", this.categorySettings.get("microphone") ?? true));
    this.categorySettings.set("remoteMicrophone", readBoolean("addaroom_sound_remote_microphone", this.categorySettings.get("remoteMicrophone") ?? DEFAULT_REMOTE_MIC_ENABLED));
    for (const category of VIBRATION_CATEGORIES) {
      this.vibrationSettings.set(category, readBoolean(`${HAPTIC_PREFIX}${category}`, true));
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        this.ctx = new AudioCtx();
        this.ctx.addEventListener("statechange", () => {
          if (this.ctx?.state !== "running") this.unlockedByUser = false;
        });
      } catch {
        this.ctx = null;
      }
    }
    return this.ctx;
  }

  public isEnabled(): boolean { return this.soundEnabled; }
  public setEnabled(enabled: boolean): void { this.soundEnabled = enabled; writeBoolean(SOUND_KEY, enabled); }
  public getVolume(): number { return this.volume; }
  public setVolume(value: number): void {
    this.volume = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : this.volume;
    try { localStorage.setItem(VOLUME_KEY, String(this.volume)); } catch { /* Preferences are best-effort. */ }
  }

  public isCategoryEnabled(category: SoundCategory): boolean { return this.categorySettings.get(category) ?? true; }
  public setCategoryEnabled(category: SoundCategory, enabled: boolean): void {
    this.categorySettings.set(category, enabled);
    writeBoolean(`${CATEGORY_PREFIX}${category}`, enabled);
    const legacyKey: Partial<Record<SoundCategory, string>> = { chat: "addaroom_sound_chat", participants: "addaroom_sound_participant", microphone: "addaroom_sound_microphone", remoteMicrophone: "addaroom_sound_remote_microphone" };
    if (legacyKey[category]) writeBoolean(legacyKey[category]!, enabled);
  }
  public getSoundCategories(): Record<SoundCategory, boolean> {
    return Object.fromEntries(SOUND_CATEGORIES.map((category) => [category, this.isCategoryEnabled(category)])) as Record<SoundCategory, boolean>;
  }

  public isVibrationEnabled(): boolean { return this.vibrationEnabled; }
  public setVibrationEnabled(enabled: boolean): void { this.vibrationEnabled = enabled; writeBoolean(VIBRATION_KEY, enabled); }
  public isVibrationCategoryEnabled(category: VibrationCategory): boolean { return this.vibrationSettings.get(category) ?? true; }
  public setVibrationCategoryEnabled(category: VibrationCategory, enabled: boolean): void {
    this.vibrationSettings.set(category, enabled);
    writeBoolean(`${HAPTIC_PREFIX}${category}`, enabled);
  }
  public getVibrationCategories(): Record<VibrationCategory, boolean> {
    return Object.fromEntries(VIBRATION_CATEGORIES.map((category) => [category, this.isVibrationCategoryEnabled(category)])) as Record<VibrationCategory, boolean>;
  }

  public isVibrationSupported(): boolean {
    return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
  }
  public vibrate(category: VibrationCategory, pattern: number | number[] = 28): void {
    if (!this.vibrationEnabled || !this.isVibrationCategoryEnabled(category) || !this.isVibrationSupported()) return;
    try { navigator.vibrate(pattern); } catch { /* Haptics are best-effort and must never interrupt room actions. */ }
  }

  public isReady(): boolean { return this.unlockedByUser && this.ctx?.state === "running"; }
  public needsUserGesture(): boolean {
    if (typeof window === "undefined") return false;
    return Boolean(window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) && !this.isReady();
  }
  public unlock(): Promise<boolean> {
    const ctx = this.getContext();
    if (!ctx) return Promise.resolve(false);
    if (ctx.state === "running") {
      this.unlockedByUser = true;
      return Promise.resolve(true);
    }
    if (this.unlockPromise) return this.unlockPromise;
    this.unlockPromise = ctx.resume().then(() => {
      this.unlockedByUser = ctx.state === "running";
      return this.unlockedByUser;
    }).catch(() => {
      this.unlockedByUser = false;
      return false;
    }).finally(() => {
      this.unlockPromise = null;
    });
    return this.unlockPromise;
  }

  public playOnce(eventId: string, effect: SoundEffect): void {
    if (!eventId || this.playedEventIds.has(eventId)) return;
    this.playedEventIds.add(eventId);
    if (this.playedEventIds.size > 600) {
      const first = this.playedEventIds.values().next().value;
      if (first) this.playedEventIds.delete(first);
    }
    this.play(effect);
  }

  public play(effect: SoundEffect): void {
    const sound = SOUND_DESIGN[effect];
    if (!this.soundEnabled || !this.isCategoryEnabled(sound.category) || this.volume <= 0) return;
    const ctx = this.getContext();
    // A genuine gesture must unlock audio. Room events never try to bypass autoplay restrictions.
    if (!ctx) return;
    if (ctx.state !== "running" || !this.unlockedByUser) {
      if (this.unlockPromise) void this.unlockPromise.then((unlocked) => { if (unlocked) this.schedule(effect); });
      return;
    }
    this.schedule(effect);
  }

  private schedule(effect: SoundEffect, ignoreCategory = false): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running" || !this.unlockedByUser || !this.soundEnabled) return;
    const sound = SOUND_DESIGN[effect];
    if ((!ignoreCategory && !this.isCategoryEnabled(sound.category)) || this.volume <= 0) return;
    try {
      const now = ctx.currentTime;
      if (this.nextStartAt > now + 0.45) return;
      const startAt = Math.max(now + 0.008, this.nextStartAt);
      this.nextStartAt = startAt + sound.duration + 0.035;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = sound.waveform;
      oscillator.frequency.setValueAtTime(sound.start, startAt);
      oscillator.frequency.exponentialRampToValueAtTime(sound.end, startAt + sound.duration * 0.78);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, sound.amplitude * this.volume), startAt + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + sound.duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.addEventListener("ended", () => { oscillator.disconnect(); gain.disconnect(); }, { once: true });
      oscillator.start(startAt);
      oscillator.stop(startAt + sound.duration + 0.01);
    } catch {
      // Browser audio is best-effort and never blocks LiveKit or UI operations.
    }
  }

  public playTest(): void {
    if (!this.soundEnabled || this.volume <= 0) return;
    if (this.ctx?.state === "running" && this.unlockedByUser) {
      this.schedule("success", true);
      return;
    }
    if (this.unlockPromise) void this.unlockPromise.then((unlocked) => { if (unlocked) this.schedule("success", true); });
  }

  // Compatibility helpers retained for existing callers while the controls migrate.
  public isChatEnabled(): boolean { return this.isCategoryEnabled("chat"); }
  public setChatEnabled(enabled: boolean): void { this.setCategoryEnabled("chat", enabled); }
  public isParticipantEnabled(): boolean { return this.isCategoryEnabled("participants"); }
  public setParticipantEnabled(enabled: boolean): void { this.setCategoryEnabled("participants", enabled); }
  public isMicrophoneEnabled(): boolean { return this.isCategoryEnabled("microphone"); }
  public setMicrophoneEnabled(enabled: boolean): void { this.setCategoryEnabled("microphone", enabled); }
  public isRemoteMicrophoneEnabled(): boolean { return this.isCategoryEnabled("remoteMicrophone"); }
  public setRemoteMicrophoneEnabled(enabled: boolean): void { this.setCategoryEnabled("remoteMicrophone", enabled); }

  public playJoin(eventId?: string): void { eventId ? this.playOnce(eventId, "join") : this.play("join"); }
  public playLeave(eventId?: string): void { eventId ? this.playOnce(eventId, "leave") : this.play("leave"); }
  public playMessage(eventId?: string): void { eventId ? this.playOnce(eventId, "messageIncoming") : this.play("messageIncoming"); }
  public playMessageSent(eventId?: string): void { eventId ? this.playOnce(eventId, "messageSent") : this.play("messageSent"); }
  public playMicOn(eventId?: string): void { eventId ? this.playOnce(eventId, "microphoneOn") : this.play("microphoneOn"); }
  public playMicOff(eventId?: string): void { eventId ? this.playOnce(eventId, "microphoneOff") : this.play("microphoneOff"); }
  public playRemoteMicOn(eventId?: string): void { eventId ? this.playOnce(eventId, "remoteMicrophoneOn") : this.play("remoteMicrophoneOn"); }
  public playRemoteMicOff(eventId?: string): void { eventId ? this.playOnce(eventId, "remoteMicrophoneOff") : this.play("remoteMicrophoneOff"); }
  public playReaction(eventId?: string): void { eventId ? this.playOnce(eventId, "reaction") : this.play("reaction"); }
}

export const soundManager = new SoundEffectManager();
