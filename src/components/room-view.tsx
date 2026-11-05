"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Room,
  RoomEvent,
  Participant,
  RemoteParticipant,
  VideoPresets,
} from "livekit-client";
import { ParticipantGrid } from "@/components/media/participant-grid";
import { RoomControlBar } from "@/components/room-control-bar";
import { ChatPanel } from "@/components/chat/chat-panel";
import { InviteModal } from "@/components/invite-modal";
import { HostControlsDialog } from "@/components/host/host-controls-dialog";
import { FloatingReactions } from "@/components/social/floating-reactions";
import { BrandLogo } from "@/components/brand-logo";
import { useRoomDataChannel } from "@/hooks/use-room-data-channel";
import { ClientSession, PublicParticipant, ScreenShareQualityMode } from "@/types";
import { getScreenShareOptions } from "@/lib/media-constraints";
import { clearRoomSession } from "@/lib/session-storage";
import { soundManager } from "@/lib/sound-effects";
import { Loader2, AlertTriangle, Users, LogOut, X } from "lucide-react";

interface RoomViewProps {
  roomCode: string;
  initialSession: ClientSession;
  livekitToken: string;
  livekitUrl: string;
}

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

  // Media states
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [qualityMode, setQualityMode] = useState<ScreenShareQualityMode>("high");

  // Participants state
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
  const [publicParticipants, setPublicParticipants] = useState<PublicParticipant[]>([]);

  // Room metadata
  const [roomTitle, setRoomTitle] = useState(session.roomCode);
  const [isLocked, setIsLocked] = useState(false);

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

  // Connect to LiveKit Room
  useEffect(() => {
    let active = true;
    const lkRoom = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: VideoPresets.h720.resolution,
      },
    });

    const connectToRoom = async () => {
      try {
        await lkRoom.connect(livekitUrl, livekitToken);
        if (!active) {
          lkRoom.disconnect();
          return;
        }

        setRoom(lkRoom);
        setConnected(true);
        soundManager.playJoin();

        // Enable initial mic
        try {
          await lkRoom.localParticipant.setMicrophoneEnabled(true);
          setIsMicEnabled(true);
        } catch {
          setIsMicEnabled(false);
        }

        // Remote participants state
        const updateRemotes = () => {
          setRemoteParticipants(Array.from(lkRoom.remoteParticipants.values()));
        };

        lkRoom.on(RoomEvent.ParticipantConnected, (p) => {
          soundManager.playJoin();
          updateRemotes();
          fetchRoomInfo();
        });

        lkRoom.on(RoomEvent.ParticipantDisconnected, (p) => {
          soundManager.playLeave();
          updateRemotes();
          fetchRoomInfo();
        });

        lkRoom.on(RoomEvent.LocalTrackPublished, () => {
          setIsScreenSharing(lkRoom.localParticipant.isScreenShareEnabled);
        });

        lkRoom.on(RoomEvent.LocalTrackUnpublished, () => {
          setIsScreenSharing(lkRoom.localParticipant.isScreenShareEnabled);
        });

        lkRoom.on(RoomEvent.Disconnected, () => {
          setConnected(false);
        });

        updateRemotes();
      } catch (err: any) {
        console.error("Failed to connect to LiveKit:", err);
        setConnectingError(err.message || "Could not connect to media server");
      }
    };

    connectToRoom();

    return () => {
      active = false;
      lkRoom.disconnect();
    };
  }, [livekitUrl, livekitToken, fetchRoomInfo]);

  // Media toggles
  const handleToggleMic = async () => {
    if (!room) return;
    const next = !isMicEnabled;
    try {
      await room.localParticipant.setMicrophoneEnabled(next);
      setIsMicEnabled(next);
    } catch (err) {
      console.warn("Failed to toggle mic:", err);
    }
  };

  const handleToggleVideo = async () => {
    if (!room) return;
    const next = !isVideoEnabled;
    try {
      await room.localParticipant.setCameraEnabled(next);
      setIsVideoEnabled(next);
    } catch (err) {
      console.warn("Failed to toggle camera:", err);
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

  // Host Action handlers
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

  const handleLeaveRoom = async () => {
    if (confirm("Leave this room?")) {
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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
        <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Media Connection Error</h2>
          <p className="text-xs text-slate-400 mb-6">{connectingError}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              Retry Connection
            </button>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center animate-pulse">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <p className="text-sm font-semibold text-slate-300">Entering {roomTitle}...</p>
          <p className="text-xs text-slate-500">Connecting to secure media SFU</p>
        </div>
      </div>
    );
  }

  const isHost = session.role === "host";

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col select-none">
      {/* Top Header Bar */}
      <header className="h-14 border-b border-slate-800/80 bg-slate-950/80 px-4 flex items-center justify-between backdrop-blur-md z-30 flex-shrink-0">
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" />
          <div className="h-4 w-[1px] bg-slate-800 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white truncate max-w-[140px] sm:max-w-xs">
              {roomTitle}
            </span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-400 font-medium">
              <Users className="w-3 h-3 text-indigo-400" />
              <span>{remoteParticipants.length + 1}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsInviteOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-colors"
          >
            <span>Invite</span>
          </button>
        </div>
      </header>

      {/* Free Tier Usage Advisory Banner (triggers when call reaches 90+ minutes) */}
      {sessionDurationSeconds >= 5400 && !dismissedUsageWarning && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-200 z-30 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              <strong>Free-Tier Usage Advisory:</strong> This room has been active for {Math.floor(sessionDurationSeconds / 60)} minutes (~{((sessionDurationSeconds / 3600) * (remoteParticipants.length + 1)).toFixed(1)} participant-hours). Free cloud accounts include ~100 participant-hours/month.
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

      {/* Main Center Video / Media Stage */}
      <main className="flex-1 flex overflow-hidden relative">
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

        {/* Right Side / Drawer Chat Panel */}
        <ChatPanel
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          messages={messages}
          currentParticipantId={session.participantId}
          onSendMessage={sendMessage}
          onSendTyping={sendTyping}
          typingUsers={typingUsers}
        />
      </main>

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
        onToggleMic={handleToggleMic}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onChangeQualityMode={setQualityMode}
        onSendReaction={sendReaction}
        onToggleHandRaise={handleToggleHandRaise}
        onToggleChat={() => {
          setIsChatOpen((prev) => !prev);
          setUnreadCount(0);
        }}
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
        participants={publicParticipants}
        currentParticipantId={session.participantId}
        sessionDurationSeconds={sessionDurationSeconds}
        onUpdateLock={handleUpdateLock}
        onUpdateTitle={handleUpdateTitle}
        onKickParticipant={handleKickParticipant}
        onTransferHost={handleTransferHost}
        onEndRoom={handleEndRoom}
      />
    </div>
  );
}

