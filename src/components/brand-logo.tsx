import React from "react";
import Link from "next/link";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  withTagline?: boolean;
}

export function BrandLogo({ size = "md", withTagline = false }: BrandLogoProps) {
  const iconSizes = {
    sm: "w-7 h-7 text-sm",
    md: "w-9 h-9 text-base",
    lg: "w-12 h-12 text-xl",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-3xl",
  };

  return (
    <Link href="/" className="inline-flex items-center gap-2.5 group select-none">
      <div
        className={`relative ${iconSizes[size]} rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-indigo-500/40`}
      >
        <span className="font-black tracking-tighter">AR</span>
        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-slate-950 animate-pulse" />
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className={`font-extrabold tracking-tight text-white ${textSizes[size]}`}>
            Adda<span className="text-indigo-400">Room</span>
          </span>
          <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            FOSS
          </span>
        </div>
        {withTagline && (
          <span className="text-xs text-slate-400 font-medium">
            Your Circle. Your Room. Your Adda.
          </span>
        )}
      </div>
    </Link>
  );
}
