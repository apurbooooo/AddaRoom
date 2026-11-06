"use client";

import { ScreenChatOverlay } from "@/components/chat/screen-chat-overlay";
import { ScreenChatOverlaySettings } from "@/components/chat/screen-chat-overlay-settings";
import { ChatMessagePacket, OverlayChatConfig, ScreenShareQualityMode } from "@/types";
import { Participant, Track, TrackPublication } from "livekit-client";
import { Maximize2, Minimize2, Monitor, Sliders, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ScreenShareStageProps {
    participant: Participant;
    isLocal: boolean;
    messages: ChatMessagePacket[];
    currentParticipantId: string;
    onStopSharing?: () => void;
    qualityMode: ScreenShareQualityMode;
    onChangeQualityMode?: (mode: ScreenShareQualityMode) => void;
}

export function ScreenShareStage({
    participant,
    isLocal,
    messages,
    currentParticipantId,
    onStopSharing,
    qualityMode,
    onChangeQualityMode,
}: ScreenShareStageProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    const [isFullscreen, setIsFullscreen] = useState(false);
    const [actualResolution, setActualResolution] = useState<{ width: number; height: number } | null>(null);
    const [actualFps, setActualFps] = useState<number>(30);
    const [isMuted, setIsMuted] = useState(false);
    const [showOverlaySettings, setShowOverlaySettings] = useState(false);

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

        const attachTrack = () => {
            screenTrackPub = participant.getTrackPublication(Track.Source.ScreenShare);
            if (screenTrackPub && screenTrackPub.track && videoRef.current) {
                screenTrackPub.track.attach(videoRef.current);
            }

            // Check for screen audio
            const audioPub = participant.getTrackPublication(Track.Source.ScreenShareAudio);
            if (audioPub && audioPub.track && audioRef.current && !isLocal) {
                audioPub.track.attach(audioRef.current);
            }
        };

        attachTrack();

        const handleTrackSubscribed = (track: any) => {
            if (track.source === Track.Source.ScreenShare && videoRef.current) {
                track.attach(videoRef.current);
            }
            if (track.source === Track.Source.ScreenShareAudio && audioRef.current && !isLocal) {
                track.attach(audioRef.current);
            }
        };

        participant.on("trackSubscribed", handleTrackSubscribed);

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
            clearInterval(timer);
        };
    }, [participant, isLocal]);

    // Handle Fullscreen
    const toggleFullscreen = async () => {
        if (!containerRef.current) return;
        try {
            if (!document.fullscreenElement) {
                await containerRef.current.requestFullscreen();
                setIsFullscreen(true);
            } else {
                await document.exitFullscreen();
                setIsFullscreen(false);
            }
        } catch (err) {
            console.warn("Fullscreen toggle error:", err);
        }
    };

    useEffect(() => {
        const handleFsChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener("fullscreenchange", handleFsChange);
        return () => document.removeEventListener("fullscreenchange", handleFsChange);
    }, []);

    return (
        <div
            ref={containerRef}
            className={`relative w-full h-full rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-slate-800 shadow-2xl group ${
                isFullscreen ? "rounded-none border-none" : ""
            }`}
        >
            {/* Video Element */}
            <video ref={videoRef} autoPlay playsInline muted={isLocal} className="w-full h-full object-contain" />

            {/* Audio Element for Screen Audio */}
            {!isLocal && <audio ref={audioRef} autoPlay playsInline muted={isMuted} />}

            {/* Live Screen Chat Overlay mounted over the video */}
            <ScreenChatOverlay messages={messages} currentParticipantId={currentParticipantId} config={overlayConfig} />

            {/* Top Floating Controls Bar */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-40 pointer-events-none">
                <div className="flex items-center gap-2 pointer-events-auto">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-white/10 backdrop-blur-md text-xs font-semibold text-white shadow-lg">
                        <Monitor className="w-4 h-4 text-indigo-400" />
                        <span>{participant.name || participant.identity}&apos;s Screen</span>
                        {isLocal && (
                            <span className="text-[10px] bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded">
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
                            <span className="text-slate-400">@</span>
                            <span>{actualFps}fps</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1.5 pointer-events-auto">
                    {/* Overlay settings button */}
                    <button
                        onClick={() => setShowOverlaySettings(true)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/10 backdrop-blur-md text-xs font-medium text-slate-200 transition-colors shadow-lg"
                        title="Configure Live Screen Chat Overlay"
                    >
                        <Sliders className="w-3.5 h-3.5 text-indigo-400" />
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
