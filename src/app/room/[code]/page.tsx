"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { RoomView } from "@/components/room-view";
import { getRoomSession, clearRoomSession } from "@/lib/session-storage";
import { ClientSession } from "@/types";
import { Loader2 } from "lucide-react";

export default function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const router = useRouter();
  const { code } = use(params);
  const [session, setSession] = useState<ClientSession | null>(null);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = getRoomSession(code);
    if (!saved) {
      // No active session found -> redirect to join screen
      router.replace(`/join/${code}`);
      return;
    }

    // Verify session with backend to get fresh LiveKit token
    const resumeSession = async () => {
      try {
        const res = await fetch(`/api/rooms/${code}/session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participantId: saved.participantId,
            sessionSecret: saved.sessionSecret,
          }),
        });

        if (!res.ok) {
          clearRoomSession(code);
          router.replace(`/join/${code}`);
          return;
        }

        const data = await res.json();
        setSession(data.session);
        setLivekitToken(data.livekitToken);
        setLivekitUrl(data.livekitUrl);
      } catch (err) {
        console.warn("Session resume error:", err);
        router.replace(`/join/${code}`);
      } finally {
        setLoading(false);
      }
    };

    resumeSession();
  }, [code, router]);

  if (loading || !session || !livekitToken || !livekitUrl) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          <p className="text-sm font-semibold text-slate-300">Authenticating room session...</p>
        </div>
      </div>
    );
  }

  return (
    <RoomView
      roomCode={code}
      initialSession={session}
      livekitToken={livekitToken}
      livekitUrl={livekitUrl}
    />
  );
}
