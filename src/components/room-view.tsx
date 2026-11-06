"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Room,
  RoomEvent,
  Participant,
  RemoteParticipant,
  LocalAudioTrack,
  VideoPresets,
  AudioCaptureOptions,
  Track,
} from "livekit-client";
import { ParticipantGrid } from "@/components/media/participant-grid";
import { RoomControlBar } from "@/components/room-control-bar";
import { ChatPanel } from "@/components/chat/chat-panel";
import { InviteModal } from "@/components/invite-modal";
import { HostControlsDialog } from "@/components/host/host-controls-dialog";
import { FloatingReactions } from "@/components/social/floating-reactions";
import { BrandLogo } from "@/components/brand-logo";
import { RoomSidebarLeft } from "@/components/room/room-sidebar-left";
import { useRoomDataChannel } from "@/hooks/use-room-data-channel";
import { useAudioPlayback } from "@/hooks/use-audio-playback";
import { useNoiseFilter } from "@/hooks/use-noise-filter";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { ClientSession, PublicParticipant, ScreenShareQualityMode } from "@/types";
import { getScreenShareOptions } from "@/lib/media-constraints";
import { createRoomConnectionAttempt } from "@/lib/room-connection-lifecycle";
import { clearRoomSession } from "@/lib/session-storage";
import { soundManager } from "@/lib/sound-effects";
import {
  Loader2,
  AlertTriangle,
  Users,
  X,
  Volume2,
  RefreshCw,
  FlipHorizontal,
} from "lucide-react";

interface RoomViewProps {
  roomCode: string;
  initialSession: ClientSession;
  livekitToken: string;
  livekitUrl: string;
}

/** Browser-level audio constraints for best quality and noise reduction */
const MIC_CAPTURE_OPTIONS: AudioCaptureOptions = {
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
};

