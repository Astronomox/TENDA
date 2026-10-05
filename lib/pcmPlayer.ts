"use client";

/**
 * Plays raw 16-bit little-endian mono PCM (what /voice/speak/stream sends,
 * 24 kHz) while it is still downloading, using the Web Audio API — so the
 * first words play as soon as the first chunk arrives.
 */

export type PlayResult = "ended" | "stopped" | "failed";

type AudioContextCtor = typeof AudioContext;

function audioContextCtor(): AudioContextCtor | undefined {
  if (typeof window === "undefined") return undefined;
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
}

export class PcmStreamPlayer {
  private ctx: AudioContext | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private run = 0;
  private finish: ((result: PlayResult) => void) | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  constructor(private readonly sampleRate = 24000) {}

  get supported(): boolean {
    return !!audioContextCtor();
  }

  /** Call from a tap handler: mobile browsers only allow audio a tap started. */
  unlock() {
    const Ctx = audioContextCtor();
    if (!Ctx) return;
    if (!this.ctx || this.ctx.state === "closed") this.ctx = new Ctx();
    if (this.ctx.state === "suspended") void this.ctx.resume().catch(() => {});
  }

  /**
   * Play a PCM stream. Resolves "ended" when the last sample has played,
   * "stopped" if stop() was called, or "failed" if no audio arrived.
   */
  async play(stream: ReadableStream<Uint8Array>, onStart?: () => void): Promise<PlayResult> {
    this.stop();
    this.unlock();
    const ctx = this.ctx;
    if (!ctx) return "failed";
    const run = ++this.run;
    const reader = stream.getReader();
    this.reader = reader;
    let carry: number | null = null; // odd byte left over between chunks
    let next = 0;
    let started = false;
    let pending = 0;
    let streamDone = false;

    const result = new Promise<PlayResult>((resolve) => {
      this.finish = resolve;
    });
    const done = (r: PlayResult) => {
      if (run !== this.run || !this.finish) return;
      const f = this.finish;
      this.finish = null;
      f(r);
    };

    try {
      for (;;) {
        const { done: finished, value } = await reader.read();
        if (run !== this.run) {
          void reader.cancel().catch(() => {});
          return "stopped";
        }
        if (finished) break;
        if (!value || value.length === 0) continue;

        let bytes = value;
        if (carry !== null) {
          const merged = new Uint8Array(bytes.length + 1);
          merged[0] = carry;
          merged.set(bytes, 1);
          bytes = merged;
          carry = null;
        }
        if (bytes.length % 2) {
          carry = bytes[bytes.length - 1];
          bytes = bytes.subarray(0, bytes.length - 1);
        }
        const samples = bytes.length / 2;
        if (!samples) continue;

        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
        const buffer = ctx.createBuffer(1, samples, this.sampleRate);
        const channel = buffer.getChannelData(0);
        for (let i = 0; i < samples; i++) channel[i] = view.getInt16(i * 2, true) / 32768;

        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(ctx.destination);
        // Small lead on the first chunk; afterwards queue each chunk right after the last.
        next = started ? Math.max(next, ctx.currentTime + 0.02) : ctx.currentTime + 0.08;
        if (!started) {
          started = true;
          onStart?.();
        }
        pending++;
        src.onended = () => {
          this.sources.delete(src);
          pending--;
          if (streamDone && pending === 0) done("ended");
        };
        src.start(next);
        next += buffer.duration;
        this.sources.add(src);
      }
    } catch {
      if (run !== this.run) return "stopped";
      if (!started) {
        done("failed");
        return result;
      }
      // Network dropped mid-answer: let what already arrived finish playing.
    }

    if (!started) done("failed");
    streamDone = true;
    if (pending === 0) done("ended");
    return result;
  }

  /** Stop playback immediately (also resolves a pending play() with "stopped"). */
  stop() {
    this.run++;
    // Wake a play() that is waiting for the next chunk (and stop the download).
    void this.reader?.cancel().catch(() => {});
    this.reader = null;
    for (const src of this.sources) {
      src.onended = null;
      try {
        src.stop();
      } catch {
        // already stopped
      }
    }
    this.sources.clear();
    const f = this.finish;
    this.finish = null;
    f?.("stopped");
  }
}
