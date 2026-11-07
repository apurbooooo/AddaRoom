// Synthesized audio sound effects using Web Audio API (Zero external mp3 assets required)

const SOUND_KEY = "addaroom_sound_enabled";
const VOLUME_KEY = "addaroom_sound_volume";
const VIBRATION_KEY = "addaroom_vibration_enabled";

function readBoolean(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value === "true";
  } catch {
    return fallback;
  }
}

function readVolume(): number {
  if (typeof window === "undefined") return 0.7;
  try {
    const value = Number(localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.7;
  } catch {
    return 0.7;
  }
}

class SoundEffectManager {
  private ctx: AudioContext | null = null;
  private soundEnabled = readBoolean(SOUND_KEY, true);
  private volume = readVolume();
  private vibrationEnabled = readBoolean(VIBRATION_KEY, true);

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx?.state === "suspended") this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  public isEnabled(): boolean { return this.soundEnabled; }
  public setEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    try { localStorage.setItem(SOUND_KEY, String(enabled)); } catch {}
  }
  public getVolume(): number { return this.volume; }
  public setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    try { localStorage.setItem(VOLUME_KEY, String(this.volume)); } catch {}
  }
  public isVibrationEnabled(): boolean { return this.vibrationEnabled; }
  public setVibrationEnabled(enabled: boolean): void {
    this.vibrationEnabled = enabled;
    try { localStorage.setItem(VIBRATION_KEY, String(enabled)); } catch {}
  }
  public isVibrationSupported(): boolean {
    return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
  }
  public vibrate(pattern: number | number[] = 35): void {
    if (this.vibrationEnabled && this.isVibrationSupported()) navigator.vibrate(pattern);
  }

  private tone(type: OscillatorType, startFrequency: number, endFrequency: number, duration: number, amplitude: number): void {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      osc.type = type;
      osc.frequency.setValueAtTime(startFrequency, now);
      osc.frequency.exponentialRampToValueAtTime(endFrequency, now + duration * 0.72);
      gain.gain.setValueAtTime(amplitude * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch {}
  }

  public playJoin(): void { this.tone("sine", 440, 880, 0.25, 0.08); }
  public playLeave(): void { this.tone("sine", 659.25, 329.63, 0.25, 0.08); }
  public playMessage(): void { this.tone("sine", 587.33, 880, 0.15, 0.05); }
  public playReaction(): void { this.tone("triangle", 523.25, 783.99, 0.14, 0.04); }
}

export const soundManager = new SoundEffectManager();
