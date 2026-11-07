// Synthesized audio sound effects using Web Audio API (Zero external mp3 assets required)

const SOUND_KEY = "addaroom_sound_enabled";
const VOLUME_KEY = "addaroom_sound_volume";
const VIBRATION_KEY = "addaroom_vibration_enabled";
const CHAT_KEY = "addaroom_sound_chat";
const PARTICIPANT_KEY = "addaroom_sound_participant";
const MICROPHONE_KEY = "addaroom_sound_microphone";
const REMOTE_MIC_KEY = "addaroom_sound_remote_microphone";

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
  private chatEnabled = readBoolean(CHAT_KEY, true);
  private participantEnabled = readBoolean(PARTICIPANT_KEY, true);
  private microphoneEnabled = readBoolean(MICROPHONE_KEY, true);
  private remoteMicrophoneEnabled = readBoolean(REMOTE_MIC_KEY, false);
  private contextReady = false;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.contextReady = this.ctx.state === "running";
      }
    }
    return this.ctx;
  }

  public isEnabled(): boolean { return this.soundEnabled; }
  public setEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    try { localStorage.setItem(SOUND_KEY, String(enabled)); } catch {}
  }
  public isChatEnabled(): boolean { return this.chatEnabled; }
  public setChatEnabled(enabled: boolean): void { this.chatEnabled = enabled; try { localStorage.setItem(CHAT_KEY, String(enabled)); } catch {} }
  public isParticipantEnabled(): boolean { return this.participantEnabled; }
  public setParticipantEnabled(enabled: boolean): void { this.participantEnabled = enabled; try { localStorage.setItem(PARTICIPANT_KEY, String(enabled)); } catch {} }
  public isMicrophoneEnabled(): boolean { return this.microphoneEnabled; }
  public setMicrophoneEnabled(enabled: boolean): void { this.microphoneEnabled = enabled; try { localStorage.setItem(MICROPHONE_KEY, String(enabled)); } catch {} }
  public isRemoteMicrophoneEnabled(): boolean { return this.remoteMicrophoneEnabled; }
  public setRemoteMicrophoneEnabled(enabled: boolean): void { this.remoteMicrophoneEnabled = enabled; try { localStorage.setItem(REMOTE_MIC_KEY, String(enabled)); } catch {} }
  public isReady(): boolean { return this.contextReady && this.ctx?.state === "running"; }
  public needsUserGesture(): boolean { return Boolean(this.getContext()) && !this.isReady(); }
  public unlock(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    void ctx.resume().then(() => { this.contextReady = ctx.state === "running"; }).catch(() => { this.contextReady = false; });
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

  private tone(type: OscillatorType, startFrequency: number, endFrequency: number, duration: number, amplitude: number, categoryEnabled = true): void {
    if (!this.soundEnabled || !categoryEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const schedule = () => {
      if (ctx.state !== "running") return;
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
      osc.addEventListener("ended", () => { osc.disconnect(); gain.disconnect(); }, { once: true });
    };
    if (ctx.state === "running") {
      try { schedule(); } catch { /* Audio is best-effort and must not block room actions. */ }
      return;
    }
    void ctx.resume().then(() => {
      this.contextReady = ctx.state === "running";
      if (this.contextReady) {
        try { schedule(); } catch { /* Audio is best-effort and must not block room actions. */ }
      }
    }).catch(() => { this.contextReady = false; });
  }

  public playJoin(): void { this.tone("sine", 440, 880, 0.25, 0.08, this.participantEnabled); }
  public playLeave(): void { this.tone("sine", 659.25, 329.63, 0.25, 0.08, this.participantEnabled); }
  public playMessage(): void { this.tone("sine", 587.33, 880, 0.15, 0.05, this.chatEnabled); }
  public playMicOn(): void { this.tone("triangle", 520, 760, 0.12, 0.05, this.microphoneEnabled); }
  public playMicOff(): void { this.tone("triangle", 760, 420, 0.12, 0.05, this.microphoneEnabled); }
  public playRemoteMicOn(): void { this.tone("sine", 700, 900, 0.1, 0.035, this.remoteMicrophoneEnabled); }
  public playRemoteMicOff(): void { this.tone("sine", 500, 350, 0.1, 0.035, this.remoteMicrophoneEnabled); }
  public playReaction(): void { this.tone("triangle", 523.25, 783.99, 0.14, 0.04); }
}

export const soundManager = new SoundEffectManager();
