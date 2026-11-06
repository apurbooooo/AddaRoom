"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Lock, LogIn, Loader2, AlertCircle, KeyRound } from "lucide-react";
import { PublicRoomInfo } from "@/types";
import { saveRoomSession } from "@/lib/session-storage";

interface JoinRoomCardProps {
  room: PublicRoomInfo;
}

export function JoinRoomCard({ room }: JoinRoomCardProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [avatar, setAvatar] = useState("👋");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFull = room.participantCount >= room.capacity;
  const isLocked = room.status === "locked";
  const isEnded = room.status === "ended";

  const avatarOptions = ["👋", "😎", "🦊", "⚡", "🎧", "🎮", "☕", "🐱", "✨", "🍕"];

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("Please enter your display name");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/rooms/${room.roomCode}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          avatar,
          ...(room.hasPassword ? { password } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const code = data.code || data.error;
        if (code === "WRONG_PASSWORD") {
          throw new Error("Incorrect password. Please try again.");
        } else if (code === "PASSWORD_REQUIRED") {
          throw new Error("This room requires a password to join.");
        }
        throw new Error(data.message || data.error || "Failed to join room");
      }

      saveRoomSession(data.session);
      router.push(`/room/${room.roomCode}`);
    } catch (err: any) {
      setError(err.message || "Failed to join room");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl bg-[#111111] border border-[#2a2a2a] p-6 shadow-2xl text-white">
      {/* Room Overview Banner */}
      <div className="p-4 rounded-xl bg-black border border-[#2a2a2a] mb-5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
          Private Room
        </span>
        <h2 className="text-xl font-bold text-white mt-0.5">{room.title}</h2>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
          <span>Host: <strong className="text-gray-200">{room.hostName}</strong></span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            <strong className={isFull ? "text-rose-400" : "text-emerald-400"}>
              {room.participantCount} / {room.capacity}
            </strong>
          </span>
        </div>
      </div>

      {/* Capacity & Lock Status alerts */}
      {isFull && (
        <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>Room Full:</strong> This room has reached its maximum capacity of {room.capacity} participants.
          </span>
        </div>
      )}

      {isLocked && !isFull && (
        <div className="mb-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
          <Lock className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>Room Locked:</strong> The host has temporarily locked this room to new entries.
          </span>
        </div>
      )}

      {isEnded && (
        <div className="mb-4 p-3.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>Room Ended:</strong> This Adda session has concluded.
          </span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Join Form */}
      {!isFull && !isLocked && !isEnded && (
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Your Display Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name to join..."
                maxLength={30}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-black border border-[#2a2a2a] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand transition-colors"
              />
              <div className="w-11 h-11 rounded-xl bg-black border border-[#2a2a2a] flex items-center justify-center text-xl">
                {avatar}
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
              {avatarOptions.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatar(emoji)}
                  className={`p-1.5 rounded-lg text-lg transition-transform hover:scale-110 min-w-[36px] min-h-[36px] flex items-center justify-center ${
                    avatar === emoji
                      ? "bg-brand/20 border border-brand"
                      : "hover:bg-[#1a1a1a]"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Password field — only shown when room has a password set */}
          {room.hasPassword && (
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3 h-3" />
                Room Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter room password..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-[#2a2a2a] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand transition-colors"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !displayName.trim()}
            className="w-full py-3 rounded-xl bg-brand hover:bg-[#ceff44] text-black font-bold text-sm shadow-lg shadow-brand/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            {loading ? "Joining Adda..." : "Join Hangout"}
          </button>
        </form>
      )}
    </div>
  );
}
