"use client";

import React, { useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Smile,
  MessageSquare,
  Share2,
  Crown,
  PhoneOff,
  Volume2,
  VolumeX,
  ChevronUp,
  FlipHorizontal,
  Ear,
  EarOff,
  Settings2,
  Maximize2,
  Minimize2,
  Sparkles,
  Check,
  Loader2,
  X,
  AlertCircle,
  MoreHorizontal,
} from "lucide-react";
import { ScreenShareQualityMode } from "@/types";
import { soundManager } from "@/lib/sound-effects";
import { isScreenShareSupported } from "@/lib/media-constraints";
import type { KrispState } from "@/hooks/use-noise-filter";

interface RoomControlBarProps {
  isMicEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  isHost: boolean;
  unreadCount: number;
  isChatOpen: boolean;
  qualityMode: ScreenShareQualityMode;
  isNoiseEnabled: boolean;
  isBrowserProcessingSupported: boolean;
  isFullscreen: boolean;
  isFullscreenSupported: boolean;
  isMicAllowed: boolean;
  isScreenShareAllowed: boolean;
  krispState?: KrispState;
  isKrispSupported?: boolean;
  krispErrorMessage?: string | null;
  micLevel?: number;
  microphoneDevices?: MediaDeviceInfo[];
  selectedMicId?: string;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onFlipCamera?: () => void;
  onToggleScreenShare: () => void;
  onChangeQualityMode: (mode: ScreenShareQualityMode) => void;
  onSendReaction: (emoji: string) => void;
  onToggleHandRaise: () => void;
  onToggleChat: () => void;
  onToggleNoise: () => void;
  onToggleKrisp?: () => void;
  onSelectMicrophone?: (deviceId: string) => void;
  onToggleFullscreen: () => void;
  onOpenInvite: () => void;
  onOpenHostControls: () => void;
  onLeaveRoom: () => void;
}

/** Detect mobile viewport for flip camera button visibility */
function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768;
}

