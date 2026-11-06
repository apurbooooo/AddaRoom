"use client";

import React, { useState, useRef } from "react";
import { X, Youtube, Link, Film, Plus, AlertCircle } from "lucide-react";
import { MediaQueueItem } from "@/types";

interface AddMediaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: Omit<MediaQueueItem, "id">) => void;
  localParticipantId: string;
  localDisplayName: string;
}

type Tab = "youtube" | "url" | "file";

function extractYouTubeId(input: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([A-Za-z0-9_-]{11})/,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = input.match(p);
    if (m) return m[1];
  }
  // Check if input itself is a bare video ID (11 chars)
  if (/^[A-Za-z0-9_-]{11}$/.test(input.trim())) return input.trim();
  return null;
}

export function AddMediaDialog({
  isOpen,
  onClose,
  onAddItem,
  localParticipantId,
  localDisplayName,
}: AddMediaDialogProps) {
  const [activeTab, setActiveTab] = useState<Tab>("youtube");
  const [youtubeInput, setYoutubeInput] = useState("");
  const [youtubeTitle, setYoutubeTitle] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [urlTitle, setUrlTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAdd = () => {
    setError(null);

    if (activeTab === "youtube") {
      if (!youtubeInput.trim()) {
        setError("Please enter a YouTube URL or video ID.");
        return;
      }
      const videoId = extractYouTubeId(youtubeInput.trim());
      if (!videoId) {
        setError("Could not extract a valid YouTube video ID from the input.");
        return;
      }
      onAddItem({
        type: "youtube",
        title: youtubeTitle.trim() || "YouTube Video",
        src: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`,
        addedBy: localParticipantId,
        addedByName: localDisplayName,
      });
      setYoutubeInput("");
      setYoutubeTitle("");
      onClose();
      return;
    }

    if (activeTab === "url") {
      if (!urlInput.trim()) {
        setError("Please enter a video URL.");
        return;
      }
      try {
        new URL(urlInput.trim());
      } catch {
        setError("Please enter a valid URL.");
        return;
      }
      onAddItem({
        type: "url",
        title: urlTitle.trim() || urlInput.trim().split("/").pop() || "Video",
        src: urlInput.trim(),
        addedBy: localParticipantId,
        addedByName: localDisplayName,
      });
      setUrlInput("");
      setUrlTitle("");
      onClose();
      return;
    }

    if (activeTab === "file") {
      const file = fileRef.current?.files?.[0];
      if (!file) {
        setError("Please select a video file.");
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      onAddItem({
        type: "file",
        title: file.name,
        src: objectUrl,
        addedBy: localParticipantId,
        addedByName: localDisplayName,
      });
      onClose();
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "youtube", label: "YouTube", icon: <Youtube className="w-3.5 h-3.5" /> },
    { id: "url", label: "Video URL", icon: <Link className="w-3.5 h-3.5" /> },
    { id: "file", label: "Local File", icon: <Film className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#111111] border border-[#2a2a2a] rounded-2xl shadow-2xl text-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
          <h3 className="text-base font-bold">Add to Queue</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a1a1a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#2a2a2a]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-brand text-brand"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === "youtube" && (
            <>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">YouTube URL or Video ID</label>
                <input
                  type="text"
                  value={youtubeInput}
                  onChange={(e) => setYoutubeInput(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... or video ID"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-[#2a2a2a] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Title (optional)</label>
                <input
                  type="text"
                  value={youtubeTitle}
                  onChange={(e) => setYoutubeTitle(e.target.value)}
                  placeholder="YouTube Video"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-[#2a2a2a] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand transition-colors"
                />
              </div>
            </>
          )}

          {activeTab === "url" && (
            <>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Video URL</label>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/video.mp4"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-[#2a2a2a] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Title (optional)</label>
                <input
                  type="text"
                  value={urlTitle}
                  onChange={(e) => setUrlTitle(e.target.value)}
                  placeholder="My Video"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-[#2a2a2a] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand transition-colors"
                />
              </div>
            </>
          )}

          {activeTab === "file" && (
            <div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs mb-3">
                File uploads create a temporary local URL visible only on your device. For shared viewing, use YouTube or a hosted URL.
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="video/*"
                className="w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand/20 file:text-brand hover:file:bg-brand/30 file:cursor-pointer cursor-pointer"
              />
            </div>
          )}

          <button
            onClick={handleAdd}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand hover:bg-[#ceff44] text-black font-bold text-sm shadow-lg shadow-brand/25 transition-all min-h-[44px]"
          >
            <Plus className="w-4 h-4" /> Add to Queue
          </button>
        </div>
      </div>
    </div>
  );
}
