"use client";

import React, { useEffect, useRef, useState } from "react";
import { ConnectionQuality, Participant, Track } from "livekit-client";
import { MicOff, Hand, Monitor, Wifi, Camera, Loader2 } from "lucide-react";
import { mapLiveKitQuality, getConnectionStatusColor, NETWORK_RTT_THRESHOLDS_MS } from "@/lib/network-stats";
import { AvatarPortrait } from "@/components/avatar/avatar-portrait";
import { getCameraRenderState, getCameraTransform, isRenderableCameraTrack, CameraRenderState } from "@/lib/camera-rendering";

interface ParticipantTileProps {
  participant: Participant;
  isLocal: boolean;
  isHandRaised?: boolean;
  rttMs?: number | null;
  mirrorLocalPreview?: boolean;
}

export function ParticipantTile({ participant, isLocal, isHandRaised = false, rttMs = null, mirrorLocalPreview = false }: ParticipantTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const attachedVideoTrackRef = useRef<any>(null);
  const [cameraState, setCameraState] = useState<CameraRenderState>("off");
  const [videoReady, setVideoReady] = useState(false);
  const [videoPlaybackError, setVideoPlaybackError] = useState<string | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(!participant.isMicrophoneEnabled);
  const [isSpeaking, setIsSpeaking] = useState(participant.isSpeaking);
  const [isScreenSharing, setIsScreenSharing] = useState(participant.isScreenShareEnabled);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>(participant.connectionQuality);
  const [showNetworkInfo, setShowNetworkInfo] = useState(false);

  let avatar = "👋";
  let isHost = false;
  try {
    const metadata = participant.metadata ? JSON.parse(participant.metadata) : {};
    avatar = metadata.avatar || avatar;
    isHost = Boolean(metadata.isHost);
  } catch {}

  useEffect(() => {
    let active = true;
    const video = videoRef.current;
    const cameraPublication = () => participant.getTrackPublication(Track.Source.Camera);
    const microphonePublication = () => participant.getTrackPublication(Track.Source.Microphone);

    const markVideoReady = () => {
      if (!active || !video || video.videoWidth <= 0 || video.videoHeight <= 0 || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      const commitReady = () => {
        if (active && video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          setVideoPlaybackError(null);
          setVideoReady(true);
        }
      };
      if ("requestVideoFrameCallback" in video && typeof video.requestVideoFrameCallback === "function") {
        video.requestVideoFrameCallback(() => commitReady());
      } else {
        commitReady();
      }
    };

    const syncState = () => {
      const camera = cameraPublication();
      const microphone = microphonePublication();
      if (active) {
        setCameraState(getCameraRenderState(camera));
        setIsAudioMuted(!microphone?.track || Boolean(microphone.isMuted));
        setIsScreenSharing(participant.isScreenShareEnabled);
        setIsSpeaking(Boolean(participant.isSpeaking) && Boolean(microphone?.track) && !Boolean(microphone?.isMuted));
      }
    };

    const attachCamera = (track?: any) => {
      const candidate = track || cameraPublication()?.track;
      if (!video || !candidate || !isRenderableCameraTrack(candidate)) {
        syncState();
        return;
      }
      setVideoReady(false);
      setVideoPlaybackError(null);
      if (attachedVideoTrackRef.current && attachedVideoTrackRef.current !== candidate) {
        attachedVideoTrackRef.current.detach(video);
      }
      candidate.attach(video);
      attachedVideoTrackRef.current = candidate;
      video.play().then(() => markVideoReady()).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "The browser blocked video playback.";
        setVideoReady(false);
        setVideoPlaybackError(message);
        console.warn(`[ParticipantTile] ${isLocal ? "Local" : "Remote"} camera playback failed`, error);
      });
      syncState();
    };

    const attachRemoteAudio = (track: any) => {
      if (!isLocal && track?.source === Track.Source.Microphone && audioRef.current) {
        track.attach(audioRef.current);
        audioRef.current.play().catch((error: unknown) => {
          console.warn("[ParticipantTile] Remote audio playback was blocked", error);
        });
      }
    };

    const handleTrackSubscribed = (track: any) => {
      if (track?.source === Track.Source.Camera) attachCamera(track);
      if (track?.source === Track.Source.Microphone) attachRemoteAudio(track);
      syncState();
    };
    const handleTrackUnsubscribed = (track: any) => {
      if (track?.source === Track.Source.Camera) {
        if (video) track.detach(video);
        if (attachedVideoTrackRef.current === track) attachedVideoTrackRef.current = null;
        setVideoReady(false);
      }
      if (!isLocal && track?.source === Track.Source.Microphone && audioRef.current) track.detach(audioRef.current);
      syncState();
    };
    const handleTrackPublished = (publication: any) => {
      if (publication?.source === Track.Source.Camera) {
        // Local publications carry the track immediately; defer one frame so the
        // browser video element is mounted after React updates the tile.
        window.requestAnimationFrame(() => attachCamera(publication.track));
      }
      syncState();
    };
    const handleTrackUnpublished = (publication: any) => {
      if (publication?.source === Track.Source.Camera) {
        if (video && attachedVideoTrackRef.current) attachedVideoTrackRef.current.detach(video);
        attachedVideoTrackRef.current = null;
        setVideoReady(false);
      }
      syncState();
    };
    const handleTrackMuted = (publication: any) => { if (publication?.source === Track.Source.Camera) syncState(); else if (publication?.source === Track.Source.Microphone) { setIsAudioMuted(true); setIsSpeaking(false); } };
    const handleTrackUnmuted = (publication: any) => { if (publication?.source === Track.Source.Camera) attachCamera(publication.track); else if (publication?.source === Track.Source.Microphone) syncState(); };
    const handleSpeaking = (speaking: boolean) => { const microphone = microphonePublication(); setIsSpeaking(Boolean(speaking) && Boolean(microphone?.track) && !Boolean(microphone?.isMuted)); };
    const handleQuality = (quality: ConnectionQuality) => setConnectionQuality(quality);

    const publication = cameraPublication();
    if (publication?.track) attachCamera(publication.track);
    const microphone = microphonePublication();
    if (!isLocal && microphone?.track) attachRemoteAudio(microphone.track);
    syncState();

    const handleVideoMetadata = () => markVideoReady();
    const handleVideoData = () => markVideoReady();
    const handleVideoPlaying = () => markVideoReady();
    const handleVideoResize = () => markVideoReady();
    const handleVideoError = () => {
      setVideoReady(false);
      setVideoPlaybackError("The camera track could not be rendered by this browser.");
      console.warn(`[ParticipantTile] ${isLocal ? "Local" : "Remote"} camera video element error`);
    };
    video?.addEventListener("loadedmetadata", handleVideoMetadata);
    video?.addEventListener("loadeddata", handleVideoData);
    video?.addEventListener("playing", handleVideoPlaying);
    video?.addEventListener("resize", handleVideoResize);
    video?.addEventListener("error", handleVideoError);

    participant.on("trackSubscribed", handleTrackSubscribed);
    participant.on("trackUnsubscribed", handleTrackUnsubscribed);
    participant.on(isLocal ? "localTrackPublished" : "trackPublished", handleTrackPublished);
    participant.on(isLocal ? "localTrackUnpublished" : "trackUnpublished", handleTrackUnpublished);
    participant.on("trackMuted", handleTrackMuted);
    participant.on("trackUnmuted", handleTrackUnmuted);
    participant.on("isSpeakingChanged", handleSpeaking);
    participant.on("connectionQualityChanged", handleQuality);

    return () => {
      active = false;
      participant.off("trackSubscribed", handleTrackSubscribed);
      participant.off("trackUnsubscribed", handleTrackUnsubscribed);
      participant.off(isLocal ? "localTrackPublished" : "trackPublished", handleTrackPublished);
      participant.off(isLocal ? "localTrackUnpublished" : "trackUnpublished", handleTrackUnpublished);
      participant.off("trackMuted", handleTrackMuted);
      participant.off("trackUnmuted", handleTrackUnmuted);
      participant.off("isSpeakingChanged", handleSpeaking);
      participant.off("connectionQualityChanged", handleQuality);
      video?.removeEventListener("loadedmetadata", handleVideoMetadata);
      video?.removeEventListener("loadeddata", handleVideoData);
      video?.removeEventListener("playing", handleVideoPlaying);
      video?.removeEventListener("resize", handleVideoResize);
      video?.removeEventListener("error", handleVideoError);
      if (video && attachedVideoTrackRef.current) attachedVideoTrackRef.current.detach(video);
      if (!isLocal && audioRef.current && microphonePublication()?.track) microphonePublication()?.track?.detach(audioRef.current);
      attachedVideoTrackRef.current = null;
    };
  }, [participant, isLocal]);

  const qualityStatus = typeof rttMs === "number" ? rttMs < NETWORK_RTT_THRESHOLDS_MS.goodBelow ? "good" : rttMs <= NETWORK_RTT_THRESHOLDS_MS.moderateThrough ? "moderate" : "poor" : mapLiveKitQuality(connectionQuality);
  const colorStyle = getConnectionStatusColor(qualityStatus);
  const videoVisible = cameraState === "ready" && videoReady;
  const cameraLabel = cameraState === "ready" ? "Camera on" : cameraState === "initializing" ? "Camera starting" : cameraState === "muted" ? "Camera paused" : "Camera off";

  return (
    <div className={`relative w-full h-full min-h-[160px] rounded-2xl overflow-hidden bg-[#111] border transition-all duration-300 flex items-center justify-center select-none shadow-md ${isSpeaking ? "border-brand shadow-brand/20 ring-2 ring-brand/40" : "border-[#2a2a2a] hover:border-[#3a3a3a]"}`}>
      <video ref={videoRef} autoPlay playsInline muted aria-label={`${participant.name || participant.identity} video`} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${videoVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`} style={{ transform: getCameraTransform({ isLocal, mirrorLocalPreview, source: Track.Source.Camera }) }} />
      {!isLocal && <audio ref={audioRef} autoPlay playsInline />}
      {!videoVisible && <div className="participant-camera-placeholder absolute inset-0 flex flex-col items-center justify-center p-4"><AvatarPortrait avatarId={avatar || participant.identity} size={72} isSpeaking={isSpeaking} className="shadow-2xl" />{cameraState === "initializing" && <span className="mt-3 flex items-center gap-1.5 text-[11px] text-brand"><Loader2 className="h-3 w-3 animate-spin" />Starting camera</span>}{videoPlaybackError && <span className="mt-3 max-w-[15rem] text-center text-[10px] leading-relaxed text-rose-300">Video preview unavailable. Check browser playback permissions.</span>}</div>}
      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-20">{isHost && <span className="px-1.5 py-0.5 rounded-md bg-violet-500/15 text-violet-300 border border-violet-400/25 text-[10px] font-bold tracking-wider uppercase backdrop-blur-sm">Host</span>}{isHandRaised && <div className="p-1 rounded-md bg-violet-400 text-slate-950 shadow-md"><Hand className="w-3.5 h-3.5" /></div>}{isScreenSharing && <div className="p-1 rounded-md bg-brand/20 text-brand border border-brand/30 text-[10px] flex items-center gap-1"><Monitor className="w-3 h-3" /><span className="text-[10px] font-medium hidden sm:inline">Sharing</span></div>}</div>
      <div className="absolute top-2.5 right-2.5 z-20" onMouseEnter={() => setShowNetworkInfo(true)} onMouseLeave={() => setShowNetworkInfo(false)}><div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-semibold backdrop-blur-md cursor-pointer ${colorStyle.bg} ${colorStyle.text}`} role="img" aria-label={`${qualityStatus} connection`} title={`${qualityStatus}: ${rttMs === null ? "RTT unavailable" : `${rttMs} ms`}`}><div className={`w-1.5 h-1.5 rounded-full ${colorStyle.dot}`} /><Wifi className="w-3 h-3" /><span>{rttMs === null ? "-- ms" : `${rttMs} ms`}</span></div>{showNetworkInfo && <div className="absolute top-6 right-0 w-36 p-2 rounded-xl bg-black border border-[#2a2a2a] shadow-xl text-[10px] text-gray-300 z-30"><p className="font-semibold text-white capitalize">{qualityStatus}</p><p className="text-gray-400 mt-0.5">RTT to LiveKit SFU</p></div>}</div>
      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between z-20 pointer-events-none"><div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-black/75 border border-white/10 backdrop-blur-md text-xs text-white font-medium max-w-[80%] truncate"><span className="truncate">{participant.name || participant.identity}</span>{isLocal && <span className="text-[10px] text-brand font-bold">(You)</span>}</div><div className="flex items-center gap-1">{isAudioMuted && <div className="p-1.5 rounded-xl bg-rose-500/80 text-white shadow-md backdrop-blur-md"><MicOff className="w-3.5 h-3.5" /></div>}{cameraState === "initializing" && <div className="p-1.5 rounded-xl bg-black/70 text-brand" aria-label={cameraLabel}><Camera className="w-3.5 h-3.5" /></div>}</div></div>
    </div>
  );
}