export function RoomControlBar({
  isMicEnabled,
  isVideoEnabled,
  isScreenSharing,
  isHandRaised,
  isHost,
  unreadCount,
  isChatOpen,
  qualityMode,
  isNoiseEnabled,
  isBrowserProcessingSupported,
  isFullscreen,
  isFullscreenSupported,
  isMicAllowed,
  isScreenShareAllowed,
  krispState = "off",
  isKrispSupported = true,
  krispErrorMessage = null,
  micLevel = 0,
  microphoneDevices = [],
  selectedMicId = "",
  onToggleMic,
  onToggleVideo,
  onFlipCamera,
  onToggleScreenShare,
  onChangeQualityMode,
  onSendReaction,
  onToggleHandRaise,
  onToggleChat,
  onToggleNoise,
  onToggleKrisp,
  onSelectMicrophone,
  onToggleFullscreen,
  onOpenInvite,
  onOpenHostControls,
  onLeaveRoom,
}: RoomControlBarProps) {
  const [showReactions, setShowReactions] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);
  const [soundOn, setSoundOn] = useState(soundManager.isEnabled());
  const [soundVolume, setSoundVolume] = useState(soundManager.getVolume());
  const [vibrationOn, setVibrationOn] = useState(soundManager.isVibrationEnabled());
  const [chatSoundOn, setChatSoundOn] = useState(soundManager.isChatEnabled());
  const [participantSoundOn, setParticipantSoundOn] = useState(soundManager.isParticipantEnabled());
  const [microphoneSoundOn, setMicrophoneSoundOn] = useState(soundManager.isMicrophoneEnabled());
  const [remoteMicrophoneSoundOn, setRemoteMicrophoneSoundOn] = useState(soundManager.isRemoteMicrophoneEnabled());
  const [mobileScreenShareWarning, setMobileScreenShareWarning] = useState<string | null>(null);

  const reactionsList = ["❤️", "😂", "👏", "😮", "👍", "🔥"];

  const handleToggleSound = () => {
    const next = !soundOn;
    soundManager.setEnabled(next);
    if (next) soundManager.unlock();
    setSoundOn(next);
  };

  const handleToggleVibration = () => {
    const next = !vibrationOn;
    soundManager.setVibrationEnabled(next);
    setVibrationOn(next);
  };

  const handleScreenShareClick = () => {
    if (!isScreenSharing && !isScreenShareSupported()) {
      setMobileScreenShareWarning(
        "Screen sharing is not supported by your mobile browser. You can still talk, view shared screens, and chat!"
      );
      setTimeout(() => setMobileScreenShareWarning(null), 4000);
      return;
    }
    onToggleScreenShare();
  };

  return (
    <footer className="room-control-dock relative bg-black/95 border-t border-[#2a2a2a] px-3 py-2.5 sm:px-6 sm:py-3 backdrop-blur-md select-none z-30"
      style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom, 0px))" }}
    >
      {/* Mobile Screen share warning toast */}
      {mobileScreenShareWarning && (
        <div className="absolute -top-14 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-amber-500/90 text-black font-semibold text-xs shadow-xl animate-in fade-in duration-200 text-center max-w-sm">
          {mobileScreenShareWarning}
        </div>
      )}

      {/* Floating Reactions Bar */}
      {showReactions && (
      <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 max-w-[calc(100vw-1rem)] overflow-x-auto flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#111111] border border-[#2a2a2a] shadow-2xl backdrop-blur-md z-50 animate-in slide-in-from-bottom-2 duration-150">
          {reactionsList.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onSendReaction(emoji);
                setShowReactions(false);
              }}
              className="text-xl p-2 hover:bg-[#1a1a1a] rounded-xl transition-transform active:scale-125 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              {emoji}
            </button>
          ))}
          <div className="h-6 w-[1px] bg-[#2a2a2a] mx-1" />
          <button
            onClick={() => {
              onToggleHandRaise();
              setShowReactions(false);
            }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors min-h-[44px] ${
              isHandRaised
                ? "bg-violet-400 text-slate-950 font-bold"
                : "bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-200"
            }`}
          >
            ✋ {isHandRaised ? "Lower" : "Raise"}
          </button>
        </div>
      )}

      {/* Quality preset menu popover */}
      {showQualityMenu && (
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 w-48 p-2 rounded-2xl bg-[#111111] border border-[#2a2a2a] shadow-2xl text-xs space-y-1 z-50 animate-in fade-in duration-150">
          <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Screen Share Mode
          </p>
          {(
            [
              ["high", "High (1080p 30fps)"],
              ["high60", "High (1080p 60fps)"],
              ["balanced", "Balanced (720p 30fps)"],
              ["saver", "Data Saver (480p)"],
              ["auto", "Auto (browser default)"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => {
                onChangeQualityMode(mode);
                setShowQualityMenu(false);
              }}
              className={`w-full text-left px-2 py-1.5 rounded-lg transition-colors ${
                qualityMode === mode
                  ? "bg-brand text-black font-semibold"
                  : "text-gray-300 hover:bg-[#1a1a1a]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Desktop Bar (sm: and up) */}
      <div className="hidden sm:flex max-w-6xl mx-auto items-center justify-between gap-4 min-w-0">
        {/* Left Side: Room Extras (Invite, Host Controls, Sound, Noise) */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <button
            onClick={onOpenInvite}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#111111] hover:bg-[#1a1a1a] border border-[#2a2a2a] text-gray-200 text-xs font-semibold transition-colors min-h-[44px]"
            title="Invite Friends"
          >
            <Share2 className="w-4 h-4 text-brand" />
            <span className="hidden sm:inline">Invite</span>
          </button>

          {isHost && (
            <button
              onClick={onOpenHostControls}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-500/10 hover:bg-violet-500/15 border border-violet-400/25 text-violet-200 text-xs font-semibold transition-colors min-h-[44px]"
              title="Host Controls"
            >
              <Crown className="w-4 h-4 text-violet-300" />
              <span className="hidden sm:inline">Host</span>
            </button>
          )}

          <button
            onClick={handleToggleSound}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1a1a1a] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            title={soundOn ? "Mute Sound Effects" : "Enable Sound Effects"}
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-gray-300" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
          </button>

        </div>

        {/* Center: Primary Media Controls */}
        <div className="relative flex-1 min-w-0 flex items-center justify-center gap-2.5">
          {/* Audio settings button with indicator when Krisp is ON */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowAudioSettings((prev) => !prev)}
              className="relative flex items-center gap-1.5 px-2.5 py-3 rounded-2xl bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-200 border border-[#2a2a2a] shadow-md transition-colors min-w-[48px] min-h-[48px] flex-shrink-0"
              title="Microphone and Audio Settings"
              aria-label="Microphone and Audio Settings"
              aria-expanded={showAudioSettings}
            >
              <Settings2 className="w-5 h-5 text-brand" />
              <span className="hidden sm:inline text-xs font-semibold">Audio</span>
              {krispState === "on" && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand ring-2 ring-black" />
              )}
            </button>
          </div>

          {/* Noise Reduction Quick Toggle Button */}
          <button
            onClick={onToggleNoise}
            className={`flex items-center gap-1.5 px-2.5 py-3 rounded-2xl transition-colors min-w-[48px] min-h-[48px] flex-shrink-0 ${
              krispState === "on"
                ? "bg-brand/20 text-brand border border-brand/50 hover:bg-brand/30"
                : isNoiseEnabled
                ? "bg-brand/15 text-brand border border-brand/40 hover:bg-brand/25"
                : "bg-[#1a1a1a] text-gray-500 border border-[#2a2a2a] hover:text-gray-300 hover:bg-[#2a2a2a]"
            }`}
            title={
              krispState === "on"
                ? "Enhanced Krisp AI Noise Cancellation Active"
                : isNoiseEnabled
                ? "Basic browser noise reduction On"
                : "Noise reduction Off"
            }
            aria-label={
              krispState === "on"
                ? "Krisp AI Noise Cancellation Active"
                : isNoiseEnabled
                ? "Noise Reduction On"
                : "Noise Reduction Off"
            }
          >
            {krispState === "on" ? (
              <Sparkles className="w-5 h-5 text-brand" />
            ) : isNoiseEnabled ? (
              <Ear className="w-5 h-5" />
            ) : (
              <EarOff className="w-5 h-5" />
            )}
            <span className="hidden sm:inline text-xs font-semibold whitespace-nowrap">
              {krispState === "on" ? "Krisp ON" : isNoiseEnabled ? "NR On" : "NR Off"}
            </span>
          </button>

          {/* Mic */}
          <button
            onClick={onToggleMic}
            disabled={!isMicAllowed && !isMicEnabled}
            className={`p-3 rounded-2xl transition-all shadow-md min-w-[48px] min-h-[48px] flex items-center justify-center flex-shrink-0 ${
              isMicEnabled
                ? "bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white border border-[#2a2a2a]"
                : "bg-rose-600 hover:bg-rose-500 text-white"
            }`}
            title={!isMicAllowed ? "The host has muted your microphone" : isMicEnabled ? "Mute Microphone" : "Unmute Microphone"}
            aria-label={!isMicAllowed ? "Microphone muted by host" : isMicEnabled ? "Mute microphone" : "Unmute microphone"}
          >
            {isMicEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Camera */}
          <div className="relative flex items-center flex-shrink-0">
            <button
              onClick={onToggleVideo}
              className={`p-3 transition-all shadow-md min-w-[48px] min-h-[48px] flex items-center justify-center ${
                onFlipCamera && isVideoEnabled
                  ? "rounded-l-2xl"
                  : "rounded-2xl"
              } ${
                isVideoEnabled
                  ? "bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white border border-[#2a2a2a]"
                  : "bg-rose-600 hover:bg-rose-500 text-white"
              }`}
              title={isVideoEnabled ? "Turn off Camera" : "Turn on Camera"}
            >
              {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
            {/* Flip camera button — only shown on mobile when video is on */}
            {onFlipCamera && isVideoEnabled && (
              <button
                onClick={onFlipCamera}
                className="px-1.5 py-3 rounded-r-2xl border-l border-[#2a2a2a] shadow-md bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 min-h-[48px] flex items-center justify-center sm:hidden"
                title="Flip Camera"
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Screen Share with Quality picker */}
          <div className="relative flex items-center flex-shrink-0">
            <button
              onClick={handleScreenShareClick}
              disabled={!isScreenShareAllowed && !isScreenSharing}
              className={`p-3 rounded-l-2xl transition-all shadow-md min-w-[48px] min-h-[48px] flex items-center justify-center ${
                isScreenSharing
                  ? "bg-brand hover:bg-cyan-300 text-black"
                  : "bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-200 border border-[#2a2a2a]"
              }`}
              title={!isScreenShareAllowed ? "The host has disabled screen sharing" : isScreenSharing ? "Stop Screen Share" : "Share Screen"}
              aria-label={!isScreenShareAllowed ? "Screen sharing disabled by host" : isScreenSharing ? "Stop screen share" : "Share screen"}
            >
              <Monitor className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowQualityMenu((prev) => !prev)}
              className={`px-1.5 py-3 rounded-r-2xl border-l border-[#2a2a2a] shadow-md min-h-[48px] flex items-center justify-center ${
                isScreenSharing
                  ? "bg-cyan-200 hover:bg-cyan-100 text-slate-950"
                  : "bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-400"
              }`}
              title="Screen Share Quality Settings"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Audio Settings Popover / Panel */}
          {showAudioSettings && (
            <div
              className="absolute bottom-full left-0 mb-2 z-50 w-[min(22rem,calc(100vw-1.5rem))] max-sm:fixed max-sm:bottom-20 max-sm:left-3 max-sm:mb-0 rounded-2xl bg-[#111111] border border-[#2a2a2a] p-4 shadow-2xl text-left animate-in fade-in duration-150"
              role="dialog"
              aria-label="Microphone Audio Settings"
            >
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#2a2a2a]">
                <div>
                  <p className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Settings2 className="w-4 h-4 text-brand" />
                    Audio &amp; Noise Controls
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-gray-400">
                    Two independent filters for microphone audio.
                  </p>
                </div>
                <button
                  onClick={() => setShowAudioSettings(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a1a1a] transition-colors"
                  aria-label="Close audio settings"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3 space-y-3 text-xs">
                <div className="rounded-xl border border-brand/20 bg-brand/[0.04] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">Microphone input</span>
                    <span className="text-[10px] font-mono text-brand">{isMicEnabled ? `${micLevel}%` : "Muted"}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#242424]" aria-label="Live microphone input level">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-brand to-violet-500 transition-[width] duration-100" style={{ width: `${isMicEnabled ? micLevel : 0}%` }} />
                  </div>
                  {microphoneDevices.length > 0 && onSelectMicrophone && (
                    <label className="block text-[10px] text-gray-400">
                      Input device
                      <select value={selectedMicId} onChange={(event) => onSelectMicrophone(event.target.value)} className="mt-1 w-full rounded-lg border border-[#333] bg-[#151515] px-2.5 py-2 text-xs text-white outline-none focus:border-brand">
                        <option value="">System default</option>
                        {microphoneDevices.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Microphone ${device.deviceId.slice(0, 6)}`}</option>)}
                      </select>
                    </label>
                  )}
                  {!isMicEnabled && <p className="text-[10px] text-gray-500">Turn on your microphone to see live input.</p>}
                </div>
                <div className="rounded-xl border border-[#2a2a2a] bg-black p-3 space-y-2">
                  <div className="flex items-center justify-between"><span className="font-semibold text-white">Notification preferences</span><span className="text-[10px] text-gray-500">This device</span></div>
                  <label className="flex items-center gap-2 text-[11px] text-gray-300"><input type="checkbox" checked={soundOn} onChange={handleToggleSound} className="accent-brand" /> Master sound</label>
                  <label className="flex items-center gap-2 text-[11px] text-gray-300"><input type="checkbox" checked={chatSoundOn} onChange={(event) => { setChatSoundOn(event.target.checked); soundManager.setChatEnabled(event.target.checked); }} className="accent-brand" /> Chat notifications</label>
                  <label className="flex items-center gap-2 text-[11px] text-gray-300"><input type="checkbox" checked={participantSoundOn} onChange={(event) => { setParticipantSoundOn(event.target.checked); soundManager.setParticipantEnabled(event.target.checked); }} className="accent-brand" /> Join / leave</label>
                  <label className="flex items-center gap-2 text-[11px] text-gray-300"><input type="checkbox" checked={microphoneSoundOn} onChange={(event) => { setMicrophoneSoundOn(event.target.checked); soundManager.setMicrophoneEnabled(event.target.checked); }} className="accent-brand" /> Microphone feedback</label>
                  <label className="flex items-center gap-2 text-[11px] text-gray-300"><input type="checkbox" checked={remoteMicrophoneSoundOn} onChange={(event) => { setRemoteMicrophoneSoundOn(event.target.checked); soundManager.setRemoteMicrophoneEnabled(event.target.checked); }} className="accent-brand" /> Remote mic changes</label>
                  <label className="block text-[10px] text-gray-400">Volume <input aria-label="Notification sound volume" type="range" min="0" max="1" step="0.05" value={soundVolume} onChange={(event) => { const value = Number(event.target.value); setSoundVolume(value); soundManager.setVolume(value); }} className="mt-1 w-full accent-brand" /></label>
                  <label className="flex items-center gap-2 text-[11px] text-gray-300"><input type="checkbox" checked={vibrationOn} onChange={handleToggleVibration} disabled={!soundManager.isVibrationSupported()} className="accent-brand" /> Vibration {soundManager.isVibrationSupported() ? "feedback" : "(unsupported)"}</label>
                </div>
                {/* Setting 1: WebRTC Native Browser Noise Suppression */}
                <div className="p-3 rounded-xl bg-black border border-[#2a2a2a] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isNoiseEnabled ? <Ear className="w-4 h-4 text-brand" /> : <EarOff className="w-4 h-4 text-gray-500" />}
                      <div>
                        <p className="text-xs font-semibold text-white">Browser Noise Suppression</p>
                        <p className="text-[10px] text-gray-400">WebRTC echo cancellation &amp; AGC</p>
                      </div>
                    </div>
                    <button
                      onClick={onToggleNoise}
                      disabled={!isBrowserProcessingSupported}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors min-h-[36px] min-w-[54px] ${
                        !isBrowserProcessingSupported
                          ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                          : isNoiseEnabled
                          ? "bg-brand text-black hover:bg-cyan-300"
                          : "bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 border border-[#333]"
                      }`}
                    >
                      {!isBrowserProcessingSupported ? "N/A" : isNoiseEnabled ? "ON" : "OFF"}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    {isBrowserProcessingSupported
                      ? "Requests native echo cancellation and noise suppression from your browser."
                      : "Browser does not support native audio constraints."}
                  </p>
                </div>

                {/* Setting 2: LiveKit Krisp AI Noise Cancellation */}
                <div className="p-3 rounded-xl bg-black border border-[#2a2a2a] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className={`w-4 h-4 ${krispState === "on" ? "text-brand" : krispState === "loading" ? "text-amber-400 animate-spin" : "text-gray-500"}`} />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-white">Krisp AI Cancellation</p>
                          <span className="text-[9px] font-bold uppercase px-1 py-0.5 rounded bg-brand/10 text-brand border border-brand/20">
                            LiveKit Cloud
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400">Deep neural filter for voice isolation</p>
                      </div>
                    </div>
                    <button
                      onClick={onToggleKrisp}
                      disabled={krispState === "loading" || krispState === "unsupported"}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors min-h-[36px] min-w-[54px] flex items-center justify-center gap-1.5 ${
                        krispState === "unsupported"
                          ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                          : krispState === "loading"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-wait"
                          : krispState === "on"
                          ? "bg-brand text-black hover:bg-cyan-300"
                          : krispState === "failed"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30"
                          : "bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 border border-[#333]"
                      }`}
                    >
                      {krispState === "loading" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {krispState === "loading"
                        ? "Loading..."
                        : krispState === "unsupported"
                        ? "N/A"
                        : krispState === "on"
                        ? "ON"
                        : krispState === "failed"
                        ? "Retry"
                        : "OFF"}
                    </button>
                  </div>

                  {/* Krisp Status and Description */}
                  <div className="text-[11px] pt-1">
                    {krispState === "on" && (
                      <p className="text-emerald-400 font-medium flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 flex-shrink-0" />
                        Krisp AI active — background noise is eliminated.
                      </p>
                    )}
                    {krispState === "loading" && (
                      <p className="text-amber-300 font-medium flex items-center gap-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                        Downloading and initializing Krisp neural model...
                      </p>
                    )}
                    {krispState === "unsupported" && (
                      <p className="text-gray-500 leading-tight">
                        Requires Safari 17.4+ or a modern Chromium/Firefox browser with AudioWorklet and WebAssembly.
                      </p>
                    )}
                    {krispState === "failed" && (
                      <p className="text-rose-400 font-medium leading-tight">
                        {krispErrorMessage || "Model download failed. Basic WebRTC noise reduction is preserved."}
                      </p>
                    )}
                    {krispState === "off" && (
                      <p className="text-gray-500 leading-tight">
                        Model downloads only when enabled. Isolates voice and eliminates background chatter.
                      </p>
                    )}
                    {!isMicEnabled && krispState !== "unsupported" && (
                      <p className="text-amber-400/80 text-[10px] mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        Microphone is muted. Turn on mic to apply.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reactions Toggle */}
          <button
            onClick={() => setShowReactions((prev) => !prev)}
            className="p-3 rounded-2xl bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-200 border border-[#2a2a2a] shadow-md transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center flex-shrink-0"
            title="Send Reaction"
          >
            <Smile className="w-5 h-5 text-violet-300" />
          </button>
        </div>

        {/* Right Side: Chat, Fullscreen & Leave */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Fullscreen Toggle */}
          <button
            onClick={onToggleFullscreen}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1a1a1a] transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
            title={isFullscreenSupported ? isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen" : "Fullscreen is not supported here; rotate the device or use AddaRoom in standalone mode"}
            aria-label={isFullscreenSupported ? isFullscreen ? "Exit fullscreen" : "Enter fullscreen" : "Fullscreen unavailable. Rotate your device for a wider view."}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Chat Drawer Toggle */}
          <button
            onClick={onToggleChat}
            aria-label={isChatOpen ? "Close room chat" : unreadCount > 0 ? `Open room chat, ${unreadCount} unread messages` : "Open room chat"}
            className={`relative p-3 rounded-2xl transition-colors shadow-md min-w-[48px] min-h-[48px] flex items-center justify-center ${
              isChatOpen
                ? "bg-brand text-black"
                : "bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-200 border border-[#2a2a2a]"
            }`}
            title="Chat Panel"
          >
            <MessageSquare className="w-5 h-5" />
            {!isChatOpen && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Leave Room Button */}
          <button
            onClick={onLeaveRoom}
            aria-label="Leave room"
            className="p-3 rounded-2xl bg-rose-600/20 hover:bg-rose-600 border border-rose-600/40 text-rose-300 hover:text-white transition-all shadow-md group min-w-[48px] min-h-[48px] flex items-center justify-center"
            title="Leave Room"
          >
            <PhoneOff className="w-5 h-5 transition-transform group-hover:scale-110" />
          </button>
        </div>
      </div>

      {/* Mobile Bar (< sm: 320px to 639px) — Exactly 6 touch targets, zero horizontal scrolling */}
      <div className="flex sm:hidden items-center justify-between gap-1 w-full max-w-md mx-auto">
        {/* 1. Mic */}
        <button
          onClick={onToggleMic}
          disabled={!isMicAllowed && !isMicEnabled}
          className={`min-w-11 min-h-11 w-11 h-11 xs:w-12 xs:h-12 rounded-2xl flex items-center justify-center transition-all flex-shrink-0 shadow-md ${
            isMicEnabled
              ? "bg-[#1a1a1a] text-white border border-[#2a2a2a] active:bg-[#252525]"
              : "bg-rose-600 text-white active:bg-rose-700"
          }`}
          title={!isMicAllowed ? "Muted by host" : isMicEnabled ? "Mute" : "Unmute"}
          aria-label={!isMicAllowed ? "Muted by host" : isMicEnabled ? "Mute microphone" : "Unmute microphone"}
        >
          {isMicEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* 2. Video (+ quick flip badge when video on) */}
        <div className="relative flex items-center flex-shrink-0">
          <button
            onClick={onToggleVideo}
            className={`min-w-11 min-h-11 w-11 h-11 xs:w-12 xs:h-12 rounded-2xl flex items-center justify-center transition-all shadow-md ${
              isVideoEnabled
                ? "bg-[#1a1a1a] text-white border border-[#2a2a2a] active:bg-[#252525]"
                : "bg-rose-600 text-white active:bg-rose-700"
            }`}
            title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
            aria-label={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
          >
            {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>
          {onFlipCamera && isVideoEnabled && (
            <button
              onClick={onFlipCamera}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-brand text-black flex items-center justify-center shadow-md ring-1 ring-black"
              title="Flip camera"
              aria-label="Flip camera"
            >
              <FlipHorizontal className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* 3. Chat */}
        <button
          onClick={onToggleChat}
          className={`relative min-w-11 min-h-11 w-11 h-11 xs:w-12 xs:h-12 rounded-2xl flex items-center justify-center transition-all flex-shrink-0 shadow-md ${
            isChatOpen
              ? "bg-brand text-black"
              : "bg-[#1a1a1a] text-gray-200 border border-[#2a2a2a] active:bg-[#252525]"
          }`}
          title="Chat"
          aria-label={isChatOpen ? "Close chat" : unreadCount > 0 ? `Chat, ${unreadCount} unread` : "Open chat"}
        >
          <MessageSquare className="w-5 h-5" />
          {!isChatOpen && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* 4. Reactions & Hand */}
        <button
          onClick={() => setShowReactions((prev) => !prev)}
          className={`relative min-w-11 min-h-11 w-11 h-11 xs:w-12 xs:h-12 rounded-2xl flex items-center justify-center transition-colors flex-shrink-0 shadow-md ${
            showReactions
              ? "bg-[#252525] border-brand/50 text-white"
              : "bg-[#1a1a1a] text-gray-200 border border-[#2a2a2a] active:bg-[#252525]"
          }`}
          title="Reactions & Hand Raise"
          aria-label="Send reaction or raise hand"
        >
          <Smile className="w-5 h-5 text-violet-300" />
          {isHandRaised && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-400 text-slate-950 text-[9px] font-bold flex items-center justify-center">
              ✋
            </span>
          )}
        </button>

        {/* 5. More Options ("...") */}
        <button
          onClick={() => setShowMobileMore(true)}
          className="relative min-w-11 min-h-11 w-11 h-11 xs:w-12 xs:h-12 rounded-2xl bg-[#1a1a1a] text-gray-200 border border-[#2a2a2a] flex items-center justify-center transition-colors flex-shrink-0 shadow-md active:bg-[#252525]"
          title="More room options"
          aria-label="More room options"
        >
          <MoreHorizontal className="w-5 h-5" />
          {(krispState === "on" || isHost) && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand ring-1 ring-black" />
          )}
        </button>

        {/* 6. Leave Room */}
        <button
          onClick={onLeaveRoom}
          className="min-w-11 min-h-11 w-11 h-11 xs:w-12 xs:h-12 rounded-2xl bg-rose-600/25 hover:bg-rose-600 border border-rose-600/40 text-rose-300 hover:text-white flex items-center justify-center transition-all shadow-md flex-shrink-0 active:scale-95"
          title="Leave room"
          aria-label="Leave room"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile "More Options" Sheet */}
      {showMobileMore && (
        <div
          className="fixed inset-0 z-50 sm:hidden bg-black/75 backdrop-blur-sm flex items-end animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-label="More room options"
        >
          <button
            className="absolute inset-0 w-full h-full cursor-default"
            aria-label="Close options"
            onClick={() => setShowMobileMore(false)}
          />
          <section className="relative z-10 w-full max-h-[85dvh] rounded-t-3xl border border-[#292929] border-b-0 bg-[#0e0e0e] flex flex-col overflow-hidden pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl">
            {/* Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-[#222] flex-shrink-0 bg-[#121212]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 rounded-full bg-zinc-600 mx-auto absolute top-2 left-1/2 -translate-x-1/2" />
                <Settings2 className="w-4 h-4 text-brand" />
                <h2 className="text-sm font-bold text-white">Room Actions & Audio</h2>
              </div>
              <button
                onClick={() => setShowMobileMore(false)}
                className="min-w-10 min-h-10 grid place-items-center rounded-xl text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-4 space-y-4 overflow-y-auto min-h-0 text-xs">
              {/* Audio & Noise Reduction Section */}
              <div className="space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Audio & Noise Filtering
                </p>

                {/* Krisp AI Tile */}
                <div className="p-3.5 rounded-2xl bg-black border border-[#262626] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center flex-shrink-0 border border-brand/20">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-white text-xs">Krisp AI Noise Filter</p>
                        <span className="text-[9px] font-bold uppercase px-1 py-0.5 rounded bg-brand/10 text-brand border border-brand/20">
                          Cloud
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 truncate">
                        {krispState === "on"
                          ? "Eliminating background chatter"
                          : krispState === "loading"
                          ? "Downloading neural model..."
                          : krispState === "unsupported"
                          ? "Unsupported on this browser"
                          : "Voice isolation & deep noise removal"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onToggleKrisp}
                    disabled={krispState === "loading" || krispState === "unsupported"}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[38px] min-w-[58px] flex items-center justify-center ${
                      krispState === "unsupported"
                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        : krispState === "loading"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : krispState === "on"
                        ? "bg-brand text-black font-extrabold"
                        : "bg-[#1a1a1a] text-gray-300 border border-[#333]"
                    }`}
                  >
                    {krispState === "loading" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : krispState === "on" ? "ON" : "OFF"}
                  </button>
                </div>

                {/* WebRTC Browser Noise Tile */}
                <div className="p-3.5 rounded-2xl bg-black border border-[#262626] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#1a1a1a] text-gray-300 flex items-center justify-center flex-shrink-0 border border-[#333]">
                      {isNoiseEnabled ? <Ear className="w-4 h-4 text-brand" /> : <EarOff className="w-4 h-4 text-gray-500" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white text-xs">Browser Noise Suppression</p>
                      <p className="text-[11px] text-gray-400 truncate">Standard WebRTC echo cancellation</p>
                    </div>
                  </div>
                  <button
                    onClick={onToggleNoise}
                    disabled={!isBrowserProcessingSupported}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[38px] min-w-[58px] ${
                      !isBrowserProcessingSupported
                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        : isNoiseEnabled
                        ? "bg-brand text-black font-extrabold"
                        : "bg-[#1a1a1a] text-gray-300 border border-[#333]"
                    }`}
                  >
                    {!isBrowserProcessingSupported ? "N/A" : isNoiseEnabled ? "ON" : "OFF"}
                  </button>
                </div>
              </div>

              {/* Screen Share Section */}
              <div className="space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Sharing & Media
                </p>
                <div className="p-3.5 rounded-2xl bg-black border border-[#262626] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#1a1a1a] text-gray-300 flex items-center justify-center flex-shrink-0 border border-[#333]">
                      <Monitor className="w-4 h-4 text-brand" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white text-xs">Screen Sharing</p>
                      <p className="text-[11px] text-gray-400 truncate">
                        {isScreenSharing ? "Currently sharing" : "Share screen or browser tab"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowMobileMore(false);
                      handleScreenShareClick();
                    }}
                    disabled={!isScreenShareAllowed && !isScreenSharing}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[38px] ${
                      isScreenSharing
                        ? "bg-brand text-black font-extrabold"
                        : "bg-[#1a1a1a] text-gray-200 border border-[#333]"
                    }`}
                  >
                    {isScreenSharing ? "Stop" : "Share"}
                  </button>
                </div>
              </div>

              {/* Utilities & Controls */}
              <div className="space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Quick Actions
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Sound FX */}
                  <button
                    onClick={handleToggleSound}
                    className="p-3 rounded-2xl bg-black border border-[#262626] flex items-center gap-2 text-left hover:bg-[#151515] transition-colors"
                  >
                    {soundOn ? <Volume2 className="w-4 h-4 text-brand" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
                    <div>
                      <p className="text-xs font-semibold text-white">Sounds</p>
                      <p className="text-[10px] text-gray-400">{soundOn ? "Enabled" : "Muted"}</p>
                    </div>
                  </button>

                  {/* Fullscreen */}
                  <button
                    onClick={() => {
                      setShowMobileMore(false);
                      onToggleFullscreen();
                    }}
                    className="p-3 rounded-2xl bg-black border border-[#262626] flex items-center gap-2 text-left hover:bg-[#151515] transition-colors"
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4 text-brand" /> : <Maximize2 className="w-4 h-4 text-gray-400" />}
                    <div>
                      <p className="text-xs font-semibold text-white">Fullscreen</p>
                      <p className="text-[10px] text-gray-400">{isFullscreen ? "Active" : "Standard"}</p>
                    </div>
                  </button>

                  {/* Invite Friends */}
                  <button
                    onClick={() => {
                      setShowMobileMore(false);
                      onOpenInvite();
                    }}
                    className="p-3 rounded-2xl bg-black border border-[#262626] flex items-center gap-2 text-left hover:bg-[#151515] transition-colors"
                  >
                    <Share2 className="w-4 h-4 text-brand" />
                    <div>
                      <p className="text-xs font-semibold text-white">Invite</p>
                      <p className="text-[10px] text-gray-400">Share room link</p>
                    </div>
                  </button>

                  {/* Host Controls (if host) */}
                  {isHost && (
                    <button
                      onClick={() => {
                        setShowMobileMore(false);
                        onOpenHostControls();
                      }}
                      className="p-3 rounded-2xl bg-violet-500/10 border border-violet-400/25 flex items-center gap-2 text-left hover:bg-violet-500/15 transition-colors"
                    >
                      <Crown className="w-4 h-4 text-violet-300" />
                      <div>
                        <p className="text-xs font-semibold text-violet-200">Host Menu</p>
                        <p className="text-[10px] text-violet-300/80">Manage room</p>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </footer>
  );
}
