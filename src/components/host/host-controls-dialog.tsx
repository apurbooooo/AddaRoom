"use client";

import React, { useState } from "react";
import { Lock, Unlock, ShieldAlert, UserMinus, Crown, Edit3, X, Check, Activity, Clock, KeyRound, KeySquare, Loader2, Mic, MicOff, Monitor, MonitorOff } from "lucide-react";
import { PublicParticipant } from "@/types";
import { AvatarPortrait } from "@/components/avatar/avatar-portrait";

interface HostControlsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  roomTitle: string;
  isLocked: boolean;
  hasPassword: boolean;
  participants: PublicParticipant[];
  currentParticipantId: string;
  actionError?: string | null;
  sessionDurationSeconds?: number;
  onUpdateLock: (locked: boolean) => Promise<void>;
  onUpdateTitle: (title: string) => Promise<void>;
  onKickParticipant: (targetParticipantId: string) => Promise<void>;
  onMuteParticipant: (targetParticipantId: string, muted: boolean) => Promise<void>;
  onSetScreenSharePermission: (targetParticipantId: string, allowed: boolean) => Promise<void>;
  onTransferHost: (targetParticipantId: string) => Promise<void>;
  onEndRoom: () => Promise<void>;
  onSetPassword: (password: string | null) => Promise<void>;
}

