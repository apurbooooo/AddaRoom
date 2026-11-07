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
import { MediaQueuePanel } from "@/components/room/media-queue-panel";
import { MediaStage } from "@/components/room/media-stage";
import { AddMediaDialog } from "@/components/room/add-media-dialog";
import { useRoomDataChannel } from "@/hooks/use-room-data-channel";
import { useMediaQueue } from "@/hooks/use-media-queue";
import { useAudioPlayback } from "@/hooks/use-audio-playback";
import { useNoiseFilter } from "@/hooks/use-noise-filter";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { ClientSession, PublicParticipant, ScreenShareQualityMode } from "@/types";
import { getScreenShareOptions } from "@/lib/media-constraints";
import { useNetworkTelemetry } from "@/hooks/use-network-telemetry";
import { useMicrophoneMonitor } from "@/hooks/use-microphone-monitor";
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
  ListVideo,
  PanelLeft,
  MessageSquare,
  Crown,
} from "lucide-react";

interface RoomViewProps {
  roomCode: string;
  initialSession: ClientSession;
  livekitToken: string;
  livekitUrl: string;
  initialMedia?: { cameraEnabled: boolean; micEnabled: boolean };
}

type RoomConnectionStage = "preparing" | "connecting" | "connected" | "reconnecting" | "failed";

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
  initialMedia,
}: RoomViewProps) {
  const router = useRouter();
  const [session, setSession] = useState<ClientSession>(initialSession);
  const [room, setRoom] = useState<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectingError, setConnectingError] = useState<string | null>(null);
  const [connectionStage, setConnectionStage] = useState<RoomConnectionStage>("preparing");
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionRetry, setConnectionRetry] = useState(0);
  const connectionAttemptRef = useRef(0);
  const roomRef = useRef<Room | null>(null);

  // Media states — default mic to FALSE; we do NOT auto-start mic on connect
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const initialMediaAppliedRef = useRef(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [qualityMode, setQualityMode] = useState<ScreenShareQualityMode>("high");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [selectedMicId, setSelectedMicId] = useState("");

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
  const [hostActionError, setHostActionError] = useState<string | null>(null);
  const [isMicAllowed, setIsMicAllowed] = useState(true);
  const [isScreenShareAllowed, setIsScreenShareAllowed] = useState(true);

  // Modals & Panels
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [incomingMessage, setIncomingMessage] = useState<{ id: string; senderName: string; avatar: string; text: string } | null>(null);
  const notifiedMessageIds = useRef<Set<string>>(new Set());
  const [screenAudioAvailable, setScreenAudioAvailable] = useState<boolean | null>(null);
  const [fullscreenFallbackNotice, setFullscreenFallbackNotice] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isHostControlsOpen, setIsHostControlsOpen] = useState(false);
  const [isAddMediaOpen, setIsAddMediaOpen] = useState(false);
  const [mobileDrawer, setMobileDrawer] = useState<"participants" | "queue" | "chat" | null>(null);

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
  const networkMetrics = useNetworkTelemetry(room ?? undefined);
  const activeMicTrack = room?.localParticipant.getTrackPublication(Track.Source.Microphone)?.track as LocalAudioTrack | undefined;
  const { level: micLevel, devices: microphoneDevices } = useMicrophoneMonitor(activeMicTrack);

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
  const { isFullscreen, isSupported: isFullscreenSupported, toggleFullscreen } = useFullscreen();

  useEffect(() => {
    if (screenAudioAvailable !== true) return;
    const timer = window.setTimeout(() => setScreenAudioAvailable(null), 5000);
    return () => window.clearTimeout(timer);
  }, [screenAudioAvailable]);

  // Active speakers tracking
  const [speakingParticipantIds, setSpeakingParticipantIds] = useState<string[]>([]);

  const verifiedHostId =
    publicParticipants.find((participant) => participant.role === "host")?.id ||
    (session.role === "host" ? session.participantId : undefined);

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
    verifiedHostId,
  );

  const isHost = session.role === "host";
  const hostParticipantId = verifiedHostId;
  const mediaQueue = useMediaQueue({
    room,
    isHost,
    localParticipantId: session.participantId,
    hostParticipantId,
    roomCode,
    sessionSecret: session.sessionSecret,
  });

  // Keep unread state and an in-room toast up-to-date without replaying the
  // notification for our locally optimistic message or duplicate renders.
  useEffect(() => {
    const newRemoteMessages = messages.filter((message) => message.senderId !== session.participantId && !notifiedMessageIds.current.has(message.id));
    if (!newRemoteMessages.length) return;
    newRemoteMessages.forEach((message) => notifiedMessageIds.current.add(message.id));
    if (notifiedMessageIds.current.size > 500) {
      const oldest = notifiedMessageIds.current.values().next().value;
      if (oldest) notifiedMessageIds.current.delete(oldest);
    }
    if (isChatOpen) return;
    setUnreadCount((prev) => prev + newRemoteMessages.length);
    const newest = newRemoteMessages[newRemoteMessages.length - 1];
    setIncomingMessage({ id: newest.id, senderName: newest.senderName, avatar: newest.avatar, text: newest.text });
    const timer = setTimeout(() => setIncomingMessage(null), 5000);
    return () => clearTimeout(timer);
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
        const self = (data.room.participants || []).find((participant: PublicParticipant) => participant.id === session.participantId);
        if (self) {
          setIsMicAllowed(!self.isMutedByHost);
          setIsScreenShareAllowed(self.canScreenShare);
        }
      }
    } catch {}
  }, [roomCode, session.participantId]);

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
      setConnectionStage("connected");
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
      setConnectionStage("failed");
    };
    const handleReconnecting = () => {
      if (!active) return;
      logDiagnostic("room reconnecting");
      setIsReconnecting(true);
      setConnectionStage("reconnecting");
    };
    const handleReconnected = () => {
      if (!active) return;
      logDiagnostic("room reconnected");
      setIsReconnecting(false);
      setConnectionStage("connected");
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
      if (pub.source === Track.Source.Microphone) {
        setIsMicEnabled(true);
        if (pub.track) {
          reapplyKrispIfNeeded(pub.track as LocalAudioTrack).catch((error) => {
            logDiagnostic("Krisp reapply failed after publish", error);
          });
        }
      }
      if (pub.source === Track.Source.Camera) {
        setIsVideoEnabled(true);
      }
      if (pub.source === Track.Source.ScreenShareAudio) setScreenAudioAvailable(true);
    };
    const handleLocalTrackUnpublished = (pub: any) => {
      if (!active) return;
      setIsScreenSharing(lkRoom.localParticipant.isScreenShareEnabled);
      if (pub.source === Track.Source.Microphone) {
        setIsMicEnabled(false);
        cleanupKrisp().catch(() => {});
      }
      if (pub.source === Track.Source.Camera) {
        setIsVideoEnabled(false);
      }
      if (pub.source === Track.Source.ScreenShareAudio) setScreenAudioAvailable(false);
    };
    const handleLocalTrackMuted = (pub: any, participant?: Participant) => {
      if (!active) return;
      if (participant && participant !== lkRoom.localParticipant) {
        updateRemotes();
        return;
      }
      if (pub.source === Track.Source.Microphone) setIsMicEnabled(false);
      if (pub.source === Track.Source.Camera) {
        setIsVideoEnabled(false);
      }
    };
    const handleLocalTrackUnmuted = (pub: any, participant?: Participant) => {
      if (!active) return;
      if (participant && participant !== lkRoom.localParticipant) {
        updateRemotes();
        return;
      }
      if (pub.source === Track.Source.Microphone) setIsMicEnabled(true);
      if (pub.source === Track.Source.Camera) {
        setIsVideoEnabled(true);
      }
    };
    const handleParticipantPermissionsChanged = (_previousPermissions: unknown, participant?: Participant) => {
      if (!active || participant && participant !== lkRoom.localParticipant) return;
      const sources = lkRoom.localParticipant.permissions?.canPublishSources;
      if (!sources) return;
      setIsMicAllowed(sources.includes(Track.sourceToProto(Track.Source.Microphone)));
      setIsScreenShareAllowed(sources.includes(Track.sourceToProto(Track.Source.ScreenShare)));
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
        { event: RoomEvent.TrackMuted, handler: handleLocalTrackMuted },
        { event: RoomEvent.TrackUnmuted, handler: handleLocalTrackUnmuted },
        { event: RoomEvent.ParticipantPermissionsChanged, handler: handleParticipantPermissionsChanged },
        { event: RoomEvent.ActiveSpeakersChanged, handler: handleActiveSpeakersChanged },
      ],
    );

    const connectToRoom = async () => {
      logDiagnostic("connection attempt started");
      setConnectionStage("connecting");
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
        setConnectionStage("failed");
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

  const getMicCaptureOptions = useCallback((noiseEnabled: boolean, deviceId?: string): AudioCaptureOptions => ({
    noiseSuppression: noiseEnabled,
    echoCancellation: noiseEnabled,
    autoGainControl: noiseEnabled,
    ...(deviceId ? { deviceId } : {}),
  }), []);

  const handleToggleMic = async () => {
    if (!room) return;
    setMicError(null);
    const next = !isMicEnabled;
    if (next && !isMicAllowed) {
      setMicError("The host has muted your microphone. Ask the host to allow microphone access before unmuting.");
      return;
    }
    try {
      await room.localParticipant.setMicrophoneEnabled(next, getMicCaptureOptions(isNoiseEnabled, selectedMicId || undefined));
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
        await room.localParticipant.setMicrophoneEnabled(true, getMicCaptureOptions(next, selectedMicId || undefined));
      }
      setNoiseEnabled(next);
    } catch (err) {
      console.warn("Failed to apply microphone noise reduction setting:", err);
      if (isMicEnabled && !room.localParticipant.isMicrophoneEnabled) {
        try {
          await room.localParticipant.setMicrophoneEnabled(true, getMicCaptureOptions(isNoiseEnabled, selectedMicId || undefined));
        } catch (restoreError) {
          console.error("Failed to restore microphone after noise reduction change:", restoreError);
        }
      }
    }
  };

  const handleSelectMicrophone = async (deviceId: string) => {
    if (!room || !isMicEnabled || deviceId === selectedMicId) {
      setSelectedMicId(deviceId);
      return;
    }
    const publication = room.localParticipant.getTrackPublication(Track.Source.Microphone);
    try {
      if (publication?.track) await room.localParticipant.unpublishTrack(publication.track, true);
      await room.localParticipant.setMicrophoneEnabled(true, getMicCaptureOptions(isNoiseEnabled, deviceId));
      setSelectedMicId(deviceId);
      const nextPublication = room.localParticipant.getTrackPublication(Track.Source.Microphone);
      if (nextPublication?.track) await reapplyKrispIfNeeded(nextPublication.track as LocalAudioTrack);
    } catch (error: any) {
      setMicError(error?.name === "OverconstrainedError" || error?.name === "NotFoundError" ? "That microphone is no longer available." : "Could not switch microphones.");
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

  useEffect(() => {
    if (!room || !initialMedia || initialMediaAppliedRef.current) return;
    initialMediaAppliedRef.current = true;
    const applyInitialMedia = async () => {
      if (initialMedia.cameraEnabled) {
        try {
          await room.localParticipant.setCameraEnabled(true, { facingMode });
          setIsVideoEnabled(true);
        } catch (error: any) {
          setCameraError(error?.name === "NotAllowedError" ? "Camera permission denied. Turn your camera on with the room controls after allowing access." : "Could not start your camera. Use the camera control to retry.");
        }
      }
      if (initialMedia.micEnabled) {
        try {
          await room.localParticipant.setMicrophoneEnabled(true, getMicCaptureOptions(isNoiseEnabled));
          setIsMicEnabled(true);
        } catch (error: any) {
          setMicError(error?.name === "NotAllowedError" ? "Microphone permission denied. Allow access and turn your microphone on with the room controls." : "Could not start your microphone. Use the microphone control to retry.");
        }
      }
    };
    void applyInitialMedia();
  }, [room, initialMedia, facingMode, getMicCaptureOptions, isNoiseEnabled]);

  const handleToggleScreenShare = async () => {
    if (!room) return;
    const next = !isScreenSharing;
    if (next && !isScreenShareAllowed) {
      setHostActionError("The host has disabled screen sharing for you.");
      return;
    }
    try {
      if (next) {
        const opts = getScreenShareOptions(qualityMode);
        await room.localParticipant.setScreenShareEnabled(true, opts);
        setIsScreenSharing(true);
        const audioPublication = room.localParticipant.getTrackPublication(Track.Source.ScreenShareAudio);
        setScreenAudioAvailable(!!audioPublication?.track);
      } else {
        await room.localParticipant.setScreenShareEnabled(false);
        setIsScreenSharing(false);
        setScreenAudioAvailable(null);
      }
    } catch (err) {
      console.warn("Failed to toggle screen share:", err);
      setIsScreenSharing(false);
    }
  };

  const handleFullscreenAction = () => {
    if (isFullscreenSupported) {
      void toggleFullscreen();
      return;
    }
    setFullscreenFallbackNotice(true);
    window.setTimeout(() => setFullscreenFallbackNotice(false), 6000);
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
    } else {
      setHostActionError("The kick did not complete. Refresh the participant list and try again.");
    }
  };

  const handleMuteParticipant = async (targetId: string, muted: boolean) => {
    const res = await fetch(`/api/rooms/${roomCode}/moderate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId: session.participantId, sessionSecret: session.sessionSecret, action: "mute", targetParticipantId: targetId, muted }),
    });
    if (!res.ok) {
      setHostActionError("Could not update the participant microphone permission.");
      return;
    }
    setHostActionError(null);
    await fetchRoomInfo();
    sendHostBroadcast("mute", targetId);
  };

  const handleSetScreenSharePermission = async (targetId: string, allowed: boolean) => {
    const res = await fetch(`/api/rooms/${roomCode}/moderate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId: session.participantId, sessionSecret: session.sessionSecret, action: "toggle_screen_share", targetParticipantId: targetId, canScreenShare: allowed }),
    });
    if (!res.ok) {
      setHostActionError("Could not update the participant screen-share permission.");
      return;
    }
    setHostActionError(null);
    await fetchRoomInfo();
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

  const liveKitMicrophoneStates: Record<string, boolean> = {};
  for (const participant of [room?.localParticipant, ...remoteParticipants]) {
    if (!participant) continue;
    const publication = participant.getTrackPublication(Track.Source.Microphone);
    liveKitMicrophoneStates[participant.identity] = Boolean(publication && !publication.isMuted);
  }
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
    const stageLabel = connectionStage === "preparing"
      ? "Preparing your private room"
      : connectionStage === "connecting"
      ? "Establishing secure connection"
      : connectionStage === "reconnecting"
      ? "Reconnecting to your circle"
      : "Joining your circle";
    return (
      <div className="relative min-h-screen overflow-hidden bg-black flex flex-col items-center justify-center p-6 text-white">
        <div className="pointer-events-none absolute -top-32 h-80 w-80 rounded-full bg-brand/10 blur-3xl" />
        <div className="relative flex w-full max-w-sm flex-col items-center gap-5 rounded-3xl border border-brand/20 bg-[#0c0c0c]/90 p-8 shadow-2xl shadow-brand/5">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand/15 text-brand ring-1 ring-brand/30 animate-pulse">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div className="text-center"><p className="text-lg font-bold text-white">{stageLabel}</p><p className="mt-1 text-xs text-gray-500">{roomTitle}</p></div>
          <div className="w-full space-y-2 text-xs">
            {["Preparing your private room", "Establishing secure connection", "Joining your circle"].map((label, index) => {
              const activeIndex = connectionStage === "preparing" ? 0 : connectionStage === "connecting" ? 1 : 2;
              return <div key={label} className={`flex items-center gap-2 ${index <= activeIndex ? "text-brand" : "text-gray-600"}`}><span className={`h-1.5 w-1.5 rounded-full ${index <= activeIndex ? "bg-brand" : "bg-gray-700"}`} />{label}</div>;
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="room-shell relative h-[100dvh] min-h-0 w-full overflow-hidden bg-black text-white flex flex-col select-none">
      {/* Subtle ambient backdrop */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none" aria-hidden="true">
        <div className="absolute top-0 right-1/4 w-[500px] h-[300px] rounded-full bg-[radial-gradient(ellipse,rgba(187,251,43,0.02)_0%,transparent_70%)] blur-[100px]" />
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[300px] rounded-full bg-[radial-gradient(ellipse,rgba(16,185,129,0.015)_0%,transparent_70%)] blur-[120px]" />
      </div>

      {/* Top Header Bar */}
      <header className="room-header min-h-14 border-b border-[#2a2a2a] bg-black/90 px-2.5 sm:px-4 flex items-center justify-between gap-2 backdrop-blur-md z-30 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <BrandLogo size="sm" />
          <div className="h-4 w-[1px] bg-[#2a2a2a] hidden sm:block" />
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-xs sm:text-sm text-white truncate max-w-[100px] xs:max-w-[130px] sm:max-w-xs">
              {roomTitle}
            </span>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#111111] border border-[#2a2a2a] text-[10px] sm:text-[11px] text-gray-400 font-medium flex-shrink-0">
              <Users className="w-3 h-3 text-brand" />
              <span>{remoteParticipants.length + 1}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {isReconnecting && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] sm:text-[11px] font-semibold animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span className="hidden sm:inline">Reconnecting...</span>
            </div>
          )}
          <button
            onClick={() => setMobileDrawer("participants")}
            className="lg:hidden min-w-10 min-h-10 w-10 h-10 rounded-xl border border-[#2a2a2a] bg-[#111] text-gray-300 grid place-items-center hover:bg-[#1a1a1a] transition-colors"
            aria-label="Open participants"
            title="Participants"
          >
            <Users className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobileDrawer("queue")}
            className="lg:hidden min-w-10 min-h-10 w-10 h-10 rounded-xl border border-[#2a2a2a] bg-[#111] text-gray-300 grid place-items-center hover:bg-[#1a1a1a] transition-colors"
            aria-label="Open media queue"
            title="Media queue"
          >
            <ListVideo className="w-4 h-4" />
          </button>
          {isHost && (
            <button
              onClick={() => setIsHostControlsOpen(true)}
              className="lg:hidden min-w-10 min-h-10 w-10 h-10 rounded-xl border border-brand/30 bg-brand/10 text-brand grid place-items-center hover:bg-brand/20 transition-colors"
              aria-label="Open host controls"
              title="Host controls"
            >
              <Crown className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsInviteOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-brand/10 hover:bg-brand/20 border border-brand/30 text-brand text-xs font-semibold transition-colors min-h-[38px]"
          >
            <span>Invite</span>
          </button>
        </div>
      </header>

      {/* iOS Safari / Android audio unlock banner */}
      {!canPlayAudio && (
        <button
          className="bg-brand/10 border-b border-brand/30 px-4 py-2.5 flex items-center justify-between text-xs text-brand z-30 animate-in fade-in cursor-pointer"
          onClick={startAudio}
          type="button"
          aria-label="Tap to enable incoming room audio"
        >
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong>Tap to enable audio</strong> — your browser blocked autoplay. Tap here to hear other participants.
            </span>
          </div>
        </button>
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
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Desktop participant and queue rail */}
        <aside className="room-rail hidden lg:flex w-64 xl:w-72 flex-shrink-0 flex-col bg-[#080808] border-r border-[#222] min-h-0">
          <RoomSidebarLeft participants={publicParticipants} localParticipantId={session.participantId} speakingParticipantIds={speakingParticipantIds} networkMetrics={networkMetrics} microphoneStates={liveKitMicrophoneStates} className="!w-full !border-r-0 flex-1 min-h-0" />
          <section className="h-[38%] min-h-[190px] border-t border-[#222] flex-shrink-0">
            <MediaQueuePanel queue={mediaQueue.queue} currentIndex={mediaQueue.currentIndex} isPlaying={mediaQueue.isPlaying} isHost={isHost} localParticipantId={session.participantId} onPlayItem={mediaQueue.playItem} onRemoveItem={mediaQueue.removeItem} onOpenAddMedia={() => setIsAddMediaOpen(true)} />
          </section>
        </aside>

        {/* Center — video grid + floating reactions */}
        <main className="room-canvas flex-1 flex flex-col overflow-hidden relative min-w-0 min-h-0 bg-black">
          {mediaQueue.currentItem && ![room?.localParticipant, ...remoteParticipants].some((participant) => participant?.isScreenShareEnabled) ? (
            <>
              <section className="flex-1 min-h-0 p-2 sm:p-3 lg:p-5">
                <MediaStage currentItem={mediaQueue.currentItem} isPlaying={mediaQueue.isPlaying} currentTime={mediaQueue.currentTime} isHost={mediaQueue.canControlCurrentItem} canAddMedia={true} onPlay={mediaQueue.play} onPause={mediaQueue.pause} onSeek={mediaQueue.seek} onEnded={mediaQueue.nextItem} onOpenAddMedia={() => setIsAddMediaOpen(true)} onTimeUpdate={mediaQueue.setCurrentTime} />
              </section>
              <section className="h-28 sm:h-32 flex-shrink-0 border-t border-[#222]">
                <ParticipantGrid localParticipant={room?.localParticipant} remoteParticipants={remoteParticipants} raisedHands={raisedHands} messages={messages} currentParticipantId={session.participantId} onSendMessage={sendMessage} unreadCount={unreadCount} onOpenChat={() => { setIsChatOpen(true); setUnreadCount(0); }} networkMetrics={networkMetrics} onStopScreenShare={handleToggleScreenShare} qualityMode={qualityMode} onChangeQualityMode={setQualityMode} />
              </section>
            </>
          ) : <ParticipantGrid
            localParticipant={room?.localParticipant}
            remoteParticipants={remoteParticipants}
            raisedHands={raisedHands}
            messages={messages}
            currentParticipantId={session.participantId}
            onSendMessage={sendMessage}
            unreadCount={unreadCount}
            onOpenChat={() => setUnreadCount(0)}
            networkMetrics={networkMetrics}
            onStopScreenShare={() => handleToggleScreenShare()}
            qualityMode={qualityMode}
            onChangeQualityMode={setQualityMode}
          />}

          {screenAudioAvailable === true && isScreenSharing && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 max-w-[calc(100%-1.5rem)] rounded-xl border border-brand/30 bg-black/90 px-3 py-2 text-xs text-brand shadow-xl" role="status">
              Screen audio is being shared. Capture depends on the source and browser; tab audio usually requires “Share tab audio”.
            </div>
          )}

          {fullscreenFallbackNotice && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 max-w-[calc(100%-1.5rem)] rounded-xl border border-[#333] bg-black/95 px-3 py-2 text-center text-xs text-gray-200 shadow-xl" role="status">
              Fullscreen is unavailable in this browser. Rotate your phone for a wider view, or add AddaRoom to your Home Screen to use its standalone layout.
            </div>
          )}

          {screenAudioAvailable === false && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 max-w-[calc(100%-1.5rem)] rounded-xl border border-amber-400/30 bg-black/90 px-3 py-2 text-xs text-amber-100 shadow-xl" role="status">
              System audio was not captured. In Chrome, choose a browser tab and enable “Share tab audio”, or select system audio in the picker when available.
            </div>
          )}

          {incomingMessage && (
            <div className="absolute top-4 right-4 z-40 w-[min(25rem,calc(100%-2rem))] animate-in slide-in-from-right-5 fade-in duration-300" role="status" aria-live="polite">
              <div className="rounded-2xl border border-brand/40 bg-black/90 p-3 shadow-2xl shadow-brand/10 backdrop-blur-xl">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-xl ring-1 ring-brand/20">{incomingMessage.avatar || "👋"}</div>
                  <button
                    onClick={() => {
                      if (typeof window !== "undefined" && window.innerWidth < 1024) setMobileDrawer("chat");
                      else setIsChatOpen(true);
                      setUnreadCount(0);
                      setIncomingMessage(null);
                    }}
                    className="min-w-0 flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    aria-label={`Open chat. ${incomingMessage.senderName} says ${incomingMessage.text}`}
                  >
                    <span className="block text-sm font-bold text-brand">{incomingMessage.senderName}</span>
                    <span className="mt-1 block break-words text-sm leading-relaxed text-white">{incomingMessage.text}</span>
                    <span className="mt-2 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">Open room chat</span>
                  </button>
                  <button onClick={() => setIncomingMessage(null)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white" aria-label="Dismiss message notification"><X className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          )}

          {/* Floating Social Reactions */}
          <FloatingReactions reactions={activeReactions} />

          {/* Mobile Drawers (Slide-up bottom sheet for participants, queue & chat) */}
          {mobileDrawer && (
            <div
              className="fixed inset-0 z-50 lg:hidden bg-black/75 backdrop-blur-sm flex items-end animate-in fade-in duration-200"
              role="dialog"
              aria-modal="true"
              aria-label={
                mobileDrawer === "participants"
                  ? "Participants"
                  : mobileDrawer === "queue"
                  ? "Media queue"
                  : "Room chat"
              }
            >
              <button
                className="absolute inset-0 w-full h-full cursor-default"
                aria-label="Close drawer"
                onClick={() => setMobileDrawer(null)}
              />
              <section
                className={`relative z-10 w-full rounded-t-3xl border border-[#292929] border-b-0 bg-[#0b0b0b] flex flex-col overflow-hidden pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl ${
                  mobileDrawer === "chat" ? "h-[85dvh]" : "max-h-[80dvh] min-h-[45dvh]"
                }`}
              >
                <div className="h-12 px-4 flex items-center justify-between border-b border-[#222] flex-shrink-0 bg-[#0e0e0e]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-1 rounded-full bg-zinc-600 mx-auto absolute top-2 left-1/2 -translate-x-1/2" />
                    <h2 className="text-sm font-semibold text-white">
                      {mobileDrawer === "participants"
                        ? `Participants · ${publicParticipants.length}`
                        : mobileDrawer === "queue"
                        ? `Media Queue · ${mediaQueue.queue.length}`
                        : `Room Chat · ${messages.length}`}
                    </h2>
                  </div>
                  <button
                    onClick={() => setMobileDrawer(null)}
                    className="min-w-10 min-h-10 grid place-items-center rounded-xl text-gray-300 hover:bg-[#1a1a1a]"
                    aria-label="Close drawer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {mobileDrawer === "participants" ? (
                    <RoomSidebarLeft
                      participants={publicParticipants}
                      localParticipantId={session.participantId}
                      speakingParticipantIds={speakingParticipantIds}
                      networkMetrics={networkMetrics}
                      microphoneStates={liveKitMicrophoneStates}
                      className="!w-full !border-r-0 !overflow-y-auto"
                    />
                  ) : mobileDrawer === "queue" ? (
                    <MediaQueuePanel
                      queue={mediaQueue.queue}
                      currentIndex={mediaQueue.currentIndex}
                      isPlaying={mediaQueue.isPlaying}
                      isHost={isHost}
                      localParticipantId={session.participantId}
                      onPlayItem={mediaQueue.playItem}
                      onRemoveItem={mediaQueue.removeItem}
                      onOpenAddMedia={() => setIsAddMediaOpen(true)}
                    />
                  ) : (
                    <ChatPanel
                      isOpen={true}
                      isEmbedded={true}
                      onClose={() => setMobileDrawer(null)}
                      messages={messages}
                      currentParticipantId={session.participantId}
                      onSendMessage={sendMessage}
                      onSendTyping={sendTyping}
                      typingUsers={typingUsers}
                    />
                  )}
                </div>
              </section>
            </div>
          )}
        </main>

        {/* Right sidebar — chat panel, desktop only, shown when chat open */}
        {isChatOpen && (
          <aside className="hidden lg:flex w-80 xl:w-[22rem] flex-shrink-0 flex-col bg-[#0b0b0b] border-l border-[#222] overflow-hidden">
            <ChatPanel
              isOpen={isChatOpen}
              isEmbedded={true}
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
        isChatOpen={isChatOpen || mobileDrawer === "chat"}
        qualityMode={qualityMode}
        isNoiseEnabled={isNoiseEnabled}
        isBrowserProcessingSupported={isBrowserProcessingSupported}
        isFullscreen={isFullscreen}
        isFullscreenSupported={isFullscreenSupported}
        isMicAllowed={isMicAllowed}
        isScreenShareAllowed={isScreenShareAllowed}
        krispState={krispState}
        isKrispSupported={isKrispSupported}
        krispErrorMessage={krispErrorMessage}
        micLevel={micLevel}
        microphoneDevices={microphoneDevices}
        selectedMicId={selectedMicId}
        onToggleMic={handleToggleMic}
        onToggleVideo={handleToggleVideo}
        onFlipCamera={handleFlipCamera}
        onToggleScreenShare={handleToggleScreenShare}
        onChangeQualityMode={setQualityMode}
        onSendReaction={sendReaction}
        onToggleHandRaise={handleToggleHandRaise}
        onToggleChat={() => {
          if (typeof window !== "undefined" && window.innerWidth < 1024) {
            setMobileDrawer((prev) => (prev === "chat" ? null : "chat"));
          } else {
            setIsChatOpen((prev) => !prev);
          }
          setUnreadCount(0);
        }}
        onToggleNoise={handleToggleNoise}
        onToggleKrisp={toggleKrisp}
        onSelectMicrophone={handleSelectMicrophone}
        onToggleFullscreen={handleFullscreenAction}
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
        onMuteParticipant={handleMuteParticipant}
        onSetScreenSharePermission={handleSetScreenSharePermission}
        actionError={hostActionError}
      />

      <AddMediaDialog isOpen={isAddMediaOpen} onClose={() => setIsAddMediaOpen(false)} onAddItem={mediaQueue.addItem} localParticipantId={session.participantId} localDisplayName={session.displayName} />
    </div>
  );
}
