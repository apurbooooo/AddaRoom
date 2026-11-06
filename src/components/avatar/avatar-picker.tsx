"use client";

import React from "react";
import Image from "next/image";
import { AVATAR_CATALOG, AvatarMeta, saveAvatarId } from "@/lib/avatar-catalog";
import { Check } from "lucide-react";

interface AvatarPickerProps {
  selectedId: string;
  onSelect: (id: string) => void;
  className?: string;
}

export function AvatarPicker({ selectedId, onSelect, className = "" }: AvatarPickerProps) {
  const handleSelect = (avatar: AvatarMeta) => {
    onSelect(avatar.id);
    saveAvatarId(avatar.id);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-gray-300">
          Choose your avatar
        </label>
        <span className="text-[11px] text-gray-500 font-medium">
          {AVATAR_CATALOG.find((a) => a.id === selectedId)?.label ?? "Custom Avatar"}
        </span>
      </div>

      <div
        role="radiogroup"
        aria-label="Choose your avatar"
        className="grid grid-cols-4 sm:grid-cols-6 gap-2 p-2 rounded-xl bg-black/60 border border-[#222222] max-h-48 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-800"
      >
        {AVATAR_CATALOG.map((avatar) => {
          const isSelected = selectedId === avatar.id;
          return (
            <button
              key={avatar.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={avatar.label}
              onClick={() => handleSelect(avatar)}
              className={`group relative flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                isSelected
                  ? "bg-brand/10 border-2 border-brand shadow-md shadow-brand/20 scale-105"
                  : "bg-[#141414] border border-white/5 hover:border-white/20 hover:bg-[#1a1a1a]"
              }`}
            >
              <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-black/40 flex-shrink-0">
                <Image
                  src={avatar.src}
                  alt={avatar.alt}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                  unoptimized
                />
                {isSelected && (
                  <div className="absolute inset-0 bg-brand/20 backdrop-blur-[0.5px] flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-brand flex items-center justify-center text-black shadow">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  </div>
                )}
              </div>
              <span
                className={`text-[10px] font-medium truncate max-w-[50px] leading-tight ${
                  isSelected ? "text-brand font-semibold" : "text-gray-400 group-hover:text-gray-200"
                }`}
              >
                {avatar.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
