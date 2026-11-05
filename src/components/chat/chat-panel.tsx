"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChatMessagePacket } from "@/types";
import { Send, X, CornerDownRight, Smile, MessageSquare } from "lucide-react";

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessagePacket[];
  currentParticipantId: string;
  onSendMessage: (text: string, replyTo?: ChatMessagePacket["replyTo"]) => void;
  onSendTyping: (isTyping: boolean) => void;
  typingUsers: string[];
}

export function ChatPanel({
  isOpen,
  onClose,
  messages,
  currentParticipantId,
  onSendMessage,
  onSendTyping,
  typingUsers,
}: ChatPanelProps) {
  const [inputText, setInputText] = useState("");
  const [replyingTo, setReplyingTo] = useState<ChatMessagePacket | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Handle typing debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    onSendTyping(e.target.value.length > 0);
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;

    const replyData = replyingTo
      ? {
          id: replyingTo.id,
          senderName: replyingTo.senderName,
          text: replyingTo.text.slice(0, 50),
        }
      : undefined;

    onSendMessage(text, replyData);
    setInputText("");
    setReplyingTo(null);
    onSendTyping(false);
    setShowEmojiPicker(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const addEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  if (!isOpen) return null;

  const quickEmojis = ["❤️", "😂", "🔥", "🙌", "👀", "✨", "💯", "🎉"];

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          <h2 className="font-bold text-white text-sm">Room Chat</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
            {messages.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/40 flex items-center justify-center mb-3 text-indigo-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-400">No messages yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Say hello! Messages stay private and ephemeral to this session.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentParticipantId;
            const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                {/* Reply reference preview */}
                {msg.replyTo && (
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-0.5 px-2">
                    <CornerDownRight className="w-3 h-3 text-slate-500" />
                    <span>replying to {msg.replyTo.senderName}:</span>
                    <span className="italic truncate max-w-[140px]">
                      &quot;{msg.replyTo.text}&quot;
                    </span>
                  </div>
                )}

                <div className={`flex gap-2 max-w-[85%] ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs mt-0.5">
                    {msg.avatar || "👤"}
                  </div>
                  <div>
                    <div
                      className={`flex items-baseline gap-2 mb-1 ${
                        isMe ? "justify-end" : "justify-start"
                      }`}
                    >
                      <span className="text-xs font-semibold text-slate-300">
                        {isMe ? "You" : msg.senderName}
                      </span>
                      <span className="text-[10px] text-slate-500">{timeStr}</span>
                    </div>

                    <div
                      className={`group relative px-3 py-2 rounded-2xl text-xs break-words shadow-sm ${
                        isMe
                          ? "bg-indigo-600 text-white rounded-tr-none"
                          : "bg-slate-800 border border-slate-700 text-slate-100 rounded-tl-none"
                      }`}
                    >
                      <span>{msg.text}</span>

                      {/* Reply button on hover */}
                      <button
                        onClick={() => setReplyingTo(msg)}
                        className="opacity-0 group-hover:opacity-100 absolute -bottom-5 right-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition-opacity"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1 text-[11px] text-indigo-400 italic flex items-center gap-1.5 animate-pulse bg-slate-950/40 border-t border-slate-800/40">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
          <span>
            {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
          </span>
        </div>
      )}

      {/* Replying banner */}
      {replyingTo && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-indigo-950/60 border-t border-indigo-900/60 text-xs text-indigo-200">
          <div className="flex items-center gap-1.5 truncate">
            <CornerDownRight className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
            <span className="font-semibold text-indigo-300">{replyingTo.senderName}:</span>
            <span className="truncate italic text-indigo-200">{replyingTo.text}</span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 hover:text-white rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Quick emoji drawer */}
      {showEmojiPicker && (
        <div className="p-2 border-t border-slate-800 bg-slate-950 flex flex-wrap gap-2 justify-center">
          {quickEmojis.map((e) => (
            <button
              key={e}
              onClick={() => addEmoji(e)}
              className="text-lg p-1.5 rounded-lg hover:bg-slate-800 transition-transform active:scale-125"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Message Composer */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/90">
        <div className="flex items-end gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1.5 focus-within:border-indigo-500 transition-colors">
          <button
            type="button"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <Smile className="w-4 h-4" />
          </button>

          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Send message to room..."
            className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none resize-none max-h-28 py-1.5"
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:hover:bg-indigo-600 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
