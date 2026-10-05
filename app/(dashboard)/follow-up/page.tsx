"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MessageCircle, Phone, Check, AlarmClock, CalendarCheck, RefreshCw } from "lucide-react";
import { followUps as api } from "@/lib/api";
import { invalidate, useResource } from "@/lib/hooks";
import { date, relative, telUrl, whatsappUrl } from "@/lib/format";
import type { FollowUp } from "@/lib/types";
import { EmptyState, ErrorState, ResourceView, SkeletonList } from "@/components/ui";

const SOURCE_LABEL: Record<FollowUp["interval_source"], string> = {
  history: "based on their buying pattern",
  product: "based on the product's repurchase time",
  business_rhythm: "based on your usual sales rhythm",
};

function FollowUpCard({
  item,
  onDone,
  onSnooze,
}: {
  item: FollowUp;
  onDone: (item: FollowUp, channel: "whatsapp" | "phone") => void;
  onSnooze: (item: FollowUp) => void;
}) {
  const [showMessage, setShowMessage] = useState(false);
  const overdue = item.status === "overdue";
  const accent = overdue ? "bg-[#DC2626]" : "bg-[#D97706]";
  const wa = item.whatsapp_url ?? whatsappUrl(item.customer.phone, item.suggested_message ?? undefined);
  const tel = item.tel_url ?? telUrl(item.customer.phone);

  const badge =
    item.status === "overdue"
      ? { text: `${item.days_overdue ?? 0}d overdue`, cls: "bg-[#FFF0E6] text-[#DC2626]" }
      : item.status === "due_today"
        ? { text: "Due today", cls: "bg-amber-50 text-[#D97706]" }
        : { text: item.days_until ? `In ${item.days_until}d` : "Due soon", cls: "bg-amber-50 text-[#D97706]" };

  return (
    <div className="relative bg-white p-4 rounded-xl border border-[#E8E8E4] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${accent}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/customers/${encodeURIComponent(item.customer.id)}`} className="font-semibold text-[#1A1A1A] hover:text-[#E85D04]">
            {item.customer.name}
          </Link>
          <p className="text-sm text-[#4A5568] truncate">{item.product.name}</p>
        </div>
        <span className={`${badge.cls} text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap`}>{badge.text}</span>
      </div>

      <p
        className="mt-2 text-xs text-[#A0AEC0] leading-relaxed"
        title={`Every ~${item.interval_days} days, ${SOURCE_LABEL[item.interval_source] ?? "predicted"}`}
      >
        Bought {relative(item.last_purchase_at)} · expected {date(item.expected_at, "short")} · every ~{item.interval_days} days
      </p>

      {item.suggested_message && (
        <button
          type="button"
          onClick={() => setShowMessage((v) => !v)}
          aria-expanded={showMessage}
          className="mt-3 w-full text-left text-xs text-[#4A5568] bg-[#FAFAF8] border border-[#F0F0EC] rounded-lg px-3 py-2 leading-relaxed"
        >
          <span className={showMessage ? "" : "line-clamp-2"}>{item.suggested_message}</span>
        </button>
      )}

      <div className="flex gap-2 mt-4">
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onDone(item, "whatsapp")}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#E85D04] hover:bg-[#FF8C42] text-white text-sm font-semibold px-3 py-2.5 rounded-lg transition-colors"
          >
            <MessageCircle className="w-4 h-4" /> Message
          </a>
        ) : (
          <Link
            href={`/customers/${encodeURIComponent(item.customer.id)}`}
            className="flex-1 flex items-center justify-center gap-1.5 border border-dashed border-[#E8E8E4] text-[#A0AEC0] text-xs font-semibold px-3 py-2.5 rounded-lg"
          >
            Add a phone number
          </Link>
        )}
        {tel && (
          <a
            href={tel}
            onClick={() => onDone(item, "phone")}
            className="flex items-center justify-center gap-1.5 border border-[#E8E8E4] text-[#4A5568] hover:border-[#E85D04] hover:text-[#E85D04] text-sm font-semibold px-3 py-2.5 rounded-lg transition-colors"
            aria-label={`Call ${item.customer.name}`}
          >
            <Phone className="w-4 h-4" />
          </a>
        )}
        <button
          onClick={() => onSnooze(item)}
          className="flex items-center justify-center border border-[#E8E8E4] text-[#4A5568] hover:border-[#E85D04] hover:text-[#E85D04] px-3 py-2.5 rounded-lg transition-colors"
          aria-label="Remind me in 3 days"
          title="Remind me in 3 days"
        >
          <AlarmClock className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDone(item, "phone")}
          className="flex items-center justify-center border border-[#E8E8E4] text-[#4A5568] hover:border-[#16A34A] hover:text-[#16A34A] px-3 py-2.5 rounded-lg transition-colors"
          aria-label="Mark as followed up"
          title="Mark as followed up"
        >
          <Check className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  dot,
  items,
  empty,
  ...handlers
}: {
  title: string;
  dot: string;
  items: FollowUp[];
  empty: string;
  onDone: (item: FollowUp, channel: "whatsapp" | "phone") => void;
  onSnooze: (item: FollowUp) => void;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-[#A0AEC0] uppercase tracking-widest mb-3 flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${dot}`} />
        {title} ({items.length})
      </h3>
      {items.length > 0 ? (
        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
          {items.map((item) => (
            <FollowUpCard key={item.key} item={item} {...handlers} />
          ))}
        </div>
      ) : (
        <p className="text-[#A0AEC0] text-sm">{empty}</p>
      )}
    </div>
  );
}

