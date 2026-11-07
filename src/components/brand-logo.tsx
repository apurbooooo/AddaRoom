import React from "react";
import Link from "next/link";
import Image from "next/image";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  withTagline?: boolean;
  symbolOnly?: boolean;
  className?: string;
}

const sizes = {
  sm: { width: 132, height: 31, symbol: 28 },
  md: { width: 158, height: 37, symbol: 34 },
  lg: { width: 208, height: 49, symbol: 46 },
};

export function BrandLogo({ size = "md", withTagline = false, symbolOnly = false, className = "" }: BrandLogoProps) {
  const current = sizes[size];

  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2.5 group select-none transition-transform active:scale-95 ${className}`}
      aria-label="AddaRoom Home"
    >
      <Image
        src={symbolOnly ? "/brand/addaroom-symbol.svg" : "/brand/addaroom-wordmark.svg"}
        alt="AddaRoom"
        width={symbolOnly ? current.symbol : current.width}
        height={symbolOnly ? current.symbol : current.height}
        className="object-contain transition-transform duration-300 group-hover:scale-[1.03]"
        style={{ width: symbolOnly ? current.symbol : current.width, height: symbolOnly ? current.symbol : current.height }}
        priority
        unoptimized
      />
      {!symbolOnly && (
        <div className="flex flex-col min-w-0 -ml-1">
          <span className="hidden sm:inline-flex w-fit px-1.5 py-0.5 rounded-full border border-brand/20 bg-brand/10 text-[9px] font-bold uppercase tracking-[.16em] text-brand">
            FOSS
          </span>
          {withTagline && <span className="text-xs text-gray-400 font-medium truncate">Your Circle. Your Room. Your Adda.</span>}
        </div>
      )}
    </Link>
  );
}
