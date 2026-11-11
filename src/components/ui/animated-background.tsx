"use client";

import React from "react";

interface AnimatedBackgroundProps {
  variant?: "rich" | "subtle";
  className?: string;
  children?: React.ReactNode;
}

const particles = [
  ["14%", "21%", "18s", "0s"], ["78%", "18%", "24s", "-8s"], ["64%", "72%", "21s", "-13s"],
  ["23%", "81%", "27s", "-4s"], ["91%", "54%", "22s", "-16s"], ["47%", "12%", "30s", "-11s"],
];

export function AnimatedBackground({ variant = "rich", className = "", children }: AnimatedBackgroundProps) {
  const isRich = variant === "rich";

  return (
    <div className={`cinematic-bg relative min-h-screen bg-black overflow-hidden ${className}`}>
      <div className={`cinematic-bg__layers pointer-events-none absolute inset-0 z-0 overflow-hidden select-none ${isRich ? "" : "cinematic-bg__layers--subtle"}`} aria-hidden="true">
        <div className="cinematic-orb cinematic-orb--cyan" />
        <div className="cinematic-orb cinematic-orb--violet" />
        <div className="cinematic-orb cinematic-orb--breath" />
        <div className="cinematic-mesh" />
        <div className="cinematic-vignette" />
        <div className="cinematic-grain" />
        {isRich && <div className="cinematic-particles">{particles.map(([left, top, duration, delay], index) => <span key={index} style={{ left, top, animationDuration: duration, animationDelay: delay }} />)}</div>}
      </div>
      <div className="relative z-10 flex flex-col min-h-screen">{children}</div>
    </div>
  );
}
