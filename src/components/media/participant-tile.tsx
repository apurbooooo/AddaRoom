"use client";

import React, { useEffect, useRef, useState } from "react";
import { Participant, Track, ConnectionQuality } from "livekit-client";
import { MicOff, Hand, Monitor, Wifi } from "lucide-react";
import { mapLiveKitQuality, getConnectionStatusColor } from "@/lib/network-stats";

interface ParticipantTileProps {
  participant: Participant;
  isLocal: boolean;
  isHandRaised?: boolean;
}

export function ParticipantTile({
  participant,
  isLocal,
  isHandRaised = false,
}: ParticipantTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(participant.isCameraEnabled);
  const [isAudioMuted, setIsAudioMuted] = useState(!participant.isMicrophoneEnabled);
  const [isSpeaking, setIsSpeaking] = useState(participant.isSpeaking);
  const [isScreenSharing, setIsScreenSharing] = useState(participant.isScreenShareEnabled);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>(
    participant.connectionQuality
  );
  const [showNetworkInfo, setShowNetworkInfo] = useState(false);

  // Parse custom metadata for avatar
  let avatar = "👋";
  let isHost = false;
  try {
    if (participant.metadata) {
      const meta = JSON.parse(participant.metadata);
      if (meta.avatar) avatar = meta.avatar;
      if (meta.isHost) isHost = meta.isHost;
    }
  } catch {}

  useEffect(() => {
    const handleTrackSubscribed = (track: any) => {
      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.attach(videoRef.current);
        setIsVideoEnabled(true);
      }
      if (track.kind === Track.Kind.Audio && audioRef.current && !isLocal) {
        track.attach(audioRef.current);
      }
    };

    const handleTrackUnsubscribed = (track: any) => {
      if (track.kind === Track.Kind.Video) {
        track.detach();
        setIsVideoEnabled(false);
      }
      if (track.kind === Track.Kind.Audio && !isLocal) {
        track.detach();
      }
    };

    const handleTrackMuted = (pub: any) => {
      if (pub.kind === Track.Kind.Video) setIsVideoEnabled(false);
      if (pub.kind === Track.Kind.Audio) setIsAudioMuted(true);
    };

    const handleTrackUnmuted = (pub: any) => {
      if (pub.kind === Track.Kind.Video) setIsVideoEnabled(true);
      if (pub.kind === Track.Kind.Audio) setIsAudioMuted(false);
    };

    const handleIsSpeakingChanged = (speaking: boolean) => {
      setIsSpeaking(speaking);
    };

    const handleConnectionQualityChanged = (quality: ConnectionQuality) => {
      setConnectionQuality(quality);
    };

    // Attach existing video tracks if already published
    const cameraPub = participant.getTrackPublication(Track.Source.Camera);
    if (cameraPub && cameraPub.track && videoRef.current) {
      cameraPub.track.attach(videoRef.current);
      setIsVideoEnabled(cameraPub.isMuted ? false : true);
    }

    if (!isLocal) {
      const micPub = participant.getTrackPublication(Track.Source.Microphone);
      if (micPub && micPub.track && audioRef.current) {
        micPub.track.attach(audioRef.current);
      }
    }

    setIsAudioMuted(!participant.isMicrophoneEnabled);
    setIsVideoEnabled(participant.isCameraEnabled);
    setIsScreenSharing(participant.isScreenShareEnabled);

    participant.on("trackSubscribed", handleTrackSubscribed);
    participant.on("trackUnsubscribed", handleTrackUnsubscribed);
    participant.on("trackMuted", handleTrackMuted);
    participant.on("trackUnmuted", handleTrackUnmuted);
    participant.on("isSpeakingChanged", handleIsSpeakingChanged);
    participant.on("connectionQualityChanged", handleConnectionQualityChanged);

    return () => {
      participant.off("trackSubscribed", handleTrackSubscribed);
      participant.off("trackUnsubscribed", handleTrackUnsubscribed);
      participant.off("trackMuted", handleTrackMuted);
      participant.off("trackUnmuted", handleTrackUnmuted);
      participant.off("isSpeakingChanged", handleIsSpeakingChanged);
      participant.off("connectionQualityChanged", handleConnectionQualityChanged);
    };
  }, [participant, isLocal]);

  const qualityStatus = mapLiveKitQuality(connectionQuality);
  const colorStyle = getConnectionStatusColor(qualityStatus);

  return (
    <div
      className={`relative w-full h-full min-h-[160px] rounded-2xl overflow-hidden bg-slate-900/90 border transition-all duration-300 flex items-center justify-center select-none shadow-md ${
        isSpeaking
          ? "border-indigo-500 shadow-indigo-500/20 ring-2 ring-indigo-500/40"
          : "border-slate-800/80 hover:border-slate-700/80"
      }`}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isVideoEnabled ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Audio element for remote participants */}
      {!isLocal && <audio ref={audioRef} autoPlay playsInline />}

      {/* Fallback Avatar Placeholder when camera is off */}
      {!isVideoEnabled && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 p-4">
          <div
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-3xl sm:text-4xl shadow-xl transition-transform duration-300 ${
              isSpeaking
                ? "bg-indigo-600/30 ring-4 ring-indigo-500 scale-105"
                : "bg-slate-800 ring-2 ring-slate-700"
            }`}
          >
            <span>{avatar}</span>
          </div>
        </div>
      )}

      {/* Top Left Indicators: Host badge & Hand raised */}
      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-20">
        {isHost && (
          <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold tracking-wider uppercase backdrop-blur-sm">
            Host
          </span>
        )}
        {isHandRaised && (
          <div className="p-1 rounded-md bg-amber-500 text-slate-950 shadow-md animate-bounce">
            <Hand className="w-3.5 h-3.5" />
          </div>
        )}
        {isScreenSharing && (
          <div className="p-1 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] flex items-center gap-1">
            <Monitor className="w-3 h-3" />
            <span className="text-[10px] font-medium hidden sm:inline">Sharing</span>
          </div>
        )}
      </div>

      {/* Top Right: Connection Quality with metric tooltips */}
      <div
        className="absolute top-2.5 right-2.5 z-20"
        onMouseEnter={() => setShowNetworkInfo(true)}
        onMouseLeave={() => setShowNetworkInfo(false)}
      >
        <div
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-semibold backdrop-blur-md cursor-pointer ${colorStyle.bg} ${colorStyle.text}`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${colorStyle.dot}`} />
          <Wifi className="w-3 h-3" />
        </div>

        {showNetworkInfo && (
          <div className="absolute top-6 right-0 w-36 p-2 rounded-xl bg-slate-950 border border-slate-800 shadow-xl text-[10px] text-slate-300 z-30">
            <p className="font-semibold text-white capitalize">{qualityStatus}</p>
            <p className="text-slate-400 mt-0.5">LiveKit WebRTC SFU</p>
          </div>
        )}
      </div>

      {/* Bottom Bar: Name & Mic status */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between z-20 pointer-events-none">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-950/75 border border-white/10 backdrop-blur-md text-xs text-white font-medium max-w-[80%] truncate">
          <span className="truncate">{participant.name || participant.identity}</span>
          {isLocal && <span className="text-[10px] text-indigo-400 font-bold">(You)</span>}
        </div>

        <div className="flex items-center gap-1">
          {isAudioMuted && (
            <div className="p-1.5 rounded-xl bg-rose-500/80 text-white shadow-md backdrop-blur-md">
              <MicOff className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
