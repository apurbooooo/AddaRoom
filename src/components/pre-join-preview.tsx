"use client";

import React, { useState, useRef, useEffect } from "react";
import { Camera, CameraOff, Mic, MicOff, ChevronDown, AlertCircle, Loader2 } from "lucide-react";
import { AvatarPortrait } from "@/components/avatar/avatar-portrait";
import { DEFAULT_AVATAR_ID, getSavedAvatarId } from "@/lib/avatar-catalog";

interface PreJoinPreviewProps {
  displayName: string;
  roomTitle: string;
  onJoin: (cameraEnabled: boolean, micEnabled: boolean) => void;
  onCancel?: () => void;
}

type MediaRequestResult = { value: MediaStream | null; error?: unknown };

export function PreJoinPreview({ displayName, roomTitle, onJoin, onCancel }: PreJoinPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const streamGenerationRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [micLevel, setMicLevel] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [selectedMic, setSelectedMic] = useState<string>("");

  const stopStream = () => {
    streamGenerationRef.current += 1;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const startStream = async (cam: boolean, mic: boolean, cameraId?: string, micId?: string) => {
    stopStream();
    const generation = ++streamGenerationRef.current;
    try {
      const [videoResult, audioResult]: [MediaRequestResult, MediaRequestResult] = await Promise.all([
        cam ? navigator.mediaDevices.getUserMedia({ video: cameraId ? { deviceId: { exact: cameraId } } : { facingMode: "user" }, audio: false }).then((value): MediaRequestResult => ({ value })).catch((error): MediaRequestResult => ({ value: null, error })) : Promise.resolve({ value: null }),
        mic ? navigator.mediaDevices.getUserMedia({ video: false, audio: micId ? { deviceId: { exact: micId } } : { noiseSuppression: true, echoCancellation: true, autoGainControl: true } }).then((value): MediaRequestResult => ({ value })).catch((error): MediaRequestResult => ({ value: null, error })) : Promise.resolve({ value: null }),
      ]);
      if (generation !== streamGenerationRef.current) {
        videoResult.value?.getTracks().forEach((track) => track.stop());
        audioResult.value?.getTracks().forEach((track) => track.stop());
        return;
      }
      const tracks = [
        ...(videoResult.value?.getVideoTracks() ?? []),
        ...(audioResult.value?.getAudioTracks() ?? []),
      ];
      const stream = new MediaStream(tracks);
      streamRef.current = stream;

      if (videoRef.current && cam) {
        videoRef.current.srcObject = stream;
      } else if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      const cameraReady = stream.getVideoTracks().length > 0;
      const micReady = stream.getAudioTracks().length > 0;
      setCameraEnabled(cameraReady);
      setMicEnabled(micReady);

      // Mic level meter
      const audioTracks = stream.getAudioTracks();
      if (mic && audioTracks.length > 0) {
        const ctx = new AudioContext();
        audioContextRef.current = ctx;
        await ctx.resume().catch(() => {});
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          setMicLevel(Math.min(100, (avg / 128) * 100));
          animFrameRef.current = requestAnimationFrame(tick);
        };
        tick();
      }

      // Enumerate devices after permission granted
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameras(devices.filter((d) => d.kind === "videoinput"));
      setMics(devices.filter((d) => d.kind === "audioinput"));
      const errors = [videoResult.error, audioResult.error].filter(Boolean);
      if (!errors.length) setPermissionError(null);
      else if (errors.some((err: any) => err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError")) {
        setPermissionError("Camera or microphone permission was denied. Enable access in browser settings, or continue with the available device.");
      } else if (errors.some((err: any) => err?.name === "NotFoundError" || err?.name === "OverconstrainedError")) {
        setPermissionError("A selected camera or microphone is unavailable. Choose another device or continue with the available device.");
      } else {
        setPermissionError("A media device could not start. You can still continue and retry from the room controls.");
      }
    } catch (err: any) {
      console.warn("Pre-join media preview failed:", err);
      setPermissionError("Could not access camera or microphone. You can still join without media.");
      setCameraEnabled(false);
      setMicEnabled(false);
    } finally {
      if (generation === streamGenerationRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    startStream(cameraEnabled, micEnabled, selectedCamera, selectedMic);
    return stopStream;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleCamera = () => {
    const next = !cameraEnabled;
    setCameraEnabled(next);
    startStream(next, micEnabled, selectedCamera, selectedMic);
  };

  const handleToggleMic = () => {
    const next = !micEnabled;
    setMicEnabled(next);
    startStream(cameraEnabled, next, selectedCamera, selectedMic);
  };

  const handleCameraChange = (deviceId: string) => {
    setSelectedCamera(deviceId);
    startStream(cameraEnabled, micEnabled, deviceId, selectedMic);
  };

  const handleMicChange = (deviceId: string) => {
    setSelectedMic(deviceId);
    startStream(cameraEnabled, micEnabled, selectedCamera, deviceId);
  };

  const handleJoin = () => {
    stopStream();
    onJoin(cameraEnabled, micEnabled);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#111111] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-[#2a2a2a]">
          <p className="text-xs text-gray-400">Joining</p>
          <h2 className="text-lg font-bold text-white">{roomTitle}</h2>
        </div>

        {/* Camera Preview */}
        <div className="relative bg-black aspect-video flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-xs">Accessing camera…</span>
            </div>
          )}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover ${!cameraEnabled || loading ? "hidden" : ""}`}
          />
          {!cameraEnabled && !loading && (
            <div className="flex flex-col items-center gap-2.5">
              <AvatarPortrait avatarId={getSavedAvatarId() || DEFAULT_AVATAR_ID} size={64} className="border border-white/10 shadow-lg" />
              <span className="text-xs text-gray-400">Camera off</span>
            </div>
          )}
          {/* Name tag overlay */}
          <div className="absolute bottom-3 left-3 px-2.5 py-1.5 rounded-lg bg-black/80 backdrop-blur-sm text-white text-sm font-semibold flex items-center gap-2 border border-white/10">
            <AvatarPortrait avatarId={getSavedAvatarId() || DEFAULT_AVATAR_ID} size={20} />
            <span>{displayName}</span>
          </div>
        </div>

        {/* Permission error */}
        {permissionError && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{permissionError}</span>
          </div>
        )}

        {/* Controls */}
        <div className="p-4 space-y-4">
          {/* Media toggles */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleCamera}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors min-h-[44px] ${
                cameraEnabled
                  ? "bg-brand/20 border border-brand text-brand"
                  : "bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400"
              }`}
            >
              {cameraEnabled ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
              {cameraEnabled ? "Camera On" : "Camera Off"}
            </button>
            <button
              onClick={handleToggleMic}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors min-h-[44px] ${
                micEnabled
                  ? "bg-brand/20 border border-brand text-brand"
                  : "bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400"
              }`}
            >
              {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              {micEnabled ? "Mic On" : "Mic Off"}
            </button>
          </div>

          {/* Mic level meter */}
          {micEnabled && (
            <div className="flex items-center gap-2">
              <Mic className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand rounded-full transition-all duration-75"
                  style={{ width: `${micLevel}%` }}
                />
              </div>
            </div>
          )}

          {/* Device selectors */}
          {cameras.length > 1 && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Camera</label>
              <div className="relative">
                <select
                  value={selectedCamera}
                  onChange={(e) => handleCameraChange(e.target.value)}
                  className="w-full appearance-none px-3 py-2 rounded-xl bg-black border border-[#2a2a2a] text-xs text-white focus:outline-none focus:border-brand pr-8"
                >
                  {cameras.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${d.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}
          {mics.length > 1 && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Microphone</label>
              <div className="relative">
                <select
                  value={selectedMic}
                  onChange={(e) => handleMicChange(e.target.value)}
                  className="w-full appearance-none px-3 py-2 rounded-xl bg-black border border-[#2a2a2a] text-xs text-white focus:outline-none focus:border-brand pr-8"
                >
                  {mics.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Mic ${d.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-1">
            {onCancel && (
              <button
                onClick={() => { stopStream(); onCancel(); }}
                className="px-4 py-3 rounded-xl bg-[#1a1a1a] text-gray-300 text-sm hover:bg-[#2a2a2a] transition-colors min-h-[44px]"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleJoin}
              className="flex-1 py-3 rounded-xl bg-brand hover:bg-[#ceff44] text-black font-bold text-sm shadow-lg shadow-brand/25 transition-all min-h-[44px]"
            >
              Join Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
