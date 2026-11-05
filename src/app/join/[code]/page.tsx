"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { JoinRoomCard } from "@/components/join-room-card";
import { PublicRoomInfo } from "@/types";
import { getRoomSession } from "@/lib/session-storage";
import { Loader2, AlertCircle } from "lucide-react";

export default function JoinRoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const router = useRouter();
  const { code } = use(params);
  const [room, setRoom] = useState<PublicRoomInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If the user already has an active session stored for this room, jump directly to the room
    const existing = getRoomSession(code);
    if (existing) {
      router.push(`/room/${code}`);
      return;
    }

    const fetchRoom = async () => {
      try {
        const res = await fetch(`/api/rooms/${code}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("This Adda does not exist or has expired.");
          } else {
            setError("Failed to load room details.");
          }
          setLoading(false);
          return;
        }

        const data = await res.json();
        setRoom(data.room);
      } catch (err: any) {
        setError("Network error loading room.");
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [code, router]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <BrandLogo size="md" />
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
            <p className="text-sm text-slate-400">Loading room info...</p>
          </div>
        ) : error ? (
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Room Unavailable</h2>
            <p className="text-xs text-slate-400 mb-6">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
            >
              Return Home
            </button>
          </div>
        ) : room ? (
          <JoinRoomCard room={room} />
        ) : null}
      </main>
    </div>
  );
}
