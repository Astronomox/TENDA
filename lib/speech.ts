import { toPlainText } from "@/components/RichText";

/** The server keeps voice answers short; this is a safety net. */
export const MAX_SPOKEN_CHARS = 450;

/** What gets read aloud: plain text, naira said naturally, long answers trimmed at a sentence. */
export function spokenText(text: string): string {
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

type VoiceLike = Pick<SpeechSynthesisVoice, "name" | "lang">;

/** The most natural-sounding English voice in `voices` (for the browser-voice fallback). */
export function bestVoice<V extends VoiceLike>(voices: readonly V[]): V | undefined {
  const score = (v: VoiceLike) =>
    (/natural|neural|online/i.test(v.name) ? 4 : 0) +
    (/google/i.test(v.name) ? 2 : 0) +
    (/en-ng/i.test(v.lang) ? 3 : /en-(gb|us)/i.test(v.lang) ? 1 : 0);
  return voices.filter((v) => v.lang?.toLowerCase().startsWith("en")).sort((a, b) => score(b) - score(a))[0];
}