export function RoomView({
  roomCode,
  initialSession,
  livekitToken,
  livekitUrl,
}: RoomViewProps) {
  const router = useRouter();
  const [session, setSession] = useState<ClientSession>(initialSession);
  const [room, setRoom] = useState<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectingError, setConnectingError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionRetry, setConnectionRetry] = useState(0);
  const connectionAttemptRef = useRef(0);
  const roomRef = useRef<Room | null>(null);

  // Media states — default mic to FALSE; we do NOT auto-start mic on connect
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [qualityMode, setQualityMode] = useState<ScreenShareQualityMode>("high");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  // Mic permission / error state
  const [micError, setMicError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Participants state
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
  const [publicParticipants, setPublicParticipants] = useState<PublicParticipant[]>([]);

  // Room metadata
  const [roomTitle, setRoomTitle] = useState(session.roomCode);
  const [isLocked, setIsLocked] = useState(false);
  const [hasRoomPassword, setHasRoomPassword] = useState(false);

  // Modals & Panels
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isHostControlsOpen, setIsHostControlsOpen] = useState(false);

  // Hand raised status
  const [isHandRaised, setIsHandRaised] = useState(false);

  // Free-tier usage monitoring
  const [sessionDurationSeconds, setSessionDurationSeconds] = useState(0);
  const [dismissedUsageWarning, setDismissedUsageWarning] = useState(false);

  useEffect(() => {
    if (!connected) return;
    const timer = setInterval(() => {
      setSessionDurationSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [connected]);

  // Audio playback hook — handles iOS Safari audio unlock
  const { canPlayAudio, startAudio } = useAudioPlayback(room ?? undefined);

  // Noise filter (WebRTC & LiveKit Krisp AI) + fullscreen hooks
  const {
    isNoiseEnabled,
    isBrowserProcessingSupported,
    setNoiseEnabled,
    krispState,
    isKrispSupported,
    krispErrorMessage,
    toggleKrisp,
    reapplyKrispIfNeeded,
    cleanupKrisp,
  } = useNoiseFilter({ room });
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  // Active speakers tracking
  const [speakingParticipantIds, setSpeakingParticipantIds] = useState<string[]>([]);

  // LiveKit data channel hook
  const {
    messages,
    activeReactions,
    typingUsers,
    raisedHands,
    kicked,
    ended,
    sendMessage,
    sendReaction,
    sendTyping,
    toggleHandRaise,
    sendHostBroadcast,
  } = useRoomDataChannel(
    room ?? undefined,
    session.participantId,
    session.displayName,
    session.avatar,
    publicParticipants.find((participant) => participant.role === "host")?.id,
  );

  // Keep unread count up-to-date
  useEffect(() => {
    if (!isChatOpen && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.senderId !== session.participantId) {
        setUnreadCount((prev) => prev + 1);
      }
    }
  }, [messages, isChatOpen, session.participantId]);

  // Handle kicked or room ended events
  useEffect(() => {
    if (kicked) {
      clearRoomSession(roomCode);
      alert("You have been removed from the room by the host.");
      router.push("/");
    }
    if (ended) {
      clearRoomSession(roomCode);
      alert("The host has ended this Adda.");
      router.push("/");
    }
  }, [kicked, ended, roomCode, router]);

  // Fetch initial public room info
  const fetchRoomInfo = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${roomCode}`);
      if (res.ok) {
        const data = await res.json();
        setRoomTitle(data.room.title);
        setIsLocked(data.room.status === "locked");
        setPublicParticipants(data.room.participants || []);
      }
    } catch {}
  }, [roomCode]);

  useEffect(() => {
    fetchRoomInfo();
  }, [fetchRoomInfo]);

  // Connect to LiveKit Room. This effect intentionally depends only on the
  // connection inputs and explicit retry counter, never on Room-derived state.
  useEffect(() => {
    let active = true;
    const attemptId = ++connectionAttemptRef.current;
    const lkRoom = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: VideoPresets.h720.resolution,
        facingMode: "user",
      },
      audioCaptureDefaults: MIC_CAPTURE_OPTIONS,
    });
    const logDiagnostic = (message: string, error?: unknown) => {
      if (process.env.NODE_ENV !== "production") {
        console.debug(`[LiveKit][attempt:${attemptId}] ${message}`, error ?? "");
      }
    };
    logDiagnostic("Room instance created");
    const updateRemotes = () => {
      if (active) setRemoteParticipants(Array.from(lkRoom.remoteParticipants.values()));
    };
    const handleConnected = () => {
      if (!active) return;
      logDiagnostic("connection successful");
      roomRef.current = lkRoom;
      setRoom(lkRoom);
      setConnected(true);
      setConnectingError(null);
      setIsReconnecting(false);
      soundManager.playJoin();
      updateRemotes();
    };
    const handleDisconnected = (reason?: unknown) => {
      logDiagnostic("room disconnected event", reason);
      if (!active) return;
      roomRef.current = null;
      setRoom(null);
      setConnected(false);
      setIsReconnecting(false);
      setConnectingError(
        reason ? `Disconnected from the media server (${String(reason)}).` : "Disconnected from the media server."
      );
    };
    const handleReconnecting = () => {
      if (!active) return;
      logDiagnostic("room reconnecting");
      setIsReconnecting(true);
    };
    const handleReconnected = () => {
      if (!active) return;
      logDiagnostic("room reconnected");
      setIsReconnecting(false);
      const pub = lkRoom.localParticipant.getTrackPublication(Track.Source.Microphone);
      if (pub?.track) {
        reapplyKrispIfNeeded(pub.track as LocalAudioTrack).catch((error) => {
          logDiagnostic("Krisp reapply failed after reconnect", error);
        });
      }
    };
    const handleParticipantConnected = () => {
      if (!active) return;
      soundManager.playJoin();
      updateRemotes();
      fetchRoomInfo();
    };
    const handleParticipantDisconnected = () => {
      if (!active) return;
      soundManager.playLeave();
      updateRemotes();
      fetchRoomInfo();
    };
    const handleLocalTrackPublished = (pub: any) => {
      if (!active) return;
      setIsScreenSharing(lkRoom.localParticipant.isScreenShareEnabled);
      if (pub.kind === "audio") {
        setIsMicEnabled(true);
        if (pub.track) {
          reapplyKrispIfNeeded(pub.track as LocalAudioTrack).catch((error) => {
            logDiagnostic("Krisp reapply failed after publish", error);
          });
        }
      }
      if (pub.kind === "video" && !lkRoom.localParticipant.isScreenShareEnabled) {
        setIsVideoEnabled(true);
      }
    };
    const handleLocalTrackUnpublished = (pub: any) => {
      if (!active) return;
      setIsScreenSharing(lkRoom.localParticipant.isScreenShareEnabled);
      if (pub.kind === "audio") setIsMicEnabled(false);
      if (pub.kind === "video" && !lkRoom.localParticipant.isScreenShareEnabled) {
        setIsVideoEnabled(false);
      }
    };
    const handleActiveSpeakersChanged = (speakers: Participant[]) => {
      if (active) setSpeakingParticipantIds(speakers.map((speaker) => speaker.identity));
    };

    const connectionAttempt = createRoomConnectionAttempt(
      lkRoom,
      livekitUrl,
      livekitToken,
      [
        { event: RoomEvent.Connected, handler: handleConnected },
        { event: RoomEvent.Disconnected, handler: handleDisconnected },
        { event: RoomEvent.Reconnecting, handler: handleReconnecting },
        { event: RoomEvent.SignalReconnecting, handler: handleReconnecting },
        { event: RoomEvent.Reconnected, handler: handleReconnected },
        { event: RoomEvent.ParticipantConnected, handler: handleParticipantConnected },
        { event: RoomEvent.ParticipantDisconnected, handler: handleParticipantDisconnected },
        { event: RoomEvent.LocalTrackPublished, handler: handleLocalTrackPublished },
        { event: RoomEvent.LocalTrackUnpublished, handler: handleLocalTrackUnpublished },
        { event: RoomEvent.ActiveSpeakersChanged, handler: handleActiveSpeakersChanged },
      ],
    );

    const connectToRoom = async () => {
      logDiagnostic("connection attempt started");
      try {
        await connectionAttempt.connect();
        if (!active) {
          connectionAttempt.cleanup();
          return;
        }
        if (lkRoom.state !== "connected") {
          handleConnected();
        }
      } catch (err: any) {
        if (!active) return;
        logDiagnostic("connection failed", err);
        setConnectingError(err?.message || "Could not connect to media server.");
        setConnected(false);
        roomRef.current = null;
        setRoom(null);
        connectionAttempt.cleanup();
      }
    };

    connectToRoom();

    return () => {
      logDiagnostic("connection effect cleanup");
      active = false;
      cleanupKrisp().catch(() => {});
      roomRef.current = roomRef.current === lkRoom ? null : roomRef.current;
      if (roomRef.current === null) setRoom(null);
      connectionAttempt.cleanup();
    };
  }, [livekitUrl, livekitToken, fetchRoomInfo, cleanupKrisp, reapplyKrispIfNeeded, connectionRetry]);

  // ---- Media toggle handlers ----

  const getMicCaptureOptions = useCallback((noiseEnabled: boolean): AudioCaptureOptions => ({
    noiseSuppression: noiseEnabled,
    echoCancellation: noiseEnabled,
    autoGainControl: noiseEnabled,
  }), []);

  const handleToggleMic = async () => {
    if (!room) return;
    setMicError(null);
    const next = !isMicEnabled;
    try {
      await room.localParticipant.setMicrophoneEnabled(next, getMicCaptureOptions(isNoiseEnabled));
      // Only update state AFTER the LiveKit call succeeds
      setIsMicEnabled(next);
      if (next) {
        const pub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
        if (pub?.track) {
          reapplyKrispIfNeeded(pub.track as LocalAudioTrack).catch(() => {});
        }
      }
    } catch (err: any) {
      console.warn("Failed to toggle mic:", err);
      // Provide user-visible error
      const msg =
        err?.name === "NotAllowedError"
          ? "Microphone permission denied. Please allow microphone access in your browser settings."
          : err?.name === "NotFoundError"
          ? "No microphone found. Please connect a microphone."
          : err?.name === "NotReadableError"
          ? "Microphone is in use by another app."
          : "Could not access microphone. Please check your device.";
      setMicError(msg);
      // Do NOT change isMicEnabled — revert to actual state
    }
  };

  const handleToggleNoise = async () => {
    if (!room) return;
    const next = !isNoiseEnabled;
    const publication = room.localParticipant.getTrackPublication(Track.Source.Microphone);

    try {
      if (isMicEnabled && publication?.track) {
        await room.localParticipant.unpublishTrack(publication.track, true);
        await room.localParticipant.setMicrophoneEnabled(true, getMicCaptureOptions(next));
      }
      setNoiseEnabled(next);
    } catch (err) {
      console.warn("Failed to apply microphone noise reduction setting:", err);
      if (isMicEnabled && !room.localParticipant.isMicrophoneEnabled) {
        try {
          await room.localParticipant.setMicrophoneEnabled(true, getMicCaptureOptions(isNoiseEnabled));
        } catch (restoreError) {
          console.error("Failed to restore microphone after noise reduction change:", restoreError);
        }
      }
    }
  };

  const handleToggleVideo = async () => {
    if (!room) return;
    setCameraError(null);
    const next = !isVideoEnabled;
    try {
      await room.localParticipant.setCameraEnabled(next, { facingMode });
      // Only update state AFTER the LiveKit call succeeds
      setIsVideoEnabled(next);
    } catch (err: any) {
      console.warn("Failed to toggle camera:", err);
      const msg =
        err?.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access in your browser settings."
          : err?.name === "NotFoundError"
          ? "No camera found on this device."
          : err?.name === "NotReadableError"
          ? "Camera is in use by another app."
          : "Could not access camera. Please check your device.";
      setCameraError(msg);
      // Do NOT change isVideoEnabled — revert to actual state
    }
  };

  const handleFlipCamera = async () => {
    if (!room || !isVideoEnabled) return;
    const nextFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextFacing);
    try {
      await room.localParticipant.setCameraEnabled(false);
      await room.localParticipant.setCameraEnabled(true, { facingMode: nextFacing });
    } catch (err) {
      console.warn("Failed to flip camera:", err);
      setFacingMode(facingMode); // revert
    }
  };

  const handleToggleScreenShare = async () => {
    if (!room) return;
    const next = !isScreenSharing;
    try {
      if (next) {
        const opts = getScreenShareOptions(qualityMode);
        await room.localParticipant.setScreenShareEnabled(true, opts);
        setIsScreenSharing(true);
      } else {
        await room.localParticipant.setScreenShareEnabled(false);
        setIsScreenSharing(false);
      }
    } catch (err) {
      console.warn("Failed to toggle screen share:", err);
      setIsScreenSharing(false);
    }
  };

  const handleToggleHandRaise = () => {
    const next = !isHandRaised;
    setIsHandRaised(next);
    toggleHandRaise(isHandRaised);
  };

  // ---- Host action handlers ----

  const handleUpdateLock = async (locked: boolean) => {
    const res = await fetch(`/api/rooms/${roomCode}/lock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantId: session.participantId,
        sessionSecret: session.sessionSecret,
        locked,
      }),
    });
    if (res.ok) {
      setIsLocked(locked);
      sendHostBroadcast("lock_state", undefined);
    }
  };

  const handleUpdateTitle = async (newTitle: string) => {
    const res = await fetch(`/api/rooms/${roomCode}/title`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantId: session.participantId,
        sessionSecret: session.sessionSecret,
        title: newTitle,
      }),
    });
    if (res.ok) {
      setRoomTitle(newTitle);
    }
  };

  const handleKickParticipant = async (targetId: string) => {
    const res = await fetch(`/api/rooms/${roomCode}/moderate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantId: session.participantId,
        sessionSecret: session.sessionSecret,
        action: "kick",
        targetParticipantId: targetId,
      }),
    });
    if (res.ok) {
      sendHostBroadcast("kick", targetId);
      fetchRoomInfo();
    }
  };

  const handleTransferHost = async (targetId: string) => {
    const res = await fetch(`/api/rooms/${roomCode}/moderate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantId: session.participantId,
        sessionSecret: session.sessionSecret,
        action: "transfer_host",
        targetParticipantId: targetId,
      }),
    });
    if (res.ok) {
      setSession((prev) => ({ ...prev, role: "member" }));
      sendHostBroadcast("host_transferred", targetId);
      fetchRoomInfo();
    }
  };

  const handleEndRoom = async () => {
    cleanupKrisp().catch(() => {});
    await fetch(`/api/rooms/${roomCode}/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantId: session.participantId,
        sessionSecret: session.sessionSecret,
      }),
    });
    sendHostBroadcast("room_ended");
    clearRoomSession(roomCode);
    router.push("/");
  };

  const handleSetPassword = async (password: string | null) => {
    const res = await fetch(`/api/rooms/${roomCode}/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantId: session.participantId,
        sessionSecret: session.sessionSecret,
        password: password ?? undefined,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setHasRoomPassword(!!data.hasPassword);
    }
  };

  const handleLeaveRoom = async () => {
    if (confirm("Leave this room?")) {
      cleanupKrisp().catch(() => {});
      try {
        await fetch(`/api/rooms/${roomCode}/leave`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participantId: session.participantId,
            sessionSecret: session.sessionSecret,
          }),
        });
      } catch {}
      clearRoomSession(roomCode);
      if (room) {
        room.disconnect();
      }
      router.push("/");
    }
  };

  if (connectingError) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white">
        <div className="w-full max-w-md p-6 rounded-2xl bg-[#111111] border border-[#2a2a2a] text-center shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Media Connection Error</h2>
          <p className="text-xs text-gray-400 mb-6">{connectingError}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => {
                setConnectingError(null);
                setIsReconnecting(false);
                setConnectionRetry((retry) => retry + 1);
              }}
              className="px-4 py-2 rounded-xl bg-brand text-black text-xs font-bold hover:bg-[#ceff44] transition-colors"
            >
              Retry Connection
            </button>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 rounded-xl bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 text-xs font-semibold"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand/20 text-brand border border-brand/30 flex items-center justify-center animate-pulse">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <p className="text-sm font-semibold text-white">Entering {roomTitle}...</p>
          <p className="text-xs text-gray-500">Connecting to secure media SFU</p>
        </div>
      </div>
    );
  }

  const isHost = session.role === "host";

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black text-white flex flex-col select-none">
      {/* Top Header Bar */}
      <header className="h-14 border-b border-[#2a2a2a] bg-black/90 px-4 flex items-center justify-between backdrop-blur-md z-30 flex-shrink-0">
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" />
          <div className="h-4 w-[1px] bg-[#2a2a2a] hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white truncate max-w-[140px] sm:max-w-xs">
              {roomTitle}
            </span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#111111] border border-[#2a2a2a] text-[11px] text-gray-400 font-medium">
              <Users className="w-3 h-3 text-brand" />
              <span>{remoteParticipants.length + 1}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isReconnecting && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-semibold animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Reconnecting...</span>
            </div>
          )}
          <button
            onClick={() => setIsInviteOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand/10 hover:bg-brand/20 border border-brand/30 text-brand text-xs font-semibold transition-colors"
          >
            <span>Invite</span>
          </button>
        </div>
      </header>

      {/* iOS Safari / Android audio unlock banner */}
      {!canPlayAudio && (
        <div
          className="bg-brand/10 border-b border-brand/30 px-4 py-2.5 flex items-center justify-between text-xs text-brand z-30 animate-in fade-in cursor-pointer"
          onClick={startAudio}
        >
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong>Tap to enable audio</strong> — your browser blocked autoplay. Tap here to hear other participants.
            </span>
          </div>
        </div>
      )}

      {/* Mic permission error banner */}
      {micError && (
        <div className="bg-rose-500/10 border-b border-rose-500/30 px-4 py-2 flex items-center justify-between text-xs text-rose-300 z-30 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{micError}</span>
          </div>
          <button
            onClick={() => setMicError(null)}
            className="p-1 rounded hover:bg-rose-500/20 ml-2 flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Camera error banner */}
      {cameraError && (
        <div className="bg-rose-500/10 border-b border-rose-500/30 px-4 py-2 flex items-center justify-between text-xs text-rose-300 z-30 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{cameraError}</span>
          </div>
          <button
            onClick={() => setCameraError(null)}
            className="p-1 rounded hover:bg-rose-500/20 ml-2 flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Free Tier Usage Advisory Banner (triggers when call reaches 90+ minutes) */}
      {sessionDurationSeconds >= 5400 && !dismissedUsageWarning && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-200 z-30 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              <strong>Free-Tier Usage Advisory:</strong> This room has been active for{" "}
              {Math.floor(sessionDurationSeconds / 60)} minutes (~
              {((sessionDurationSeconds / 3600) * (remoteParticipants.length + 1)).toFixed(1)}{" "}
              participant-hours). Free cloud accounts include ~100 participant-hours/month.
            </span>
          </div>
          <button
            onClick={() => setDismissedUsageWarning(true)}
            className="p-1 text-amber-300 hover:text-white rounded hover:bg-amber-500/20"
            title="Dismiss notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Three-panel layout: Left sidebar | Center media | Right chat (desktop) */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left sidebar — participants list, desktop only */}
        <RoomSidebarLeft
          participants={publicParticipants}
          localParticipantId={session.participantId}
          speakingParticipantIds={speakingParticipantIds}
          className="hidden lg:flex"
        />

        {/* Center — video grid + floating reactions */}
        <main className="flex-1 flex overflow-hidden relative min-w-0">
          <ParticipantGrid
            localParticipant={room?.localParticipant}
            remoteParticipants={remoteParticipants}
            raisedHands={raisedHands}
            messages={messages}
            currentParticipantId={session.participantId}
            onStopScreenShare={() => handleToggleScreenShare()}
            qualityMode={qualityMode}
            onChangeQualityMode={setQualityMode}
          />

          {/* Floating Social Reactions */}
          <FloatingReactions reactions={activeReactions} />

          {/* Mobile chat drawer (overlay) — full width on mobile, hidden on desktop */}
          <div className={`absolute inset-0 z-20 lg:hidden transition-transform duration-300 ${isChatOpen ? "translate-x-0" : "translate-x-full"}`}>
            <ChatPanel
              isOpen={isChatOpen}
              onClose={() => setIsChatOpen(false)}
              messages={messages}
              currentParticipantId={session.participantId}
              onSendMessage={sendMessage}
              onSendTyping={sendTyping}
              typingUsers={typingUsers}
            />
          </div>
        </main>

        {/* Right sidebar — chat panel, desktop only, shown when chat open */}
        {isChatOpen && (
          <aside className="hidden lg:flex w-80 flex-shrink-0 flex-col bg-[#111111] border-l border-[#1a1a1a] overflow-hidden">
            <ChatPanel
              isOpen={isChatOpen}
              onClose={() => { setIsChatOpen(false); }}
              messages={messages}
              currentParticipantId={session.participantId}
              onSendMessage={sendMessage}
              onSendTyping={sendTyping}
              typingUsers={typingUsers}
            />
          </aside>
        )}
      </div>

      {/* Bottom Media Control Bar */}
      <RoomControlBar
        isMicEnabled={isMicEnabled}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        isHandRaised={isHandRaised}
        isHost={isHost}
        unreadCount={unreadCount}
        isChatOpen={isChatOpen}
        qualityMode={qualityMode}
        isNoiseEnabled={isNoiseEnabled}
        isBrowserProcessingSupported={isBrowserProcessingSupported}
        isFullscreen={isFullscreen}
        krispState={krispState}
        isKrispSupported={isKrispSupported}
        krispErrorMessage={krispErrorMessage}
        onToggleMic={handleToggleMic}
        onToggleVideo={handleToggleVideo}
        onFlipCamera={handleFlipCamera}
        onToggleScreenShare={handleToggleScreenShare}
        onChangeQualityMode={setQualityMode}
        onSendReaction={sendReaction}
        onToggleHandRaise={handleToggleHandRaise}
        onToggleChat={() => {
          setIsChatOpen((prev) => !prev);
          setUnreadCount(0);
        }}
        onToggleNoise={handleToggleNoise}
        onToggleKrisp={toggleKrisp}
        onToggleFullscreen={toggleFullscreen}
        onOpenInvite={() => setIsInviteOpen(true)}
        onOpenHostControls={() => setIsHostControlsOpen(true)}
        onLeaveRoom={handleLeaveRoom}
      />

      {/* Invite Modal */}
      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        roomCode={roomCode}
        roomTitle={roomTitle}
      />

      {/* Host Controls Dialog */}
      <HostControlsDialog
        isOpen={isHostControlsOpen}
        onClose={() => setIsHostControlsOpen(false)}
        roomCode={roomCode}
        roomTitle={roomTitle}
        isLocked={isLocked}
        hasPassword={hasRoomPassword}
        participants={publicParticipants}
        currentParticipantId={session.participantId}
        sessionDurationSeconds={sessionDurationSeconds}
        onUpdateLock={handleUpdateLock}
        onUpdateTitle={handleUpdateTitle}
        onKickParticipant={handleKickParticipant}
        onTransferHost={handleTransferHost}
        onEndRoom={handleEndRoom}
        onSetPassword={handleSetPassword}
      />
    </div>
  );
}