export function HostControlsDialog({
  isOpen,
  onClose,
  roomCode,
  roomTitle,
  isLocked,
  hasPassword,
  participants,
  currentParticipantId,
  actionError,
  sessionDurationSeconds = 0,
  onUpdateLock,
  onUpdateTitle,
  onKickParticipant,
  onMuteParticipant,
  onSetScreenSharePermission,
  onTransferHost,
  onEndRoom,
  onSetPassword,
}: HostControlsDialogProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(roomTitle);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  if (!isOpen) return null;

  const handleSaveTitle = async () => {
    if (!newTitle.trim() || newTitle === roomTitle) {
      setEditingTitle(false);
      return;
    }
    setLoadingAction("title");
    try {
      await onUpdateTitle(newTitle.trim());
      setEditingTitle(false);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleToggleLock = async () => {
    setLoadingAction("lock");
    try {
      await onUpdateLock(!isLocked);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleKick = async (id: string) => {
    setLoadingAction(`kick_${id}`);
    try {
      await onKickParticipant(id);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleMute = async (id: string, muted: boolean) => {
    setLoadingAction(`mute_${id}`);
    try { await onMuteParticipant(id, muted); }
    finally { setLoadingAction(null); }
  };

  const handleScreenShare = async (id: string, allowed: boolean) => {
    setLoadingAction(`share_${id}`);
    try { await onSetScreenSharePermission(id, allowed); }
    finally { setLoadingAction(null); }
  };

  const handleTransfer = async (id: string) => {
    if (!confirm("Are you sure you want to transfer host privileges to this participant?")) return;
    setLoadingAction(`transfer_${id}`);
    try {
      await onTransferHost(id);
      onClose();
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEndRoom = async () => {
    setLoadingAction("end");
    try {
      await onEndRoom();
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSetPassword = async () => {
    if (!newPassword.trim()) return;
    setLoadingAction("setPassword");
    try {
      await onSetPassword(newPassword.trim());
      setNewPassword("");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRemovePassword = async () => {
    setLoadingAction("removePassword");
    try {
      await onSetPassword(null);
    } finally {
      setLoadingAction(null);
    }
  };

  const otherParticipants = participants.filter((p) => p.id !== currentParticipantId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 max-sm:items-end max-sm:p-0">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#111111] border border-[#2a2a2a] p-6 shadow-2xl text-white max-h-[90dvh] overflow-y-auto max-sm:max-w-none max-sm:rounded-t-3xl max-sm:rounded-b-none max-sm:border-b-0 max-sm:px-4 max-sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <button
          onClick={onClose}
                  className="absolute top-3 right-3 min-w-11 min-h-11 grid place-items-center text-gray-400 hover:text-white rounded-lg hover:bg-[#1a1a1a] transition-colors"
          aria-label="Close host controls"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-300 border border-violet-400/20">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Host Controls</h3>
            <p className="text-xs text-gray-400">Manage room permissions and participants</p>
          </div>
        </div>

        {actionError && <p className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200" role="alert">{actionError}</p>}

        {/* Room Title Edit */}
        <div className="mb-5 p-3.5 rounded-xl bg-black border border-[#2a2a2a]">
          <span className="block text-xs font-semibold text-gray-400 mb-1">Room Title</span>
          {editingTitle ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                maxLength={50}
                className="flex-1 px-3 py-1.5 rounded-lg bg-[#111111] border border-[#2a2a2a] text-xs text-white focus:outline-none focus:border-brand"
              />
              <button
                onClick={handleSaveTitle}
                disabled={loadingAction === "title"}
                className="p-2 rounded-lg bg-brand hover:bg-cyan-300 text-black"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">{roomTitle}</span>
              <button
                onClick={() => setEditingTitle(true)}
                className="flex items-center gap-1 text-xs text-brand hover:text-cyan-300"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
            </div>
          )}
        </div>

        {/* Lock Room Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-black border border-[#2a2a2a] mb-5">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isLocked ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"}`}>
              {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {isLocked ? "Room is Locked" : "Room is Unlocked"}
              </p>
              <p className="text-xs text-gray-400">
                {isLocked ? "No new participants can join" : "Anyone with link/code can join"}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleLock}
            disabled={loadingAction === "lock"}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              isLocked
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-rose-600/80 hover:bg-rose-600 text-white"
            }`}
          >
            {isLocked ? "Unlock" : "Lock"}
          </button>
        </div>

        {/* Room Password */}
        <div className="mb-5 p-3.5 rounded-xl bg-black border border-[#2a2a2a]">
          <div className="flex items-center gap-1.5 mb-3">
            <KeyRound className="w-3.5 h-3.5 text-brand" />
            <span className="text-xs font-semibold text-gray-300">Room Password</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-black border border-[#2a2a2a] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand transition-colors"
            />
            <button
              onClick={handleSetPassword}
              disabled={!newPassword.trim() || loadingAction === "setPassword"}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-brand hover:bg-cyan-300 text-black text-xs font-bold disabled:opacity-50 transition-colors min-h-[44px]"
            >
              {loadingAction === "setPassword" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <KeySquare className="w-3.5 h-3.5" />
              )}
              Set
            </button>
            {hasPassword && (
              <button
                onClick={handleRemovePassword}
                disabled={loadingAction === "removePassword"}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-600/40 text-rose-300 text-xs font-semibold disabled:opacity-50 transition-colors min-h-[44px]"
              >
                {loadingAction === "removePassword" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <X className="w-3.5 h-3.5" />
                )}
                Remove
              </button>
            )}
          </div>
          <p className="text-[11px]">
            Status:{" "}
            {hasPassword ? (
              <span className="text-brand font-semibold">Password protected</span>
            ) : (
              <span className="text-gray-500">No password</span>
            )}
          </p>
        </div>

        {/* Free Cloud Tier Quota Monitor */}
        <div className="mb-5 p-3.5 rounded-xl bg-black border border-[#2a2a2a]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-brand" />
              <span className="text-xs font-semibold text-gray-300">Free Cloud Quota Monitor</span>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                sessionDurationSeconds >= 5400
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              }`}
            >
              {sessionDurationSeconds >= 5400 ? "Approaching Advisory" : "Normal Usage"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
            <div className="p-2 rounded-lg bg-[#111111] border border-[#2a2a2a]">
              <div className="flex items-center gap-1 text-gray-400 mb-0.5 text-[11px]">
                <Clock className="w-3 h-3 text-gray-400" />
                <span>Call Duration</span>
              </div>
              <span className="font-mono font-bold text-white">
                {Math.floor(sessionDurationSeconds / 60)}m {sessionDurationSeconds % 60 < 10 ? "0" : ""}
                {sessionDurationSeconds % 60}s
              </span>
            </div>

            <div className="p-2 rounded-lg bg-[#111111] border border-[#2a2a2a]">
              <span className="block text-gray-400 text-[11px] mb-0.5">Est. Session Consumption</span>
              <span className="font-mono font-bold text-brand">
                {((sessionDurationSeconds / 3600) * (participants.length > 0 ? participants.length : 1)).toFixed(2)}{" "}
                <span className="text-[10px] text-gray-400">part-hrs</span>
              </span>
            </div>
          </div>

          <p className="text-[11px] text-gray-500 leading-tight">
            LiveKit Cloud Build free tier provides 100 participant-hours &amp; 50GB egress/month. No billing is enabled.
          </p>
        </div>

        {/* Participant Moderation */}
        <div className="mb-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            Active Members ({otherParticipants.length})
          </h4>

          {otherParticipants.length === 0 ? (
            <p className="text-xs text-gray-500 italic p-3 bg-black/40 rounded-xl border border-[#2a2a2a]">
              No other participants in the room yet. Share the invite link!
            </p>
          ) : (
            <div className="space-y-2">
              {otherParticipants.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-black border border-[#2a2a2a] text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <AvatarPortrait avatarId={p.avatar || p.id} size={28} />
                    <span className="font-semibold text-gray-200 truncate">{p.displayName}</span>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <button
                      onClick={() => handleMute(p.id, !p.isMutedByHost)}
                      disabled={loadingAction === `mute_${p.id}`}
                      className="min-h-11 min-w-11 sm:px-3 rounded-xl bg-[#171717] border border-[#303030] hover:border-brand/50 text-gray-200 text-[11px] font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
                      aria-label={`${p.isMutedByHost ? "Unmute" : "Mute"} ${p.displayName}`}
                      title={p.isMutedByHost ? "Allow microphone" : "Mute microphone"}
                    >
                      {loadingAction === `mute_${p.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : p.isMutedByHost ? <Mic className="w-4 h-4 text-brand" /> : <MicOff className="w-4 h-4" />}
                      <span className="hidden sm:inline">{p.isMutedByHost ? "Unmute" : "Mute"}</span>
                    </button>
                    <button
                      onClick={() => handleScreenShare(p.id, !p.canScreenShare)}
                      disabled={loadingAction === `share_${p.id}`}
                      className="min-h-11 min-w-11 sm:px-3 rounded-xl bg-[#171717] border border-[#303030] hover:border-brand/50 text-gray-200 text-[11px] font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
                      aria-label={`${p.canScreenShare ? "Disable" : "Allow"} screen sharing for ${p.displayName}`}
                      title={p.canScreenShare ? "Disable screen sharing" : "Allow screen sharing"}
                    >
                      {loadingAction === `share_${p.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : p.canScreenShare ? <Monitor className="w-4 h-4 text-brand" /> : <MonitorOff className="w-4 h-4" />}
                      <span className="hidden sm:inline">{p.canScreenShare ? "Share on" : "Share off"}</span>
                    </button>
                    <button
                      onClick={() => handleTransfer(p.id)}
                      disabled={loadingAction === `transfer_${p.id}`}
                      className="px-3 rounded-xl bg-[#171717] border border-[#303030] hover:border-brand/50 text-gray-200 text-[11px] font-medium flex items-center gap-1 transition-colors min-h-[44px]"
                      title="Make Host"
                    >
                      <Crown className="w-3 h-3" /> Make Host
                    </button>
                    <button
                      onClick={() => handleKick(p.id)}
                      disabled={loadingAction === `kick_${p.id}`}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                      title="Remove participant"
                      aria-label={`Remove ${p.displayName} from room`}
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* End Room For Everyone */}
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/30">
          <div className="flex items-center gap-2 text-rose-400 mb-1">
            <ShieldAlert className="w-4 h-4" />
            <h5 className="text-xs font-bold uppercase tracking-wider">Danger Zone</h5>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Ending the room closes the session and disconnects all participants.
          </p>

          {showEndConfirm ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleEndRoom}
                disabled={loadingAction === "end"}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors"
              >
                Confirm End Room
              </button>
              <button
                onClick={() => setShowEndConfirm(false)}
                className="px-3 py-2 rounded-xl bg-[#1a1a1a] text-gray-300 text-xs hover:bg-[#2a2a2a] transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowEndConfirm(true)}
              className="w-full py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-600/40 text-rose-300 font-semibold text-xs transition-colors"
            >
              End Room for Everyone
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
