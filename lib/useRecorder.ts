"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Backend limit (BACKEND_README.md §11.1). */
export const MAX_RECORDING_SEC = 120;

// Voice detection: a sample counts as voice above this RMS level (0..1), and a
// recording needs at least MIN_VOICE_MS of it to be worth sending.
const VOICE_RMS = 0.012;
const MIN_VOICE_MS = 200;
const LEVEL_SAMPLE_MS = 50;

const PREFERRED_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4", // Safari / iOS
  "audio/ogg;codecs=opus",
];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return undefined;
  return PREFERRED_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
}

export type RecorderState = "idle" | "recording" | "paused";

export interface Recording {
  blob: Blob;
  durationSec: number;
  /** false when the microphone picked up no voice at all (only silence or faint noise). */
  hasSpeech: boolean;
}

/**
 * Wraps MediaRecorder: start → (pause/resume) → stop() resolves the audio.
 * Releases the microphone as soon as recording ends.
 */
export function useRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const pausedMsRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);
  const stopResolverRef = useRef<((r: Recording | null) => void) | null>(null);
  const levelRef = useRef<{ ctx: AudioContext; timer: number; voiceMs: number } | null>(null);

  const supported =
    typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";

  const currentDuration = () => {
    const pausedExtra = pausedAtRef.current ? Date.now() - pausedAtRef.current : 0;
    return Math.max(0, (Date.now() - startedAtRef.current - pausedMsRef.current - pausedExtra) / 1000);
  };

  /** Measure the mic level while recording so silent recordings aren't sent. */
  const startLevelMeter = (stream: MediaStream) => {
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Float32Array(analyser.fftSize);
      const meter = { ctx, timer: 0, voiceMs: 0 };
      meter.timer = window.setInterval(() => {
        if (recorderRef.current?.state !== "recording") return;
        analyser.getFloatTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
        if (Math.sqrt(sum / data.length) > VOICE_RMS) meter.voiceMs += LEVEL_SAMPLE_MS;
      }, LEVEL_SAMPLE_MS);
      levelRef.current = meter;
    } catch {
      levelRef.current = null; // no meter: let the server decide
    }
  };

  /** Stops the meter; true if voice was heard (or the level couldn't be measured). */
  const stopLevelMeter = (): boolean => {
    const meter = levelRef.current;
    levelRef.current = null;
    if (!meter) return true;
    window.clearInterval(meter.timer);
    void meter.ctx.close().catch(() => {});
    return meter.voiceMs >= MIN_VOICE_MS;
  };

  const releaseStream = () => {
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
  };

  const stop = useCallback((): Promise<Recording | null> => {
    const rec = recorderRef.current;
    if (!rec || rec.state === "inactive") return Promise.resolve(null);
    return new Promise((resolve) => {
      stopResolverRef.current = resolve;
      rec.stop();
    });
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    setError(null);
    if (!supported) {
      setError("Voice recording isn't supported in this browser. Try Chrome, Safari or Edge.");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const mimeType = pickMimeType();
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      pausedMsRef.current = 0;
      pausedAtRef.current = null;

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const durationSec = currentDuration();
        const hasSpeech = stopLevelMeter();
        releaseStream();
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || mimeType || "audio/webm" });
        recorderRef.current = null;
        setState("idle");
        setElapsed(0);
        const resolve = stopResolverRef.current;
        stopResolverRef.current = null;
        resolve?.(blob.size > 0 ? { blob, durationSec, hasSpeech } : null);
      };

      recorderRef.current = rec;
      startLevelMeter(stream);
      startedAtRef.current = Date.now();
      rec.start(250);
      setState("recording");
      return true;
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      setError(
        name === "NotAllowedError" || name === "SecurityError"
          ? "Microphone access was blocked. Allow the microphone in your browser settings and try again."
          : name === "NotFoundError"
            ? "No microphone was found on this device."
            : "Couldn't start the microphone. Please try again."
      );
      return false;
    }
  }, [supported]);

  const togglePause = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec) return;
    if (rec.state === "recording") {
      rec.pause();
      pausedAtRef.current = Date.now();
      setState("paused");
    } else if (rec.state === "paused") {
      rec.resume();
      if (pausedAtRef.current) pausedMsRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
      setState("recording");
    }
  }, []);

  /** Throw away the current recording. */
  const cancel = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec) return;
    stopResolverRef.current = null;
    rec.onstop = () => {
      stopLevelMeter();
      releaseStream();
      recorderRef.current = null;
      setState("idle");
      setElapsed(0);
    };
    rec.stop();
  }, []);

  // Tick the timer and enforce the length limit.
  useEffect(() => {
    if (state === "idle") return;
    const id = window.setInterval(() => {
      const d = currentDuration();
      setElapsed(d);
      if (d >= MAX_RECORDING_SEC) void stop();
    }, 250);
    return () => window.clearInterval(id);
  }, [state, stop]);

  // Release the mic if the component unmounts mid-recording.
  useEffect(
    () => () => {
      const rec = recorderRef.current;
      stopLevelMeter();
      if (rec && rec.state !== "inactive") {
        rec.onstop = null;
        rec.stop();
        rec.stream.getTracks().forEach((t) => t.stop());
      }
    },
    []
  );

  return { state, elapsed, error, setError, supported, start, stop, togglePause, cancel };
}
