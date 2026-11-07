"use client";

import { X } from "lucide-react";
import { AvatarPortrait } from "@/components/avatar/avatar-portrait";

export type RoomNotification = {
  id: string;
  kind: "chat" | "join" | "leave";
  senderName: string;
  avatar: string;
  text: string;
  expiresAt: number;
};

interface RoomNotificationToastProps {
  notifications: RoomNotification[];
  onDismiss: (id: string) => void;
  onOpenChat: (id: string) => void;
}

export function RoomNotificationToast({ notifications, onDismiss, onOpenChat }: RoomNotificationToastProps) {
  if (!notifications.length) return null;

  return (
    <div
      className="pointer-events-none fixed right-3 z-40 flex w-[min(25rem,calc(100vw-1.5rem))] flex-col gap-2 sm:right-5"
      style={{ top: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}
      role="region"
      aria-label="Room notifications"
      aria-live="polite"
    >
      {notifications.map((notification) => (
        <article
          key={notification.id}
          className="pointer-events-auto animate-in slide-in-from-right-5 fade-in rounded-2xl border border-brand/25 border-l-2 border-l-brand/80 bg-[#0b0d0b]/95 p-3 shadow-2xl shadow-black/40 backdrop-blur-xl duration-300"
        >
          <div className="flex items-start gap-3">
            <AvatarPortrait avatarId={notification.avatar || notification.senderName} size={40} className="shrink-0 rounded-xl ring-1 ring-brand/20" />
            <button
              type="button"
              onClick={() => onOpenChat(notification.id)}
              className="min-w-0 flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0d0b]"
              aria-label={notification.kind === "chat" ? `Open chat message from ${notification.senderName}` : notification.text}
            >
              <p className="break-words text-sm leading-5 text-white">
                <strong className="font-bold text-brand">{notification.senderName}:</strong>
                <span className="ml-1.5 font-normal text-[#f4f7ef]">{notification.text}</span>
              </p>
            </button>
            <button
              type="button"
              onClick={() => onDismiss(notification.id)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label={`Dismiss notification from ${notification.senderName}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
