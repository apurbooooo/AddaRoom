"use client";

import React from "react";
import { OverlayChatConfig } from "@/types";
import { Sliders, X } from "lucide-react";

interface ScreenChatOverlaySettingsProps {
  isOpen: boolean;
  onClose: () => void;
  config: OverlayChatConfig;
  onChange: (updates: Partial<OverlayChatConfig>) => void;
}

export function ScreenChatOverlaySettings({
  isOpen,
  onClose,
  config,
  onChange,
}: ScreenChatOverlaySettingsProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Live Screen Chat Overlay</h3>
            <p className="text-xs text-slate-400">Customize how messages float over video</p>
          </div>
        </div>

        {/* Enable / Disable */}
        <div className="flex items-center justify-between py-2 border-b border-slate-800 mb-3">
          <span className="text-sm font-medium text-slate-200">Enable Overlay</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => onChange({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
          </label>
        </div>

        {/* Position */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Overlay Position
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(
              [
                ["top-left", "Top Left"],
                ["top-right", "Top Right"],
                ["bottom-left", "Bottom Left"],
                ["bottom-right", "Bottom Right"],
              ] as const
            ).map(([pos, label]) => (
              <button
                key={pos}
                type="button"
                onClick={() => onChange({ position: pos })}
                className={`py-2 px-3 rounded-xl border text-center font-medium transition-colors ${
                  config.position === pos
                    ? "bg-violet-600/30 border-violet-500 text-violet-200"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Opacity slider */}
        <div className="mb-4">
          <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1.5">
            <span>Bubble Opacity</span>
            <span className="text-violet-400">{Math.round(config.opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.3"
            max="1.0"
            step="0.05"
            value={config.opacity}
            onChange={(e) => onChange({ opacity: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
          />
        </div>

        {/* Fade-out duration */}
        <div className="mb-4">
          <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1.5">
            <span>Fade-out Duration</span>
            <span className="text-violet-400">{config.fadeOutSeconds}s</span>
          </div>
          <input
            type="range"
            min="3"
            max="15"
            step="1"
            value={config.fadeOutSeconds}
            onChange={(e) => onChange({ fadeOutSeconds: parseInt(e.target.value, 10) })}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
          />
        </div>

        {/* Hide own messages */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <span className="text-xs font-medium text-slate-300">Hide my own messages</span>
          <input
            type="checkbox"
            checked={config.hideOwnMessages}
            onChange={(e) => onChange({ hideOwnMessages: e.target.checked })}
            className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-violet-600 focus:ring-violet-500 cursor-pointer"
          />
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}

