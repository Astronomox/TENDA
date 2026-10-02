// Display helpers. Business timezone is Africa/Lagos (BACKEND_README.md §2.7).

export const TZ = "Africa/Lagos";

export function naira(value: number | null | undefined, opts: { compact?: boolean } = {}): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "₦0";
  if (opts.compact && Math.abs(n) >= 1000) {
    return "₦" + new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  }
  return "₦" + n.toLocaleString("en-NG", { maximumFractionDigits: 2 });
}

export function number(value: number | null | undefined): string {
  return Number(value ?? 0).toLocaleString("en-NG");
}

/** "+12.0%" / "−3.4%" / null when there's no baseline (§19.1). */
export function pct(value: number | null | undefined, digits = 1): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(digits)}%`;
}

export function date(iso: string | null | undefined, style: "short" | "medium" | "long" = "medium"): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return "—";
  const options: Intl.DateTimeFormatOptions =
    style === "short"
      ? { day: "numeric", month: "short", timeZone: TZ }
      : style === "long"
        ? { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: TZ }
        : { day: "numeric", month: "short", year: "numeric", timeZone: TZ };
  return d.toLocaleDateString("en-NG", options);
}

export function time(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return `${date(iso, "short")}, ${time(iso)}`;
}

export function relative(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Math.round((Date.now() - then) / 1000);
  if (diff < 45) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} hr ago`;
  const days = Math.round(diff / 86400);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return date(iso, "short");
}

/** Lagos calendar day as YYYY-MM-DD. */
export function lagosDay(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** "Today" | "Yesterday" | "Earlier" bucket in Lagos time. */
export function dayGroup(iso: string): "Today" | "Yesterday" | "Earlier" {
  const today = lagosDay();
  const yesterday = lagosDay(new Date(Date.now() - 86_400_000));
  const day = lagosDay(new Date(iso));
  if (day === today) return "Today";
  if (day === yesterday) return "Yesterday";
  return "Earlier";
}

export function todayLabel(): string {
  return new Date().toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: TZ,
  });
}

export function initials(name: string | null | undefined): string {
  return (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
}

export function firstName(name: string | null | undefined): string {
  return (name ?? "").trim().split(/\s+/)[0] ?? "";
}

/** Display a stored E.164 Nigerian number as 0803 123 4567. */
export function phone(value: string | null | undefined): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  const local = digits.startsWith("234") && digits.length === 13 ? "0" + digits.slice(3) : digits;
  if (local.startsWith("0") && local.length === 11) {
    return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
  }
  return value;
}

export function whatsappUrl(phoneNumber: string | null | undefined, text?: string): string | null {
  if (!phoneNumber) return null;
  let digits = phoneNumber.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) digits = "234" + digits.slice(1);
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function telUrl(phoneNumber: string | null | undefined): string | null {
  if (!phoneNumber) return null;
  const cleaned = phoneNumber.replace(/[^\d+]/g, "");
  return cleaned.length >= 7 ? `tel:${cleaned}` : null;
}

export function duration(seconds: number | null | undefined): string {
  const s = Math.max(0, Math.round(seconds ?? 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
