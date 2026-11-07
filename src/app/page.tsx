"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { CreateRoomModal } from "@/components/create-room-modal";
import { AnimatedBackground } from "@/components/ui/animated-background";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  LockKeyhole,
  MessageCircle,
  Mic2,
  MonitorUp,
  Play,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  Wifi,
  X,
} from "lucide-react";

const participants = [
  { name: "Apurbo", role: "Host", avatar: "/avatars/creator-midnight.svg", tone: "lime" },
  { name: "Nadia", role: "Camera on", avatar: "/avatars/persona-female-pfp.svg", tone: "violet" },
  { name: "Tanvir", role: "Listening", avatar: "/avatars/cyberpunk-dev-midnight.svg", tone: "cyan" },
  { name: "Maya", role: "Speaking", avatar: "/avatars/music-producer-midnight.svg", tone: "amber" },
];

const features = [
  { icon: MonitorUp, title: "Share the moment", copy: "A calm, high-quality stage for watch parties, demos, and the tabs that matter." },
  { icon: MessageCircle, title: "Talk without leaving", copy: "Private chat and floating reactions keep the room alive while the main stage stays clear." },
  { icon: ShieldCheck, title: "Small by design", copy: "Invite-only rooms for 2–6 people. No feeds, no public directories, no account friction." },
];

