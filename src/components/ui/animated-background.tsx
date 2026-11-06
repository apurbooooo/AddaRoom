"use client";

import React from "react";

interface AnimatedBackgroundProps {
  variant?: "rich" | "subtle";
  className?: string;
  children?: React.ReactNode;
}

export function AnimatedBackground({
  variant = "rich",
  className = "",
  children,
}: AnimatedBackgroundProps) {
  const isRich = variant === "rich";

  return (
    <div className={`relative min-h-screen bg-black overflow-hidden ${className}`}>
      {/* Decorative ambient aurora layers (pointer-events: none, z-0) */}
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none"
        aria-hidden="true"
      >
        {/* Deep base vignette */}
        <div className="absolute inset-0 bg-radial-vignette opacity-90" />

        {/* Primary Lime Aurora Orb (slow 32s orbit) */}
        <div
          className={`absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full blur-[140px] animate-aurora-slow mix-blend-screen transition-opacity ${
            isRich
              ? "bg-[radial-gradient(circle,rgba(187,251,43,0.07)_0%,rgba(16,185,129,0.03)_50%,transparent_75%)] opacity-100"
              : "bg-[radial-gradient(circle,rgba(187,251,43,0.03)_0%,transparent_70%)] opacity-60"
          }`}
        />

        {/* Secondary Forest / Emerald Glow (slow 40s counter-orbit) */}
        <div
          className={`absolute -bottom-40 -right-40 w-[680px] h-[680px] rounded-full blur-[160px] animate-aurora-reverse mix-blend-screen transition-opacity ${
            isRich
              ? "bg-[radial-gradient(circle,rgba(16,185,129,0.06)_0%,rgba(6,182,212,0.025)_45%,transparent_75%)] opacity-100"
              : "bg-[radial-gradient(circle,rgba(16,185,129,0.025)_0%,transparent_70%)] opacity-50"
          }`}
        />

        {/* Center subtle spotlight for landing hero */}
        {isRich && (
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full bg-[radial-gradient(ellipse,rgba(187,251,43,0.035)_0%,transparent_70%)] blur-[100px] animate-pulse-slow" />
        )}

        {/* Fine procedural SVG grain overlay for tactile texture */}
        <div
          className="absolute inset-0 opacity-[0.02] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Interactive content layer (above ambient background) */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {children}
      </div>
    </div>
  );
}
