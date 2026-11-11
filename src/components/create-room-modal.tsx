"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Sparkles, X, Loader2 } from "lucide-react";
import { RoomCapacity } from "@/types";
import { saveRoomSession } from "@/lib/session-storage";
import { PreJoinPreview } from "@/components/pre-join-preview";
import { AvatarPicker } from "@/components/avatar/avatar-picker";
import { AvatarPortrait } from "@/components/avatar/avatar-portrait";
import { DEFAULT_AVATAR_ID, getSavedAvatarId } from "@/lib/avatar-catalog";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateRoomModal({ isOpen, onClose }: CreateRoomModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState("Friday Night Adda");
  const [hostName, setHostName] = useState("");
  const [capacity, setCapacity] = useState<RoomCapacity>(6);
  const [avatar, setAvatar] = useState<string>(() => getSavedAvatarId() || DEFAULT_AVATAR_ID);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !hostName.trim()) {
      setError("Please provide a room title and your display name.");
      return;
    }

    setError(null);
    setShowPreview(true);
  };

  const completeCreate = async (cameraEnabled: boolean, micEnabled: boolean) => {
    setShowPreview(false);
    setLoading(true);
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
        throw new Error(data.message || data.error || "Failed to create room");
      }

      // Persist session
      saveRoomSession(data.session);
      sessionStorage.setItem(`addaroom:join-media:${data.room.roomCode}`, JSON.stringify({ cameraEnabled, micEnabled }));

      // Navigate to the created room
      router.push(`/room/${data.room.roomCode}`);
    } catch (err: any) {
      setError(err.message || "Failed to create room. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      {showPreview && <PreJoinPreview displayName={hostName.trim()} roomTitle={title.trim()} onJoin={completeCreate} onCancel={() => setShowPreview(false)} />}
      <div className="relative w-full max-w-md rounded-2xl bg-[#111111] border border-[#2a2a2a] p-6 shadow-2xl text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#1a1a1a] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <div className="p-2.5 rounded-xl bg-brand/10 text-brand border border-brand/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Create an Adda</h3>
            <p className="text-xs text-gray-400">Instant private room for your circle</p>
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
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Room Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Movie Watch Party, Studio Hangout..."
              maxLength={60}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-[#2a2a2a] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          {/* Host Name & Avatar */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Your Display Name
            </label>
            <div className="flex items-center gap-2.5">
              <input
                type="text"
                required
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="What should friends call you?"
                maxLength={30}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-black border border-[#2a2a2a] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand transition-colors"
              />
              <div className="flex-shrink-0" title="Selected avatar preview">
                <AvatarPortrait avatarId={avatar} size={44} className="border border-[#2a2a2a]" />
              </div>
            </div>
          </div>

          {/* User-Selectable Avatar Gallery */}
          <AvatarPicker selectedId={avatar} onSelect={setAvatar} />

          {/* Capacity Options: Exactly 2, 3, 4, 6 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-300">
                Max Capacity (including you)
              </label>
              <span className="text-[11px] text-gray-500 flex items-center gap-1">
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
                      ? "bg-brand border-brand text-black font-bold shadow-md shadow-brand/20"
                      : "bg-black border-[#2a2a2a] text-gray-400 hover:border-[#3a3a3a] hover:text-gray-200"
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
            className="w-full mt-2 py-3 rounded-xl bg-brand hover:bg-cyan-300 text-black font-bold text-sm shadow-lg shadow-brand/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? "Creating Adda..." : "Enter Your Room"}
          </button>
        </form>
      </div>
    </div>
  );
}
