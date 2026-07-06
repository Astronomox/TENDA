"use client";

/**
 * app/(dashboard)/voice-assistant/page.tsx
 *
 * Wired to POST /voice/ask on the Tenda FastAPI backend.
 * Records audio via the browser MediaRecorder API, sends the blob,
 * and displays the AI text answer in the transcript.
 * The demo state-cycle animation is kept for the orb/waveform visuals.
 */

import React, { useState, useCallback, useRef } from "react";
import VoiceHero from "./components/VoiceHero";
import VoiceTranscript, { TranscriptEntry } from "./components/VoiceTranscript";
import QuickCommandGrid from "./components/QuickCommandGrid";
import VoiceSummaryCard, { VoiceSummary } from "./components/VoiceSummaryCard";
import VoiceSessionHistory, { VoiceSession } from "./components/VoiceSessionHistory";
import { VoiceState } from "./components/VoiceStateIndicator";
import { voiceAsk } from "@/lib/apiClient";

// ─── Seed session history ─────────────────────────────────────────────────────
const SEED_SESSIONS: VoiceSession[] = [
  {
    id: "s1",
    title: "Monthly sales analysis",
    duration: "4:32",
    date: "Today, 10:41 AM",
    dateGroup: "Today",
    messageCount: 8,
    preview: "Analyzed revenue trends and at-risk customer segments",
  },
  {
    id: "s2",
    title: "Customer retention review",
    duration: "3:18",
    date: "Today, 9:15 AM",
    dateGroup: "Today",
    messageCount: 6,
    preview: "Discussed churn prevention strategies for June",
  },
  {
    id: "s3",
    title: "Product performance deep dive",
    duration: "6:04",
    date: "Yesterday, 3:22 PM",
    dateGroup: "Yesterday",
    messageCount: 12,
    preview: "Food & Beverage repeat rate analysis and Electronics decline",
  },
  {
    id: "s4",
    title: "Weekly business summary",
    duration: "2:45",
    date: "Yesterday, 9:00 AM",
    dateGroup: "Yesterday",
    messageCount: 5,
    preview: "High-level weekly performance overview",
  },
  {
    id: "s5",
    title: "Friday promo planning",
    duration: "5:10",
    date: "Jun 10",
    dateGroup: "Earlier",
    messageCount: 9,
    preview: "Discussed flash sale strategy and timing optimisation",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function VoiceAssistantPage() {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [sessions, setSessions] = useState<VoiceSession[]>(SEED_SESSIONS);
  const [activeSessionId, setActiveSessionId] = useState<string>("s1");
  const [error, setError] = useState<string | null>(null);

  // MediaRecorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const addTranscriptEntry = (entry: TranscriptEntry) =>
    setTranscript((prev) => [...prev, entry]);

  // ── Start: open mic and begin recording ──────────────────────────────────
  const handleStart = useCallback(async () => {
    setError(null);
    setTranscript([]);
    setShowSummary(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsActive(true);
      setVoiceState("listening");
    } catch {
      setError("Microphone access denied. Please allow microphone access and try again.");
    }
  }, []);

  // ── Stop: send audio to backend, display answer ──────────────────────────
  const handleStop = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    setVoiceState("processing");

    // Wrap recorder.stop() in a promise so we wait for all data
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
      // Stop all tracks to release mic
      recorder.stream.getTracks().forEach((t) => t.stop());
    });

    setIsActive(false);

    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

    // Add a placeholder user entry while we wait
    const userEntry: TranscriptEntry = {
      id: `user-${Date.now()}`,
      role: "user",
      text: "Voice message sent…",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    addTranscriptEntry(userEntry);

    try {
      setVoiceState("speaking");
      const res = await voiceAsk(audioBlob);

      const aiEntry: TranscriptEntry = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        text: res.answer,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      addTranscriptEntry(aiEntry);
      setShowSummary(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Voice processing failed";
      setError(msg);
    } finally {
      setVoiceState("idle");
    }
  }, []);

  // ── Quick command: use text-based AI chat instead of audio ───────────────
  const handleQuickCommand = useCallback(async (prompt: string) => {
    setError(null);
    setTranscript([]);
    setShowSummary(false);

    const userEntry: TranscriptEntry = {
      id: `user-${Date.now()}`,
      role: "user",
      text: prompt,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    addTranscriptEntry(userEntry);
    setVoiceState("processing");

    try {
      // Quick commands use the text AI endpoint (no audio needed)
      const { aiChat } = await import("@/lib/apiClient");
      const res = await aiChat(prompt, []);

      const aiEntry: TranscriptEntry = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        text: res.answer,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      addTranscriptEntry(aiEntry);
      setShowSummary(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
    } finally {
      setVoiceState("idle");
    }
  }, []);

  // Build a summary from the last transcript pair
  const liveSummary: VoiceSummary | null =
    showSummary && transcript.length >= 2
      ? {
          summary: transcript.find((e) => e.role === "assistant")?.text ?? "",
          takeaways: [],
          tasks: [],
          recommendations: [],
          nextActions: ["Review AI Insights page for detailed breakdown"],
        }
      : null;

  const handleDeleteSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return (
    <div className="px-4 lg:px-0">
      <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-6 lg:items-start">

        {/* ── LEFT / MAIN COLUMN ──────────────────────────────────────────── */}
        <div>
          <VoiceHero
            state={voiceState}
            isActive={isActive}
            isMuted={isMuted}
            onStart={handleStart}
            onStop={handleStop}
            onMute={() => setIsMuted((v) => !v)}
          />

          <div className="border-t border-[#F0F0EC] mb-6" />

          {error && (
            <div className="mb-4 text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {liveSummary && (
            <VoiceSummaryCard
              summary={liveSummary}
              sessionDate={new Date().toLocaleString([], {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            />
          )}

          <VoiceTranscript
            entries={transcript}
            isListening={voiceState === "listening"}
          />

          <QuickCommandGrid onSelect={handleQuickCommand} disabled={isActive} />
        </div>

        {/* ── RIGHT / SESSION HISTORY COLUMN ──────────────────────────────── */}
        <div className="lg:sticky lg:top-4">
          <VoiceSessionHistory
            sessions={sessions}
            activeId={activeSessionId}
            onReplay={(id) => setActiveSessionId(id)}
            onDelete={handleDeleteSession}
            onSelect={(id) => setActiveSessionId(id)}
          />
        </div>

      </div>
    </div>
  );
}
