"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Sparkles, X, Loader2 } from "lucide-react";
import { RoomCapacity } from "@/types";
import { saveRoomSession } from "@/lib/session-storage";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateRoomModal({ isOpen, onClose }: CreateRoomModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState("Friday Night Adda");
  const [hostName, setHostName] = useState("");
  const [capacity, setCapacity] = useState<RoomCapacity>(6);
  const [avatar, setAvatar] = useState("👑");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const avatarOptions = ["👑", "🚀", "🦊", "⚡", "🎧", "🎮", "☕", "🦄", "🔥", "🐱"];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !hostName.trim()) {
      setError("Please provide a room title and your display name.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          hostName: hostName.trim(),
          capacity,
          avatar,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create room");
      }

      // Persist session
      saveRoomSession(data.session);

      // Navigate to the created room
      router.push(`/room/${data.room.roomCode}`);
    } catch (err: any) {
      setError(err.message || "Failed to create room. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Create an Adda</h3>
            <p className="text-xs text-slate-400">Instant private room for your circle</p>
          </div>
        </div>

        {error && (
          <div className="my-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4 mt-4">
          {/* Room Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Room Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Movie Watch Party, Studio Hangout..."
              maxLength={60}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Host Name & Avatar */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Your Display Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="What should friends call you?"
                maxLength={30}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <div className="relative group">
                <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-xl cursor-pointer hover:border-slate-700">
                  {avatar}
                </div>
              </div>
            </div>

            {/* Avatar picker strip */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
              {avatarOptions.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatar(emoji)}
                  className={`p-1.5 rounded-lg text-lg transition-transform hover:scale-110 ${
                    avatar === emoji
                      ? "bg-indigo-600/30 border border-indigo-500"
                      : "hover:bg-slate-800"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Capacity Options: Exactly 2, 3, 4, 6 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Max Capacity (including you)
              </label>
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Users className="w-3 h-3" /> Intimate friend group
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {([2, 3, 4, 6] as const).map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => setCapacity(cap)}
                  className={`py-2.5 rounded-xl border text-center transition-all ${
                    capacity === cap
                      ? "bg-indigo-600 border-indigo-500 text-white font-bold shadow-md shadow-indigo-600/20"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <span className="block text-sm">{cap}</span>
                  <span className="block text-[10px] opacity-75">People</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? "Creating Adda..." : "Enter Your Room"}
          </button>
        </form>
      </div>
    </div>
  );
}
