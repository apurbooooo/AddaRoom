"use client";

import React, { useState } from "react";
import { Lock, Unlock, ShieldAlert, UserMinus, Crown, Edit3, X, Check, Activity, Clock, KeyRound, KeySquare, Loader2 } from "lucide-react";
import { PublicParticipant } from "@/types";

interface HostControlsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  roomTitle: string;
  isLocked: boolean;
  hasPassword: boolean;
  participants: PublicParticipant[];
  currentParticipantId: string;
  sessionDurationSeconds?: number;
  onUpdateLock: (locked: boolean) => Promise<void>;
  onUpdateTitle: (title: string) => Promise<void>;
  onKickParticipant: (targetParticipantId: string) => Promise<void>;
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
  sessionDurationSeconds = 0,
  onUpdateLock,
  onUpdateTitle,
  onKickParticipant,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#111111] border border-[#2a2a2a] p-6 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#1a1a1a] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Host Controls</h3>
            <p className="text-xs text-gray-400">Manage room permissions and participants</p>
          </div>
        </div>

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
                className="p-2 rounded-lg bg-brand hover:bg-[#ceff44] text-black"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">{roomTitle}</span>
              <button
                onClick={() => setEditingTitle(true)}
                className="flex items-center gap-1 text-xs text-brand hover:text-[#ceff44]"
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
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-brand hover:bg-[#ceff44] text-black text-xs font-bold disabled:opacity-50 transition-colors min-h-[44px]"
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
              <span className="text-[#BBFB2B] font-semibold">Password protected</span>
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
                  className="flex items-center justify-between p-2.5 rounded-xl bg-black border border-[#2a2a2a] text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{p.avatar || "👤"}</span>
                    <span className="font-semibold text-gray-200">{p.displayName}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTransfer(p.id)}
                      disabled={loadingAction === `transfer_${p.id}`}
                      className="px-2 py-1 rounded-lg bg-[#1a1a1a] hover:bg-[#2a2a2a] text-amber-300 text-[11px] font-medium flex items-center gap-1 transition-colors min-h-[32px]"
                      title="Make Host"
                    >
                      <Crown className="w-3 h-3" /> Make Host
                    </button>
                    <button
                      onClick={() => handleKick(p.id)}
                      disabled={loadingAction === `kick_${p.id}`}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                      title="Remove participant"
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
