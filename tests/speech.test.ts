import { describe, expect, it } from "vitest";
import { MAX_SPOKEN_CHARS, bestVoice, spokenText } from "@/lib/speech";

describe("spokenText", () => {
  it("strips formatting and says naira naturally", () => {
    expect(spokenText("**Done!** I recorded 1 Shea Butter for ₦4,500.\n- Revenue: ₦ 12,000.50")).toBe(
      "Done! I recorded 1 Shea Butter for 4,500 naira. Revenue: 12,000.50 naira"
    );
  });

  it("trims long answers at a sentence end", () => {
    const sentence = "This is a fairly long sentence about the business. ";
    const out = spokenText(sentence.repeat(20));
    expect(out.length).toBeLessThanOrEqual(MAX_SPOKEN_CHARS);
    expect(out.endsWith(".")).toBe(true);
  });

  it("returns an empty string for empty answers", () => {
    expect(spokenText("   ")).toBe("");
  });
});

describe("bestVoice", () => {
  it("prefers natural English voices, then Nigerian English", () => {
    const voices = [
      { name: "Microsoft David", lang: "en-US" },
      { name: "Google français", lang: "fr-FR" },
      { name: "Microsoft Ezinne Online (Natural)", lang: "en-NG" },
      { name: "Google UK English Female", lang: "en-GB" },
    ];
    expect(bestVoice(voices)?.name).toBe("Microsoft Ezinne Online (Natural)");
  });

  it("ignores non-English voices", () => {
    expect(bestVoice([{ name: "Google français", lang: "fr-FR" }])).toBeUndefined();
  });
});