export default function LandingPage() {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [isJoinCodeOpen, setIsJoinCodeOpen] = useState(false);

  const handleJoinByCode = (event: React.FormEvent) => {
    event.preventDefault();
    const clean = joinCode.trim();
    if (clean) router.push(`/join/${clean}`);
  };

  return (
    <AnimatedBackground variant="rich" className="text-white">
      <header className="site-nav">
        <div className="site-nav__inner">
          <BrandLogo size="md" />
          <div className="flex items-center gap-2 sm:gap-3">
            <button className="nav-link" onClick={() => setIsJoinCodeOpen(true)}>
              <span className="hidden sm:inline">Join with code</span>
              <span className="sm:hidden">Join</span>
            </button>
            <button className="button button--lime button--compact" onClick={() => setIsCreateOpen(true)}>
              Create room <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow__dot" /> Private rooms for your people</div>
            <h1>Make space for the <span>good kind</span> of noise.</h1>
            <p className="hero-lede">A private, beautifully simple room to watch, talk, share, and stay close with the people you already know.</p>
            <div className="hero-actions">
              <button className="button button--lime button--large" onClick={() => setIsCreateOpen(true)}>
                Create a room <ArrowUpRight className="h-4 w-4" />
              </button>
              <button className="button button--ghost button--large" onClick={() => setIsJoinCodeOpen(true)}>
                Join with code <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="hero-proof">
              <span><Check className="h-3.5 w-3.5" /> No account needed</span>
              <span><Check className="h-3.5 w-3.5" /> 2–6 friends</span>
              <span><Check className="h-3.5 w-3.5" /> Open source</span>
            </div>
          </div>

          <div className="demo-wrap" aria-label="Animated AddaRoom product demonstration">
            <div className="demo-orbit demo-orbit--one" />
            <div className="demo-orbit demo-orbit--two" />
            <div className="demo-window">
              <div className="demo-window__topbar">
                <div className="demo-window__dots"><i /><i /><i /></div>
                <div className="demo-window__crumb"><span className="signal-pulse" /> Friday Chill Adda <span className="demo-window__code">7X9–2K4P</span></div>
                <div className="demo-window__live"><Wifi className="h-3 w-3" /> LIVE</div>
              </div>
              <div className="demo-window__body">
                <div className="demo-stage">
                  <div className="demo-stage__label"><Play className="h-3 w-3 fill-current" /> Shared stage</div>
                  <div className="demo-screen"><div className="demo-screen__bar" /><div className="demo-screen__copy"><span>movie-night.mp4</span><strong>Ready when you are.</strong><small>Apurbo is sharing their screen</small></div><div className="demo-screen__scan" /></div>
                  <div className="demo-reaction reaction--one">🔥</div>
                  <div className="demo-reaction reaction--two">👏</div>
                  <div className="demo-chat-pop"><div className="demo-chat-pop__avatar"><img src="/avatars/persona-female-pfp.svg" alt="" /></div><div><strong>Nadia</strong><span>this scene is perfect</span></div><MessageCircle className="h-3.5 w-3.5 text-[#BBFB2B]" /></div>
                </div>
                <div className="demo-rail">
                  <div className="demo-rail__heading"><span>In the room</span><b>4/6</b></div>
                  {participants.map((participant, index) => (
                    <div className={`demo-person demo-person--${participant.tone}`} key={participant.name} style={{ animationDelay: `${index * 180}ms` }}>
                      <div className="demo-person__avatar"><img src={participant.avatar} alt="" />{index === 0 && <span className="demo-person__crown">✦</span>}</div>
                      <div><strong>{participant.name}</strong><span>{participant.role}</span></div>
                      {participant.role === "Speaking" ? <Mic2 className="h-3 w-3 text-[#BBFB2B]" /> : <span className="demo-person__status" />}
                    </div>
                  ))}
                  <div className="demo-rail__invite"><Users className="h-3.5 w-3.5" /> Invite your circle</div>
                </div>
              </div>
              <div className="demo-window__footer"><div><span className="demo-control demo-control--active"><Mic2 className="h-3.5 w-3.5" /></span><span className="demo-control"><Video className="h-3.5 w-3.5" /></span><span className="demo-control demo-control--share"><MonitorUp className="h-3.5 w-3.5" /></span></div><span className="demo-window__hint">Screen share is on</span><span className="demo-control demo-control--end">Leave</span></div>
            </div>
            <div className="demo-caption"><span className="demo-caption__line" /><span>Everything you need, nothing in the way.</span></div>
          </div>
        </section>

        <section className="signal-strip"><div><span className="signal-strip__mark">01</span><span>Built for the in-between moments</span></div><div className="signal-strip__line" /><div><span>Always private</span><LockKeyhole className="h-3.5 w-3.5 text-[#BBFB2B]" /></div></section>

        <section className="feature-section">
          <div className="section-intro"><div className="eyebrow">The room is yours</div><h2>Less platform.<br /><span>More presence.</span></h2><p>AddaRoom keeps the useful parts of being together and leaves the noise at the door.</p></div>
          <div className="feature-list">{features.map(({ icon: Icon, title, copy }, index) => <article className="feature-item" key={title}><span className="feature-item__index">0{index + 1}</span><div className="feature-item__icon"><Icon className="h-5 w-5" /></div><div><h3>{title}</h3><p>{copy}</p></div><ArrowUpRight className="feature-item__arrow h-4 w-4" /></article>)}</div>
        </section>

        <section className="closing-section"><Sparkles className="h-5 w-5 text-[#BBFB2B]" /><h2>Your people are one code away.</h2><button className="button button--lime button--large" onClick={() => setIsCreateOpen(true)}>Start an Adda <ArrowUpRight className="h-4 w-4" /></button></section>
      </main>

      <footer className="site-footer"><BrandLogo size="sm" /><span>Open-source under MIT. Made for small circles.</span><span className="hidden sm:inline">Powered by LiveKit &amp; Next.js</span></footer>

      <CreateRoomModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      {isJoinCodeOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) setIsJoinCodeOpen(false); }}><div className="code-modal"><button className="code-modal__close" onClick={() => setIsJoinCodeOpen(false)} aria-label="Close"><X className="h-4 w-4" /></button><div className="eyebrow"><span className="eyebrow__dot" /> Join a private room</div><h2>Enter your invite code.</h2><p>Use the code your friend sent you to step straight into the room.</p><form onSubmit={handleJoinByCode}><label htmlFor="join-code">Room code</label><input id="join-code" autoFocus value={joinCode} onChange={(event) => setJoinCode(event.target.value)} placeholder="7X9–2K4P" /><button className="button button--lime button--large" type="submit" disabled={!joinCode.trim()}>Continue <ArrowUpRight className="h-4 w-4" /></button></form></div></div>}
    </AnimatedBackground>
  );
}
