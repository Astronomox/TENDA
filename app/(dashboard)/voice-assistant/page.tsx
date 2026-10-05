"use client";

/**
 * Voice Assistant — POST /voice/ask (spoken questions), POST /ai/chat (quick
 * commands), session history from /voice/sessions (BACKEND_README.md §11).
 * Answers are read aloud in a natural voice streamed from POST
 * /voice/speak/stream (playback starts with the first chunk), falling back to
 * the browser's speech synthesis only if that fails. Spoken sales are saved
 * by /voice/ask, so the cached sales/analytics data is refreshed afterwards.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import VoiceHero from "./components/VoiceHero";
import VoiceTranscript, { TranscriptEntry } from "./components/VoiceTranscript";
import QuickCommandGrid from "./components/QuickCommandGrid";
import VoiceSessionHistory, { VoiceSession } from "./components/VoiceSessionHistory";
import { VoiceState } from "./components/VoiceStateIndicator";
import { ai, ApiError, voice } from "@/lib/api";
import { invalidate, useResource } from "@/lib/hooks";
import { date, dayGroup, duration, time } from "@/lib/format";
import { MAX_RECORDING_SEC, useRecorder } from "@/lib/useRecorder";
import { PcmStreamPlayer } from "@/lib/pcmPlayer";
import { toPlainText } from "@/components/RichText";
import { ErrorState } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";

const SPEAKER_KEY = "tenda_voice_speaker";
const MAX_SPOKEN_CHARS = 450; // the server keeps voice answers short; this is a safety net
const NO_SPEECH_MESSAGE = "I couldn't hear anything. Please try again a little closer to the microphone.";

/** What gets read aloud: plain text, naira said naturally, long answers trimmed at a sentence. */
function spokenText(text: string): string {
  let t = toPlainText(text)
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/₦\s?([\d,]+(?:\.\d+)?)/g, "$1 naira")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length > MAX_SPOKEN_CHARS) {
    const cut = t.slice(0, MAX_SPOKEN_CHARS);
    const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
    t = end > 200 ? cut.slice(0, end + 1) : cut;
  }
  return t;
}

/** The most natural-sounding English voice the browser has (fallback only). */
function pickBrowserVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith("en"));
  const score = (v: SpeechSynthesisVoice) =>
    (/natural|neural|online/i.test(v.name) ? 4 : 0) +
    (/google/i.test(v.name) ? 2 : 0) +
    (/en-ng/i.test(v.lang) ? 3 : /en-(gb|us)/i.test(v.lang) ? 1 : 0);
  return [...voices].sort((a, b) => score(b) - score(a))[0];
}

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
  const confirm = useConfirm();
  const sessions = useResource("voice:sessions", () => voice.sessions({ limit: 50 }));
  const runRef = useRef(0);
  const playerRef = useRef<PcmStreamPlayer | null>(null);
  const speechAbortRef = useRef<AbortController | null>(null);

  const player = useCallback(() => (playerRef.current ??= new PcmStreamPlayer()), []);

  /** Stop anything being fetched or spoken. */
  const stopSpeech = useCallback(() => {
    speechAbortRef.current?.abort();
    speechAbortRef.current = null;
    playerRef.current?.stop();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read a browser-only preference after mount
    setSpeakerOn(readSpeakerPref());
    return () => stopSpeech();
  }, [stopSpeech]);

  /** Call from a tap handler: mobile browsers only allow audio that a tap started. */
  const unlockAudio = useCallback(() => player().unlock(), [player]);

  const voiceState: VoiceState =
    rec.state !== "idle" ? "listening" : busy === "processing" ? "processing" : busy === "speaking" ? "speaking" : "idle";

  const add = (entry: TranscriptEntry) => setTranscript((prev) => [...prev, entry]);

  /** Fallback: the browser's built-in voice. */
  const speakWithBrowser = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
        if (!synth || typeof SpeechSynthesisUtterance === "undefined") return resolve();
        synth.cancel();
        const u = new SpeechSynthesisUtterance(text);
        const v = pickBrowserVoice();
        if (v) u.voice = v;
        u.lang = v?.lang ?? "en-NG";
        u.rate = 1;
        u.pitch = 1.05;
        u.onend = () => resolve();
        u.onerror = () => resolve();
        setBusy("speaking");
        synth.speak(u);
      }),
    []
  );

  /** Read an answer aloud in the natural voice; resolves when finished (or immediately if off). */
  const speak = useCallback(
    async (text: string) => {
      if (!speakerOn) return;
      const words = spokenText(text);
      if (!words) return;
      stopSpeech();
      const ctrl = new AbortController();
      speechAbortRef.current = ctrl;
      const p = player();
      if (p.supported) {
        try {
          const stream = await voice.speakStream(words, ctrl.signal);
          if (ctrl.signal.aborted) return;
          const result = await p.play(stream, () => setBusy("speaking"));
          if (result !== "failed") return;
        } catch {
          // busy / not configured / offline: use the browser's voice instead
        }
      }
      if (ctrl.signal.aborted) return;
      speechAbortRef.current = null;
      await speakWithBrowser(words);
    },
    [speakerOn, stopSpeech, player, speakWithBrowser]
  );

  function toggleSpeaker() {
    setSpeakerOn((on) => {
      const next = !on;
      try {
        window.localStorage.setItem(SPEAKER_KEY, next ? "on" : "off");
      } catch {}
      if (!next) stopSpeech();
      return next;
    });
  }

  async function handleStart() {
    setError(null);
    unlockAudio();
    stopSpeech();
    setBusy(null);
    await rec.start();
  }

  async function handleStop() {
    unlockAudio();
    const recording = await rec.stop();
    if (!recording || recording.durationSec < 0.5) {
      setError("That was too short. Tap the orb, ask your question, then tap again to send.");
      return;
    }
    if (!recording.hasSpeech) {
      // Nothing but silence: don't send it (the AI could otherwise "hear" words that weren't said).
      setError(NO_SPEECH_MESSAGE);
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
      const saleSaved = res.intent === "log_sale" && !!res.sale;
      if (saleSaved) {
        for (const prefix of ["sales:", "analytics:", "customers:", "followups:", "insights:"]) invalidate(prefix);
      }
      add({
        id: entryId("ai"),
        role: "assistant",
        text: res.answer,
        time: time(res.created_at ?? new Date().toISOString()),
        link: saleSaved ? { href: "/sales", label: "View in Sales" } : undefined,
      });
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
          ? NO_SPEECH_MESSAGE
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
    unlockAudio();
    stopSpeech();
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
    if (readAloud) unlockAudio();
    stopSpeech();
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
    if (!(await confirm({ title: "Delete this voice session?", message: "The recording's transcript will be removed for good.", confirmLabel: "Delete" }))) return;
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
    stopSpeech();
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
