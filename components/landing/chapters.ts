export const VIDEO = {
  mp4: "/videos/tenda-tour.mp4",
  webm: "/videos/tenda-tour.webm",
  poster: "/videos/tenda-tour-poster.jpg",
  duration: 53.6,
  rate: 1.2,
} as const;

export interface Chapter {
  id: string;
  label: string;
  start: number; // seconds into the file
  caption: string;
  /** phones: top-left of an 800×640 focus window inside the 1280×800 recording (≈1.6× zoom) */
  focus: [number, number];
}

export const CHAPTERS: Chapter[] = [
  { id: "overview", label: "Overview", start: 0, caption: "Your month at a glance: revenue, customers and who needs a follow-up today.", focus: [270, 70] },
  { id: "customers", label: "Customers", start: 2.4, caption: "Search any customer and see what they spend, how often and on what.", focus: [290, 40] },
  { id: "sale", label: "Log a sale", start: 10, caption: "Pick the product, set the units, done. The sale is recorded in seconds.", focus: [250, 60] },
  { id: "followups", label: "Follow-ups", start: 33, caption: "Who’s overdue to buy again, with the WhatsApp message already written.", focus: [280, 70] },
  { id: "ai", label: "AI assistant", start: 36.2, caption: "Ask “Who are my best customers this month?” and get a clear table back.", focus: [480, 40] },
  { id: "insights", label: "Insights", start: 44, caption: "Revenue trend, best products and plain-English recommendations.", focus: [270, 160] },
];

export const chapterEnd = (i: number) => (i < CHAPTERS.length - 1 ? CHAPTERS[i + 1].start : VIDEO.duration);

export function chapterAt(t: number) {
  let idx = 0;
  for (let i = 0; i < CHAPTERS.length; i++) if (t >= CHAPTERS[i].start - 0.01) idx = i;
  return idx;
}
