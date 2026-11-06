import React from "react";
import Link from "next/link";
import Image from "next/image";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  withTagline?: boolean;
  symbolOnly?: boolean;
  className?: string;
}

export function BrandLogo({
  size = "md",
  withTagline = false,
  symbolOnly = false,
  className = "",
}: BrandLogoProps) {
  const iconDimensions = {
    sm: { width: 28, height: 28, class: "w-7 h-7" },
    md: { width: 36, height: 36, class: "w-9 h-9" },
    lg: { width: 48, height: 48, class: "w-12 h-12" },
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-3xl",
  };

  const currentIcon = iconDimensions[size];

  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2.5 group select-none transition-transform active:scale-95 ${className}`}
      aria-label="AddaRoom Home"
    >
      {/* Official AddaRoom Logo Symbol */}
      <div
        className={`relative ${currentIcon.class} rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center shadow-lg shadow-brand/15 transition-all duration-300 group-hover:scale-105 group-hover:shadow-brand/30`}
      >
        <Image
          src="/brand/addaroom-logo.svg"
          alt="AddaRoom Logo"
          width={currentIcon.width}
          height={currentIcon.height}
          className="w-full h-full object-contain"
          priority
          unoptimized
        />
      </div>

      {/* Wordmark (unless symbolOnly) */}
      {!symbolOnly && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`font-black tracking-tight text-[#F4F7EF] ${textSizes[size]}`}>
              Adda<span className="text-brand">Room</span>
            </span>
            <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20 hidden sm:inline-block">
              FOSS
            </span>
          </div>
          {withTagline && (
            <span className="text-xs text-gray-400 font-medium truncate">
              Your Circle. Your Room. Your Adda.
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