export default function FollowUpPage() {
  const res = useResource("followups:list", () => api.list({ status: "all", limit: 200 }));
  const [actionError, setActionError] = useState<string | null>(null);

  function removeLocally(key: string) {
    res.setData((prev) => (prev ? { ...prev, items: prev.items.filter((i) => i.key !== key) } : prev!));
  }

  async function act(item: FollowUp, run: () => Promise<void>) {
    setActionError(null);
    const prev = res.data;
    removeLocally(item.key);
    try {
      await run();
      invalidate("analytics:");
      invalidate("customers:");
    } catch (err) {
      if (prev) res.setData(prev);
      setActionError(err instanceof Error ? err.message : "Couldn't update this follow-up.");
    }
  }

  const handlers = {
    // Opening WhatsApp/phone counts as following up; the link opens regardless.
    onDone: (item: FollowUp, channel: "whatsapp" | "phone") => void act(item, () => api.done(item.key, channel)),
    onSnooze: (item: FollowUp) => void act(item, () => api.snooze(item.key, 3)),
  };

  return (
    <div className="px-4 py-6 lg:px-0 lg:py-0 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display font-extrabold text-3xl lg:text-4xl text-[#1A1A1A] leading-none tracking-tight">Follow-ups</h1>
          <p className="text-sm text-[#4A5568] mt-2">Customers who usually buy again around now.</p>
        </div>
        <button
          onClick={() => void res.reload()}
          disabled={res.loading}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E8E8E4] bg-white text-[#4A5568] hover:border-[#E85D04] hover:text-[#E85D04] disabled:opacity-50"
          aria-label="Refresh follow-ups"
        >
          <RefreshCw className={`h-4 w-4 ${res.loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {actionError && <ErrorState error={actionError} compact />}

      <ResourceView resource={res} feature="Follow-up predictions" endpoint="GET /follow-ups" loading={<SkeletonList rows={4} />}>
        {(data) => {
          const overdue = data.items.filter((i) => i.status === "overdue");
          const soon = data.items.filter((i) => i.status === "due_today" || i.status === "due_soon");
          if (overdue.length === 0 && soon.length === 0) {
            return (
              <EmptyState
                icon={CalendarCheck}
                title="No follow-ups right now"
                body={
                  data.counts?.upcoming
                    ? `${data.counts.upcoming} customer${data.counts.upcoming === 1 ? " is" : "s are"} due in the next two weeks.`
                    : "As you log sales against customers, TENDA learns when they usually buy again and reminds you here."
                }
              />
            );
          }
          return (
            <div className="space-y-6">
              <Section title="Overdue" dot="bg-[#DC2626]" items={overdue} empty="No overdue customers" {...handlers} />
              <Section title="Due Soon" dot="bg-[#D97706]" items={soon} empty="No upcoming follow-ups" {...handlers} />
            </div>
          );
        }}
      </ResourceView>
    </div>
  );
}
