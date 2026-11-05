"use client";

import React, { useState } from "react";
import { Lock, Unlock, ShieldAlert, UserMinus, Crown, Edit3, X, Check } from "lucide-react";
import { PublicParticipant } from "@/types";

interface HostControlsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  roomTitle: string;
  isLocked: boolean;
  participants: PublicParticipant[];
  currentParticipantId: string;
  onUpdateLock: (locked: boolean) => Promise<void>;
  onUpdateTitle: (title: string) => Promise<void>;
  onKickParticipant: (targetParticipantId: string) => Promise<void>;
  onTransferHost: (targetParticipantId: string) => Promise<void>;
  onEndRoom: () => Promise<void>;
}

export function HostControlsDialog({
  isOpen,
  onClose,
  roomCode,
  roomTitle,
  isLocked,
  participants,
  currentParticipantId,
  onUpdateLock,
  onUpdateTitle,
  onKickParticipant,
  onTransferHost,
  onEndRoom,
}: HostControlsDialogProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(roomTitle);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

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

  const otherParticipants = participants.filter((p) => p.id !== currentParticipantId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Host Controls</h3>
            <p className="text-xs text-slate-400">Manage room permissions and participants</p>
          </div>
        </div>

        {/* Room Title Edit */}
        <div className="mb-5 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="block text-xs font-semibold text-slate-400 mb-1">Room Title</span>
          {editingTitle ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                maxLength={50}
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleSaveTitle}
                disabled={loadingAction === "title"}
                className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">{roomTitle}</span>
              <button
                onClick={() => setEditingTitle(true)}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
            </div>
          )}
        </div>

        {/* Lock Room Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isLocked ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"}`}>
              {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {isLocked ? "Room is Locked" : "Room is Unlocked"}
              </p>
              <p className="text-xs text-slate-400">
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

        {/* Participant Moderation */}
        <div className="mb-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Active Members ({otherParticipants.length})
          </h4>

          {otherParticipants.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-3 bg-slate-950/40 rounded-xl border border-slate-800">
              No other participants in the room yet. Share the invite link!
            </p>
          ) : (
            <div className="space-y-2">
              {otherParticipants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{p.avatar || "👤"}</span>
                    <span className="font-semibold text-slate-200">{p.displayName}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTransfer(p.id)}
                      disabled={loadingAction === `transfer_${p.id}`}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-medium flex items-center gap-1 transition-colors"
                      title="Make Host"
                    >
                      <Crown className="w-3 h-3" /> Make Host
                    </button>
                    <button
                      onClick={() => handleKick(p.id)}
                      disabled={loadingAction === `kick_${p.id}`}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
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
          <p className="text-xs text-slate-400 mb-3">
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
                className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 transition-colors"
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
