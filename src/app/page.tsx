"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { CreateRoomModal } from "@/components/create-room-modal";
import {
  Users,
  Video,
  Monitor,
  MessageSquare,
  ShieldCheck,
  Zap,
  ArrowRight,
  Sparkles,
  Lock,
  Tv,
  CheckCircle2,
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [isJoinCodeOpen, setIsJoinCodeOpen] = useState(false);

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinCode.trim();
    if (clean) {
      router.push(`/join/${clean}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100">
      {/* Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <BrandLogo size="md" />
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsJoinCodeOpen(true)}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all"
            >
              Enter Code
            </button>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all"
            >
              Create Room
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        {/* Glow ambient background elements */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/15 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] bg-violet-600/10 blur-[140px] pointer-events-none rounded-full" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>100% Free &amp; Open Source — No Accounts Needed</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-[1.1] mb-6">
            Your Circle. Your Room. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-400 via-indigo-200 to-violet-400 bg-clip-text text-transparent">
              Your Adda.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-xl text-slate-300 mb-10 leading-relaxed font-normal">
            A private place to watch, talk, share and hang out with your favorite people. Built for 2 to 6 friends.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-14">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base shadow-xl shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 group"
            >
              <span>Create Room</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>

            <button
              onClick={() => setIsJoinCodeOpen(true)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold text-base transition-all"
            >
              Join with Code
            </button>
          </div>

          {/* 6-Person Active Room Preview */}
          <div className="relative rounded-3xl bg-slate-900/80 border border-slate-800 p-3 sm:p-5 shadow-2xl backdrop-blur-xl">
            {/* Window title bar mockup */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80 mb-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="font-semibold text-slate-300 ml-2">Friday Chill Adda</span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                  6/6 Full
                </span>
              </div>
              <span className="text-slate-500 hidden sm:inline">1080p WebRTC SFU</span>
            </div>

            {/* Simulated 6-participant grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3.5 text-left">
              {[
                { name: "Apurbo (Host)", emoji: "👑", speaking: true, status: "Sharing Screen" },
                { name: "Tanvir", emoji: "⚡", speaking: false, status: "Listening" },
                { name: "Nadia", emoji: "🦊", speaking: false, status: "Camera On" },
                { name: "Rahim", emoji: "🎧", speaking: false, status: "Listening" },
                { name: "Sami", emoji: "🎮", speaking: true, status: "Speaking" },
                { name: "Maya", emoji: "☕", speaking: false, status: "Listening" },
              ].map((p, idx) => (
                <div
                  key={idx}
                  className={`h-28 sm:h-36 rounded-2xl bg-slate-950 border p-3 flex flex-col justify-between relative overflow-hidden transition-all ${
                    p.speaking
                      ? "border-indigo-500 shadow-indigo-500/10 ring-1 ring-indigo-500/30"
                      : "border-slate-800/80"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-xl sm:text-2xl">{p.emoji}</span>
                    {p.speaking && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-xs sm:text-sm text-white truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-400">{p.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature Sections */}
      <section className="py-16 bg-slate-950 border-t border-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Engineered for Small Circles
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              All the essentials for watching and talking together with zero clutter, zero ads, and zero subscriptions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Tv,
                title: "Watch Together",
                desc: "Stream your screen or watch party video with real 1080p clarity, smooth 30-60 FPS, and shared audio.",
              },
              {
                icon: MessageSquare,
                title: "Live Chat & Screen Overlay",
                desc: "Chat beside the video or let messages float semi-transparently directly over the shared screen.",
              },
              {
                icon: Video,
                title: "Crystal-Clear SFU Audio & Video",
                desc: "Powered by open-source LiveKit Selective Forwarding Unit. Echo cancellation, noise suppression, and active speaker glow.",
              },
              {
                icon: ShieldCheck,
                title: "Private & Ephemeral",
                desc: "No public room directories, no database user passwords, and no message recording. When the room ends, it's gone.",
              },
              {
                icon: Zap,
                title: "No Account Required",
                desc: "No email, no signup, no password. Pick a name, pick an avatar emoji, and you are in.",
              },
              {
                icon: Users,
                title: "Strict 2–6 Friends Limit",
                desc: "Atomic server capacity enforcement guarantees intimate group sizes for 2, 3, 4, or 6 people without unexpected crowds.",
              },
            ].map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{feat.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/60 bg-slate-950 py-8 px-4 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <BrandLogo size="sm" />
          <p className="text-slate-400">
            Open-source under MIT License. Powered by LiveKit &amp; Next.js.
          </p>
          <div className="flex gap-4">
            <span className="text-slate-400">Self-Hostable with Docker</span>
          </div>
        </div>
      </footer>

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      {/* Join Code Dialog */}
      {isJoinCodeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100">
            <h3 className="text-lg font-bold text-white mb-1">Enter Room Code</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter the 8-character code shared by your friend
            </p>

            <form onSubmit={handleJoinByCode} className="space-y-4">
              <input
                type="text"
                required
                autoFocus
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="e.g. 7x9-2k4p"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono tracking-widest text-center text-base text-indigo-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!joinCode.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs disabled:opacity-50 transition-colors"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={() => setIsJoinCodeOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
