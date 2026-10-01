"use client";

/**
 * Voice Assistant — POST /voice/ask (spoken questions), POST /ai/chat (quick
 * commands), session history from /voice/sessions (BACKEND_README.md §11).
 * Answers are read aloud with the browser's speech synthesis when enabled.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import VoiceHero from "./components/VoiceHero";
import VoiceTranscript, { TranscriptEntry } from "./components/VoiceTranscript";
import QuickCommandGrid from "./components/QuickCommandGrid";
import VoiceSessionHistory, { VoiceSession } from "./components/VoiceSessionHistory";
import { VoiceState } from "./components/VoiceStateIndicator";
import { ai, ApiError, voice } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import { date, dayGroup, duration, time } from "@/lib/format";
import { MAX_RECORDING_SEC, useRecorder } from "@/lib/useRecorder";
import { toPlainText } from "@/components/RichText";
import { ErrorState } from "@/components/ui";

const SPEAKER_KEY = "tenda_voice_speaker";

let seq = 0;
const entryId = (p: string) => `${p}-${Date.now()}-${++seq}`;

function readSpeakerPref(): boolean {
  try {
    return window.localStorage.getItem(SPEAKER_KEY) !== "off";
  } catch {
    return true;
  }
}

export default function VoiceAssistantPage() {
  const rec = useRecorder();
  const [busy, setBusy] = useState<"processing" | "speaking" | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speakerOn, setSpeakerOn] = useState(true);
  const sessions = useResource("voice:sessions", () => voice.sessions({ limit: 50 }));
  const runRef = useRef(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read a browser-only preference after mount
    setSpeakerOn(readSpeakerPref());
    return () => {
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  const voiceState: VoiceState =
    rec.state !== "idle" ? "listening" : busy === "processing" ? "processing" : busy === "speaking" ? "speaking" : "idle";

  const add = (entry: TranscriptEntry) => setTranscript((prev) => [...prev, entry]);

  /** Read an answer aloud; resolves when finished (or immediately if off/unsupported). */
  const speak = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
        if (!speakerOn || !synth || typeof SpeechSynthesisUtterance === "undefined") return resolve();
        synth.cancel();
        const u = new SpeechSynthesisUtterance(toPlainText(text).replace(/₦/g, "naira "));
        u.lang = "en-NG";
        u.rate = 1;
        u.onend = () => resolve();
        u.onerror = () => resolve();
        setBusy("speaking");
        synth.speak(u);
      }),
    [speakerOn]
  );

  function toggleSpeaker() {
    setSpeakerOn((on) => {
      const next = !on;
      try {
        window.localStorage.setItem(SPEAKER_KEY, next ? "on" : "off");
      } catch {}
      if (!next) window.speechSynthesis?.cancel();
      return next;
    });
  }

  async function handleStart() {
    setError(null);
    window.speechSynthesis?.cancel();
    setBusy(null);
    await rec.start();
  }

  async function handleStop() {
    const recording = await rec.stop();
    if (!recording || recording.durationSec < 0.5) {
      setError("That was too short. Tap the orb, ask your question, then tap again to send.");
      return;
    }
    const run = ++runRef.current;
    const at = new Date().toISOString();
    const placeholderId = entryId("user");
    add({ id: placeholderId, role: "user", text: `Voice question (${duration(recording.durationSec)})`, time: time(at) });
    setBusy("processing");
    try {
      const res = await voice.ask(recording.blob, sessionId);
      if (run !== runRef.current) return;
      if (res.question) {
        setTranscript((prev) => prev.map((e) => (e.id === placeholderId ? { ...e, text: res.question! } : e)));
      }
      add({ id: entryId("ai"), role: "assistant", text: res.answer, time: time(res.created_at ?? new Date().toISOString()) });
      if (res.session_id) {
        if (res.session_id !== sessionId) setSessionId(res.session_id);
        void sessions.reload();
      }
      await speak(res.answer);
    } catch (err) {
      if (run !== runRef.current) return;
      setTranscript((prev) => prev.filter((e) => e.id !== placeholderId));
      setError(
        err instanceof ApiError && err.code === "NO_SPEECH"
          ? "I couldn't hear anything. Please try again a little closer to the microphone."
          : err instanceof Error
            ? err.message
            : "Voice processing failed."
      );
    } finally {
      if (run === runRef.current) setBusy(null);
    }
  }

  async function handleQuickCommand(prompt: string) {
    setError(null);
    window.speechSynthesis?.cancel();
    const run = ++runRef.current;
    add({ id: entryId("user"), role: "user", text: prompt, time: time(new Date().toISOString()) });
    setBusy("processing");
    try {
      const res = await ai.chat({ question: prompt });
      if (run !== runRef.current) return;
      add({ id: entryId("ai"), role: "assistant", text: toPlainText(res.answer), time: time(new Date().toISOString()) });
      await speak(res.answer);
    } catch (err) {
      if (run !== runRef.current) return;
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      if (run === runRef.current) setBusy(null);
    }
  }

  async function openSession(id: string, readAloud = false) {
    setError(null);
    window.speechSynthesis?.cancel();
    const run = ++runRef.current;
    setBusy("processing");
    try {
      const s = await voice.session(id);
      if (run !== runRef.current) return;
      setSessionId(s.id);
      const entries = s.turns.map((t, i) => ({
        id: `${s.id}-${i}`,
        role: t.role,
        text: t.text,
        time: time(t.created_at),
      }));
      setTranscript(entries);
      const lastAnswer = [...entries].reverse().find((e) => e.role === "assistant");
      if (readAloud && lastAnswer) await speak(lastAnswer.text);
    } catch (err) {
      if (run !== runRef.current) return;
      setError(err instanceof Error ? err.message : "Couldn't open that session.");
    } finally {
      if (run === runRef.current) setBusy(null);
    }
  }

  async function deleteSession(id: string) {
    if (!window.confirm("Delete this voice session?")) return;
    const prev = sessions.data;
    sessions.setData((p) => (p ? { ...p, items: p.items.filter((s) => s.id !== id), total: p.total - 1 } : p!));
    if (id === sessionId) {
      setSessionId(null);
      setTranscript([]);
    }
    try {
      await voice.removeSession(id);
    } catch (err) {
      if (prev) sessions.setData(prev);
      setError(err instanceof Error ? err.message : "Couldn't delete that session.");
    }
  }

  function newSession() {
    runRef.current++;
    window.speechSynthesis?.cancel();
    setBusy(null);
    setSessionId(null);
    setTranscript([]);
    setError(null);
  }

  const sessionList: VoiceSession[] =
    sessions.data?.items.map((s) => ({
      id: s.id,
      title: s.title,
      duration: duration(s.duration_sec),
      date: date(s.created_at, "short") + ", " + time(s.created_at),
      dateGroup: dayGroup(s.created_at),
      messageCount: s.turn_count,
      preview: s.preview,
    })) ?? [];

  const historyNote = sessions.notImplemented
    ? "Saved voice sessions aren't available yet. Your conversation stays here until you leave the page."
    : sessions.error && !sessions.data
      ? sessions.error.message
      : null;

  const shownError = error ?? rec.error;

  return (
    <div className="px-4 lg:px-0">
      <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-6 lg:items-start">
        <div>
          <VoiceHero
            state={voiceState}
            isActive={rec.state !== "idle"}
            isMuted={rec.state === "paused"}
            elapsed={rec.elapsed}
            maxSeconds={MAX_RECORDING_SEC}
            onStart={() => void handleStart()}
            onStop={() => void handleStop()}
            onMute={rec.togglePause}
            speakerOn={speakerOn}
            onToggleSpeaker={toggleSpeaker}
            busy={busy === "processing"}
          />

          <div className="border-t border-[#F0F0EC] mb-6" />

          {shownError && (
            <div className="mb-4">
              <ErrorState error={shownError} compact />
            </div>
          )}

          {transcript.length > 0 && (
            <div className="flex justify-end mb-2">
              <button onClick={newSession} className="text-xs font-semibold text-[#E85D04] hover:underline">
                Start a new session
              </button>
            </div>
          )}

          <VoiceTranscript entries={transcript} isListening={rec.state === "recording"} />

          <QuickCommandGrid onSelect={(p) => void handleQuickCommand(p)} disabled={rec.state !== "idle" || busy === "processing"} />
        </div>

        <div className="lg:sticky lg:top-4">
          {historyNote && (
            <p className="text-xs text-[#A0AEC0] bg-white border border-dashed border-[#E8E8E4] rounded-xl px-3 py-2 mb-3 leading-relaxed">
              {historyNote}
            </p>
          )}
          <VoiceSessionHistory
            sessions={sessionList}
            activeId={sessionId ?? undefined}
            onReplay={(id) => void openSession(id, true)}
            onDelete={(id) => void deleteSession(id)}
            onSelect={(id) => void openSession(id)}
          />
        </div>
      </div>
    </div>
  );
}
