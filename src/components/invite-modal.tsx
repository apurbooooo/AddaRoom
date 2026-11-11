"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Copy, Check, Share2, X, QrCode } from "lucide-react";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  roomTitle: string;
}

export function InviteModal({ isOpen, onClose, roomCode, roomTitle }: InviteModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const inviteUrl = typeof window !== "undefined"
    ? `${window.location.origin}/join/${roomCode}`
    : `https://addaroom.local/join/${roomCode}`;

  useEffect(() => {
    if (isOpen && inviteUrl) {
      QRCode.toDataURL(inviteUrl, {
        width: 240,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      })
        .then(setQrDataUrl)
        .catch(console.error);
    }
  }, [isOpen, inviteUrl]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {}
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join my Adda: ${roomTitle}`,
          text: `Jump into "${roomTitle}" on AddaRoom! No registration needed.`,
          url: inviteUrl,
        });
      } catch {}
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="invite-modal relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Invite Friends</h3>
            <p className="text-xs text-slate-400">Share this room with your circle</p>
          </div>
        </div>

        <div className="my-5 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <p className="text-xs font-medium text-slate-400 mb-1">Room Title</p>
          <p className="text-sm font-semibold text-white">{roomTitle}</p>
        </div>

        {/* QR Code */}
        {qrDataUrl && (
          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 mb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt="QR Code"
              className="w-40 h-40 rounded-lg shadow-inner bg-white p-1"
            />
            <p className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5" /> Scan with mobile phone to join instantly
            </p>
          </div>
        )}

        {/* Room Code */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Room Code
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-sm tracking-widest text-indigo-300 font-bold">
              {roomCode}
            </div>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copiedCode ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* Invite URL */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Direct Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none select-all"
            />
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              {copiedLink ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
              {copiedLink ? "Copied Link" : "Copy Link"}
            </button>
          </div>
        </div>

        {/* Share Button (if supported) */}
        {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
          <button
            onClick={handleNativeShare}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition-colors border border-slate-700"
          >
            <Share2 className="w-4 h-4" /> Share via Phone App
          </button>
        )}
      </div>
    </div>
  );
}

