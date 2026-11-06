"use client";

import React from "react";
import Image from "next/image";
import { getAvatarById } from "@/lib/avatar-catalog";
import type { AvatarMeta } from "@/lib/avatar-catalog";

interface AvatarPortraitProps {
  /** Avatar ID from the catalog, or a full /avatars/... path for legacy/unknown avatars */
  avatarId: string;
  /** Display size in px (renders as a square) */
  size?: number;
  /** Additional className for the outer wrapper */
  className?: string;
  /** Whether to show a selection ring */
  selected?: boolean;
  /** Whether to show a speaking ring */
  isSpeaking?: boolean;
  /** Whether to show a host crown badge */
  isHost?: boolean;
  /** Override alt text */
  alt?: string;
}

/**
 * AvatarPortrait — renders a single avatar image as a cropped circular portrait.
 *
 * Uses the catalog to resolve the src/alt from an ID, so the caller
 * only needs to pass a stable avatar ID.
 */
export function AvatarPortrait({
  avatarId,
  size = 44,
  className = "",
  selected = false,
  isSpeaking = false,
  isHost = false,
  alt,
}: AvatarPortraitProps) {
  const meta: AvatarMeta = getAvatarById(avatarId);

  const ringClass = isSpeaking
    ? "ring-2 ring-brand ring-offset-1 ring-offset-black"
    : selected
      ? "ring-2 ring-brand/80"
      : "ring-1 ring-white/10";

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden bg-[#111] flex-shrink-0 ${ringClass} ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={meta.src}
        alt={alt ?? meta.alt}
        width={size}
        height={size}
        className="w-full h-full object-cover"
        unoptimized
        priority={false}
      />
      {isHost && (
        <span
          className="absolute -top-1 -right-1 w-4 h-4 bg-brand rounded-full flex items-center justify-center text-black text-[8px] font-black shadow ring-1 ring-black"
          aria-label="Host"
        >
          ★
        </span>
      )}
    </div>
  );
}
