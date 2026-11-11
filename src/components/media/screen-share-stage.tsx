"use client";

import { ScreenChatOverlay } from "@/components/chat/screen-chat-overlay";
import { ScreenChatOverlaySettings } from "@/components/chat/screen-chat-overlay-settings";
import { ChatMessagePacket, OverlayChatConfig, ScreenShareQualityMode } from "@/types";
import { Participant, Track, TrackPublication } from "livekit-client";
import { Maximize2, Minimize2, MessageSquare, Monitor, Send, Sliders, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ScreenShareStageProps {
    participant: Participant;
    isLocal: boolean;
    messages: ChatMessagePacket[];
    currentParticipantId: string;
    onSendMessage: (text: string) => void;
    unreadCount: number;
    onOpenChat: () => void;
    onStopSharing?: () => void;
    qualityMode: ScreenShareQualityMode;
    onChangeQualityMode?: (mode: ScreenShareQualityMode) => void;
}

export function ScreenShareStage({
    participant,
    isLocal,
    messages,
    currentParticipantId,
    onSendMessage,
    unreadCount,
    onOpenChat,
    onStopSharing,
    qualityMode,
    onChangeQualityMode,
}: ScreenShareStageProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    const [isFullscreen, setIsFullscreen] = useState(false);
    const [actualResolution, setActualResolution] = useState<{ width: number; height: number } | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [showOverlaySettings, setShowOverlaySettings] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [chatText, setChatText] = useState("");
    const [showControls, setShowControls] = useState(true);
    const [isPortrait, setIsPortrait] = useState(false);
    const [fullscreenHint, setFullscreenHint] = useState<string | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [overlayConfig, setOverlayConfig] = useState<OverlayChatConfig>({
        enabled: true,
        opacity: 0.85,
        position: "bottom-left",
        fadeOutSeconds: 8,
        hideOwnMessages: false,
    });

    // Attach screen share video track
    useEffect(() => {
        let screenTrackPub: TrackPublication | undefined;
        let screenAudioPub: TrackPublication | undefined;

        const attachTrack = () => {
            screenTrackPub = participant.getTrackPublication(Track.Source.ScreenShare);
            if (screenTrackPub && screenTrackPub.track && videoRef.current) {
                screenTrackPub.track.attach(videoRef.current);
            }

            // Check for screen audio
            screenAudioPub = participant.getTrackPublication(Track.Source.ScreenShareAudio);
            if (screenAudioPub?.track && audioRef.current && !isLocal) {
                screenAudioPub.track.attach(audioRef.current);
                audioRef.current.play().catch(() => {});
            }
        };

        attachTrack();

        const handleTrackSubscribed = (track: any) => {
            if (track.source === Track.Source.ScreenShare && videoRef.current) {
                track.attach(videoRef.current);
                screenTrackPub = participant.getTrackPublication(Track.Source.ScreenShare);
            }
            if (track.source === Track.Source.ScreenShareAudio && audioRef.current && !isLocal) {
                track.attach(audioRef.current);
                audioRef.current.play().catch(() => {});
                screenAudioPub = participant.getTrackPublication(Track.Source.ScreenShareAudio);
            }
        };

        const handleTrackUnsubscribed = (track: any) => {
            if (track.source === Track.Source.ScreenShare) track.detach();
            if (track.source === Track.Source.ScreenShareAudio) track.detach();
        };

        participant.on("trackSubscribed", handleTrackSubscribed);
        participant.on("trackUnsubscribed", handleTrackUnsubscribed);

        // Periodically check video dimensions
        const timer = setInterval(() => {
            if (videoRef.current && videoRef.current.videoWidth > 0) {
                setActualResolution({
                    width: videoRef.current.videoWidth,
                    height: videoRef.current.videoHeight,
                });
            }
        }, 2000);

        return () => {
            participant.off("trackSubscribed", handleTrackSubscribed);
            participant.off("trackUnsubscribed", handleTrackUnsubscribed);
            screenTrackPub?.track?.detach();
            screenAudioPub?.track?.detach();
            clearInterval(timer);
        };
    }, [participant, isLocal]);

    // Handle Fullscreen
    const toggleFullscreen = async () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement && typeof containerRef.current.requestFullscreen !== "function") {
            setFullscreenHint("Fullscreen is unavailable in this browser. Rotate your phone or add AddaRoom to your Home Screen for a room-like view.");
            window.setTimeout(() => setFullscreenHint(null), 6000);
            return;
        }
        try {
            if (!document.fullscreenElement) {
                await containerRef.current.requestFullscreen();
                setIsFullscreen(true);
                if (window.matchMedia("(orientation: portrait)").matches) {
                    try {
                        const orientation = screen.orientation as ScreenOrientation & { lock?: (value: "landscape") => Promise<void> };
                        await orientation?.lock?.("landscape");
                    } catch { /* iOS and many browsers do not support orientation lock */ }
                }
            } else {
                await document.exitFullscreen();
                try { (screen.orientation as ScreenOrientation & { unlock?: () => void })?.unlock?.(); } catch { /* unsupported */ }
                setIsFullscreen(false);
            }
        } catch (err) {
            console.warn("Fullscreen toggle error:", err);
            setFullscreenHint("Your browser could not enter fullscreen. Rotate your phone to view the shared screen wider.");
            window.setTimeout(() => setFullscreenHint(null), 6000);
        }
    };

    useEffect(() => {
        const handleFsChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener("fullscreenchange", handleFsChange);
        return () => document.removeEventListener("fullscreenchange", handleFsChange);
    }, []);

    useEffect(() => {
        const query = window.matchMedia("(orientation: portrait)");
        const update = () => setIsPortrait(query.matches);
        update();
        query.addEventListener?.("change", update);
        return () => query.removeEventListener?.("change", update);
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, showChat]);

    useEffect(() => {
        if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
        if (!isFullscreen) {
            setShowControls(true);
            return;
        }
        if (showControls) hideControlsTimer.current = setTimeout(() => setShowControls(false), 4500);
        return () => {
            if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
        };
    }, [isFullscreen, showControls]);

    useEffect(() => () => {
        if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    }, []);

    const revealControls = () => {
        setShowControls(true);
        if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
        if (isFullscreen) hideControlsTimer.current = setTimeout(() => setShowControls(false), 4500);
    };

    return (
        <div
            ref={containerRef}
            onPointerMove={revealControls}
            onTouchStart={revealControls}
            className={`relative w-full h-full rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-[#252525] shadow-2xl group ${
                isFullscreen ? "rounded-none border-none screen-share-fullscreen" : ""
            }`}
        >
            {/* Video Element */}
            <video ref={videoRef} autoPlay playsInline muted={isLocal} className="w-full h-full object-contain" />
            {isFullscreen && isPortrait && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 rounded-full border border-white/15 bg-black/75 px-4 py-2 text-xs text-white shadow-lg sm:hidden" role="status">
                    Rotate your phone for a wider view
                </div>
            )}
            {fullscreenHint && <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100%-2rem)] rounded-xl border border-white/15 bg-black/90 px-4 py-3 text-center text-xs text-white shadow-xl" role="status">{fullscreenHint}</div>}

            {/* Audio Element for Screen Audio */}
            {!isLocal && <audio ref={audioRef} autoPlay playsInline muted={isMuted} />}

            {/* Live Screen Chat Overlay mounted over the video */}
            <ScreenChatOverlay messages={messages} currentParticipantId={currentParticipantId} config={overlayConfig} />

            {/* Top Floating Controls Bar */}
            <div className={`absolute top-3 left-3 right-3 flex items-center justify-between z-40 pointer-events-none transition-opacity ${isFullscreen && !showControls ? "opacity-0" : "opacity-100"}`}>
                <div className="flex items-center gap-2 pointer-events-auto">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-white/10 backdrop-blur-md text-xs font-semibold text-white shadow-lg">
                        <Monitor className="w-4 h-4 text-brand" />
                        <span>{participant.name || participant.identity}&apos;s Screen</span>
                        {isLocal && (
                            <span className="text-[10px] bg-violet-500/20 text-violet-200 px-1.5 py-0.5 rounded">
                                Sharing
                            </span>
                        )}
                    </div>

                    {/* Actual stream resolution and FPS badge */}
                    {actualResolution && (
                        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/80 border border-white/10 backdrop-blur-md text-[11px] font-mono text-emerald-400 shadow-lg">
                            <span>
                                {actualResolution.width}x{actualResolution.height}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1.5 pointer-events-auto">
                    <button
                        onClick={() => { setShowChat((visible) => !visible); onOpenChat(); }}
                        className="relative p-2 rounded-xl bg-black/80 hover:bg-[#202020] border border-white/10 backdrop-blur-md text-white shadow-lg min-w-11 min-h-11"
                        title={showChat ? "Close chat" : "Open chat"}
                        aria-label={showChat ? "Close chat" : "Open chat"}
                    >
                        <MessageSquare className="w-4 h-4" />
                        {unreadCount > 0 && !showChat && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-brand text-black text-[9px] font-bold flex items-center justify-center">{unreadCount > 9 ? "9+" : unreadCount}</span>}
                    </button>
                    {/* Overlay settings button */}
                    <button
                        onClick={() => setShowOverlaySettings(true)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/10 backdrop-blur-md text-xs font-medium text-slate-200 transition-colors shadow-lg"
                        title="Configure Live Screen Chat Overlay"
                    >
                        <Sliders className="w-3.5 h-3.5 text-violet-300" />
                        <span className="hidden md:inline">Chat Overlay</span>
                    </button>

                    {/* Screen Audio mute toggle if remote */}
                    {!isLocal && (
                        <button
                            onClick={() => setIsMuted(prev => !prev)}
                            className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/10 backdrop-blur-md text-slate-200 transition-colors shadow-lg"
                            title={isMuted ? "Unmute Screen Audio" : "Mute Screen Audio"}
                        >
                            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                    )}

                    {/* Fullscreen button */}
                    <button
                        onClick={toggleFullscreen}
                        className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/10 backdrop-blur-md text-slate-200 transition-colors shadow-lg"
                        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                    >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>

                    {/* Stop sharing button if local */}
                    {isLocal && onStopSharing && (
                        <button
                            onClick={onStopSharing}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg transition-colors"
                        >
                            Stop Sharing
                        </button>
                    )}
                </div>
            </div>

            {showChat && (
                <section className="absolute z-40 right-3 top-16 bottom-3 w-[min(22rem,calc(100%-1.5rem))] max-h-[min(34rem,calc(100%-5rem))] flex flex-col rounded-2xl border border-white/15 bg-black/80 backdrop-blur-xl shadow-2xl" aria-label="Screen share chat">
                    <header className="h-12 flex items-center justify-between px-3 border-b border-white/10 shrink-0">
                        <div className="text-sm font-semibold">Room chat <span className="text-xs text-gray-400">{messages.length}</span></div>
                        <button onClick={() => setShowChat(false)} className="min-w-11 min-h-11 grid place-items-center text-gray-300 hover:text-white" aria-label="Close chat"><X className="w-4 h-4" /></button>
                    </header>
                    <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3" role="log" aria-live="polite">
                        {messages.map((message) => <div key={message.id} className="text-sm"><div className="text-xs text-brand font-semibold">{message.senderName} <span className="text-gray-500 font-normal">{new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div><p className="mt-0.5 text-gray-100 break-words">{message.text}</p></div>)}
                        <div ref={chatEndRef} />
                    </div>
                    <form className="p-2 border-t border-white/10 flex gap-2 shrink-0" onSubmit={(event) => { event.preventDefault(); const clean = chatText.trim(); if (clean) onSendMessage(clean); setChatText(""); }}>
                        <input value={chatText} onChange={(event) => setChatText(event.target.value)} maxLength={2000} placeholder="Message everyone" className="min-w-0 flex-1 h-11 rounded-xl bg-white/10 px-3 text-sm text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-brand" aria-label="Chat message" />
                        <button type="submit" disabled={!chatText.trim()} className="w-11 h-11 rounded-xl bg-brand text-black grid place-items-center disabled:opacity-40" aria-label="Send message"><Send className="w-4 h-4" /></button>
                    </form>
                </section>
            )}

            {/* Screen Chat Overlay Settings Modal */}
            <ScreenChatOverlaySettings
                isOpen={showOverlaySettings}
                onClose={() => setShowOverlaySettings(false)}
                config={overlayConfig}
                onChange={updates => setOverlayConfig(prev => ({ ...prev, ...updates }))}
            />
        </div>
    );
}
