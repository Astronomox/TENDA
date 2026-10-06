import { beforeEach, describe, expect, it } from "vitest";
import { PcmStreamPlayer } from "@/lib/pcmPlayer";

// A minimal Web Audio stand-in: records what gets scheduled; sources "end" shortly after starting.
class FakeSource {
  buffer: { duration: number; getChannelData: () => Float32Array } | null = null;
  onended: (() => void) | null = null;
  at = 0;
  stoppedEarly = false;
  connect() {}
  start(at: number) {
    this.at = at;
    scheduled.push(this);
    setTimeout(() => this.onended?.(), 5);
  }
  stop() {
    this.stoppedEarly = true;
  }
}
class FakeContext {
  currentTime = 1;
  state = "running";
  resume() {
    return Promise.resolve();
  }
  createBuffer(_channels: number, n: number, rate: number) {
    const data = new Float32Array(n);
    return { duration: n / rate, getChannelData: () => data };
  }
  createBufferSource() {
    return new FakeSource();
  }
}

let scheduled: FakeSource[] = [];
(globalThis as unknown as { window: unknown }).window = { AudioContext: FakeContext };

function streamOf(chunks: Uint8Array[], failAfter?: number) {
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (failAfter !== undefined && i === failAfter) return controller.error(new Error("network"));
      if (i < chunks.length) controller.enqueue(chunks[i++]);
      else controller.close();
    },
  });
}

beforeEach(() => {
  scheduled = [];
});

describe("PcmStreamPlayer", () => {
  it("decodes 16-bit PCM split at odd byte boundaries and schedules it gaplessly", async () => {
    const pcm = new Uint8Array(new Int16Array([1000, -2000, 3000]).buffer);
    let starts = 0;
    const result = await new PcmStreamPlayer(24000).play(
      streamOf([pcm.slice(0, 3), pcm.slice(3, 5), pcm.slice(5)]),
      () => starts++
    );
    expect(result).toBe("ended");
    expect(starts).toBe(1);
    const samples = scheduled.flatMap((s) => Array.from(s.buffer!.getChannelData()));
    expect(samples.map((x) => Math.round(x * 32768))).toEqual([1000, -2000, 3000]);
    for (let i = 1; i < scheduled.length; i++) {
      const prev = scheduled[i - 1];
      expect(scheduled[i].at).toBeCloseTo(prev.at + prev.buffer!.duration, 9);
    }
  });

  it("reports failed when no audio arrives, so the page can use the browser voice", async () => {
    expect(await new PcmStreamPlayer().play(streamOf([]))).toBe("failed");
    expect(await new PcmStreamPlayer().play(streamOf([], 0))).toBe("failed");
  });

  it("stops immediately, even while waiting for the next chunk", async () => {
    const player = new PcmStreamPlayer();
    const neverEnds = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(4800));
      },
    });
    const pending = player.play(neverEnds);
    await new Promise((r) => setTimeout(r, 20));
    player.stop();
    expect(await pending).toBe("stopped");
  });

  it("keeps playing what arrived when the connection drops mid-answer", async () => {
    const result = await new PcmStreamPlayer().play(streamOf([new Uint8Array(480), new Uint8Array(480)], 1));
    expect(result).toBe("ended");
  });
});
