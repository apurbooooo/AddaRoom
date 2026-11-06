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
  krispState?: KrispState;
  isKrispSupported?: boolean;
  krispErrorMessage?: string | null;
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
  krispState = "off",
  isKrispSupported = true,
  krispErrorMessage = null,
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
  onToggleFullscreen,
  onOpenInvite,
  onOpenHostControls,
  onLeaveRoom,
}: RoomControlBarProps) {
  const [showReactions, setShowReactions] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [soundOn, setSoundOn] = useState(soundManager.isEnabled());
  const [mobileScreenShareWarning, setMobileScreenShareWarning] = useState<string | null>(null);

  const reactionsList = ["❤️", "😂", "👏", "😮", "👍", "🔥"];

  const handleToggleSound = () => {
    const next = !soundOn;
    soundManager.setEnabled(next);
    setSoundOn(next);
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
    <footer className="relative bg-black/95 border-t border-[#2a2a2a] px-3 py-2.5 sm:px-6 sm:py-3 backdrop-blur-md select-none z-30"
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
        <div className="absolute -top-14 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#111111] border border-[#2a2a2a] shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-2 duration-150">
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
                ? "bg-amber-500 text-black font-bold"
                : "bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-200"
            }`}
          >
            ✋ {isHandRaised ? "Lower" : "Raise"}
          </button>
        </div>
      )}

      {/* Quality preset menu popover */}
      {showQualityMenu && (
        <div className="absolute -top-36 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 w-48 p-2 rounded-2xl bg-[#111111] border border-[#2a2a2a] shadow-2xl text-xs space-y-1 animate-in fade-in duration-150">
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

      <div className="max-w-4xl mx-auto flex items-center justify-between gap-1 sm:gap-3 min-w-0 max-sm:overflow-x-auto max-sm:justify-start max-sm:touch-pan-x">
        {/* Left Side: Room Extras (Invite, Host Controls, Sound, Noise) */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
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
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-colors min-h-[44px]"
              title="Host Controls"
            >
              <Crown className="w-4 h-4 text-amber-400" />
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

        {/* Center: Primary Media Controls — horizontally scrollable on small screens */}
        <div className="relative flex-1 min-w-0 max-sm:flex-none max-sm:w-max">
          <div className="flex overflow-x-auto max-sm:overflow-visible scrollbar-none items-center justify-start sm:justify-center gap-1.5 sm:gap-2 min-w-0 touch-pan-x overscroll-x-contain">
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
            className={`p-3 rounded-2xl transition-all shadow-md min-w-[48px] min-h-[48px] flex items-center justify-center flex-shrink-0 ${
              isMicEnabled
                ? "bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white border border-[#2a2a2a]"
                : "bg-rose-600 hover:bg-rose-500 text-white"
            }`}
            title={isMicEnabled ? "Mute Microphone" : "Unmute Microphone"}
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
              className={`p-3 rounded-l-2xl transition-all shadow-md min-w-[48px] min-h-[48px] flex items-center justify-center ${
                isScreenSharing
                  ? "bg-brand hover:bg-[#ceff44] text-black"
                  : "bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-200 border border-[#2a2a2a]"
              }`}
              title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
            >
              <Monitor className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowQualityMenu((prev) => !prev)}
              className={`px-1.5 py-3 rounded-r-2xl border-l border-[#2a2a2a] shadow-md min-h-[48px] flex items-center justify-center ${
                isScreenSharing
                  ? "bg-[#a8e020] hover:bg-[#BBFB2B] text-black"
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
                          ? "bg-brand text-black hover:bg-[#ceff44]"
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
                          ? "bg-brand text-black hover:bg-[#ceff44]"
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
          </div>

          {/* Reactions Toggle */}
          <button
            onClick={() => setShowReactions((prev) => !prev)}
            className="p-3 rounded-2xl bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-200 border border-[#2a2a2a] shadow-md transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center flex-shrink-0"
            title="Send Reaction"
          >
            <Smile className="w-5 h-5 text-amber-300" />
          </button>
        </div>

        {/* Right Side: Chat, Fullscreen & Leave */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Fullscreen Toggle */}
          <button
            onClick={onToggleFullscreen}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1a1a1a] transition-colors min-w-[44px] min-h-[44px] hidden sm:flex items-center justify-center"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Chat Drawer Toggle */}
          <button
            onClick={onToggleChat}
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

          {/* Leave Room Button — always visible */}
          <button
            onClick={onLeaveRoom}
            className="p-3 rounded-2xl bg-rose-600/20 hover:bg-rose-600 border border-rose-600/40 text-rose-300 hover:text-white transition-all shadow-md group min-w-[48px] min-h-[48px] flex items-center justify-center"
            title="Leave Room"
          >
            <PhoneOff className="w-5 h-5 transition-transform group-hover:scale-110" />
          </button>
        </div>
      </div>
    </footer>
  );
}
