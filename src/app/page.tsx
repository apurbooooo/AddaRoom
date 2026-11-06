"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { CreateRoomModal } from "@/components/create-room-modal";
import { AnimatedBackground } from "@/components/ui/animated-background";
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
    <AnimatedBackground variant="rich" className="flex-1 flex flex-col overflow-x-clip text-white">
      {/* Navigation Bar */}
      <header className="border-b border-[#1a1a1a] bg-black/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 min-w-0">
          <BrandLogo size="md" />
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            <button
              onClick={() => setIsJoinCodeOpen(true)}
              className="px-2.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-gray-300 hover:text-white hover:bg-[#111111] border border-transparent hover:border-[#2a2a2a] transition-all"
            >
              <span className="sm:hidden">Join</span>
              <span className="hidden sm:inline">Enter Code</span>
            </button>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-2.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-brand hover:bg-[#ceff44] text-black shadow-md shadow-brand/20 transition-all"
            >
              <span className="sm:hidden">Create</span>
              <span className="hidden sm:inline">Create Room</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        {/* Glow ambient background elements */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-brand/8 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[300px] bg-brand/5 blur-[140px] pointer-events-none rounded-full" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <div className="inline-flex max-w-full flex-wrap justify-center items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>100% Free &amp; Open Source — No Accounts Needed</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-[1.1] mb-6">
            Your Circle. Your Room. <br className="hidden sm:inline" />
            <span className="text-brand">Your Adda.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-xl text-gray-400 mb-10 leading-relaxed font-normal">
            A private place to watch, talk, share and hang out with your favorite people. Built for 2 to 6 friends.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-14">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-brand hover:bg-[#ceff44] text-black font-bold text-base shadow-xl shadow-brand/25 transition-all flex items-center justify-center gap-2 group"
            >
              <span>Create Room</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>

            <button
              onClick={() => setIsJoinCodeOpen(true)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#111111] hover:bg-[#1a1a1a] text-gray-200 border border-[#2a2a2a] font-bold text-base transition-all"
            >
              Join with Code
            </button>
          </div>

          {/* 6-Person Active Room Preview */}
          <div className="relative rounded-3xl bg-[#111111]/80 border border-[#2a2a2a] p-3 sm:p-5 shadow-2xl backdrop-blur-xl">
            {/* Window title bar mockup */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a2a] mb-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="font-semibold text-gray-300 ml-2">Friday Chill Adda</span>
                <span className="px-2 py-0.5 rounded-md bg-brand/20 text-brand text-[10px] font-bold">
                  6/6 Full
                </span>
              </div>
              <span className="text-gray-500 hidden sm:inline">1080p WebRTC SFU</span>
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
                  className={`h-28 sm:h-36 rounded-2xl bg-black border p-3 flex flex-col justify-between relative overflow-hidden transition-all ${
                    p.speaking
                      ? "border-brand shadow-brand/10 ring-1 ring-brand/30"
                      : "border-[#2a2a2a]"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-xl sm:text-2xl">{p.emoji}</span>
                    {p.speaking && (
                      <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-xs sm:text-sm text-white truncate">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{p.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature Sections */}
      <section className="py-16 bg-black border-t border-[#1a1a1a]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Engineered for Small Circles
            </h2>
            <p className="text-gray-500 text-sm mt-2">
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
                  className="p-6 rounded-2xl bg-[#111111]/60 border border-[#1a1a1a] hover:border-[#2a2a2a] transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand border border-brand/20 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{feat.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#1a1a1a] bg-black py-8 px-4 text-center text-xs text-gray-600">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <BrandLogo size="sm" />
          <p className="text-gray-500">
            Open-source under MIT License. Powered by LiveKit &amp; Next.js.
          </p>
          <div className="flex gap-4">
            <span className="text-gray-500">Self-Hostable with Docker</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm rounded-2xl bg-[#111111] border border-[#2a2a2a] p-6 shadow-2xl text-white">
            <h3 className="text-lg font-bold text-white mb-1">Enter Room Code</h3>
            <p className="text-xs text-gray-400 mb-4">
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
                className="w-full px-4 py-2.5 rounded-xl bg-black border border-[#2a2a2a] font-mono tracking-widest text-center text-base text-brand placeholder-gray-600 focus:outline-none focus:border-brand transition-colors"
              />

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!joinCode.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-[#ceff44] text-black font-bold text-xs disabled:opacity-50 transition-colors"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={() => setIsJoinCodeOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AnimatedBackground>
  );
}
