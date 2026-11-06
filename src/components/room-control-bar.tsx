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
} from "lucide-react";
import { ScreenShareQualityMode } from "@/types";
import { soundManager } from "@/lib/sound-effects";
import { isScreenShareSupported } from "@/lib/media-constraints";

interface RoomControlBarProps {
  isMicEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  isHost: boolean;
  unreadCount: number;
  isChatOpen: boolean;
  qualityMode: ScreenShareQualityMode;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onFlipCamera?: () => void;
  onToggleScreenShare: () => void;
  onChangeQualityMode: (mode: ScreenShareQualityMode) => void;
  onSendReaction: (emoji: string) => void;
  onToggleHandRaise: () => void;
  onToggleChat: () => void;
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
  onToggleMic,
  onToggleVideo,
  onFlipCamera,
  onToggleScreenShare,
  onChangeQualityMode,
  onSendReaction,
  onToggleHandRaise,
  onToggleChat,
  onOpenInvite,
  onOpenHostControls,
  onLeaveRoom,
}: RoomControlBarProps) {
  const [showReactions, setShowReactions] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
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

      <div className="max-w-4xl mx-auto flex items-center justify-between gap-1 sm:gap-3">
        {/* Left Side: Room Extras (Invite, Host Controls, Sound) */}
        <div className="flex items-center gap-1 sm:gap-2">
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

        {/* Center: Primary Media Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Mic */}
          <button
            onClick={onToggleMic}
            className={`p-3 rounded-2xl transition-all shadow-md min-w-[48px] min-h-[48px] flex items-center justify-center ${
              isMicEnabled
                ? "bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white border border-[#2a2a2a]"
                : "bg-rose-600 hover:bg-rose-500 text-white"
            }`}
            title={isMicEnabled ? "Mute Microphone" : "Unmute Microphone"}
          >
            {isMicEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Camera */}
          <div className="relative flex items-center">
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
          <div className="relative flex items-center">
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

          {/* Reactions Toggle */}
          <button
            onClick={() => setShowReactions((prev) => !prev)}
            className="p-3 rounded-2xl bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-200 border border-[#2a2a2a] shadow-md transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
            title="Send Reaction"
          >
            <Smile className="w-5 h-5 text-amber-300" />
          </button>
        </div>

        {/* Right Side: Chat & Leave */}
        <div className="flex items-center gap-1 sm:gap-2">
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

          {/* Leave Room Button */}
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
