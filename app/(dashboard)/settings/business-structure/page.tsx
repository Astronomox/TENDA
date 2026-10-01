"use client";

import ProfileForm, { RadioGroup, Section } from "../ProfileForm";
import type { BusinessType, CommunicationTone, PriceRange, SalesChannel, SalesRhythm } from "@/lib/types";

const TYPES: { value: BusinessType; label: string }[] = [
  { value: "fashion_clothing", label: "Fashion / Clothing" },
  { value: "food_consumables", label: "Food / Consumables" },
  { value: "beauty_personal_care", label: "Beauty / Personal Care" },
  { value: "services", label: "Services" },
  { value: "general_retail", label: "General Retail" },
  { value: "other", label: "Other" },
];

const RHYTHMS: { value: SalesRhythm; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "every_2_weeks", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "irregular", label: "Irregular" },
];

const CHANNELS: { value: SalesChannel; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone", label: "Phone" },
  { value: "in_person", label: "In-person" },
  { value: "mixed", label: "Mixed" },
];

const TONES: { value: CommunicationTone; label: string }[] = [
  { value: "friendly", label: "Friendly / casual" },
  { value: "professional", label: "Professional / direct" },
  { value: "warm", label: "Warm / relationship-focused" },
];

const PRICES: { value: PriceRange; label: string }[] = [
  { value: "low", label: "Low (frequent small buys)" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High (larger, less frequent)" },
];

export default function BusinessStructure() {
  return (
    <ProfileForm
      title="Business Structure"
      subtitle="How your business sells — TENDA uses this for predictions and message tone."
      next={{ href: "/settings/products-offered", label: "Next: your products" }}
      validate={(d) => {
        if (d.sales_rhythm === "custom") {
          const n = d.custom_rhythm_days;
          if (!n || !Number.isInteger(n) || n < 1 || n > 365) return "Custom rhythm must be a whole number of days between 1 and 365.";
        }
        return null;
      }}
    >
      {(draft, set) => (
        <>
          <Section title="Business Type">
            <RadioGroup name="business_type" options={TYPES} value={draft.business_type} onChange={(business_type) => set({ business_type })} />
          </Section>

          <Section title="Sales Rhythm" hint="How often do your customers usually buy from you?">
            <RadioGroup
              name="sales_rhythm"
              options={RHYTHMS}
              value={draft.sales_rhythm}
              onChange={(sales_rhythm) => set({ sales_rhythm, custom_rhythm_days: null })}
            />
            <label
              className={`flex items-center gap-3 bg-white border rounded-xl px-4 py-3 text-sm cursor-pointer ${
                draft.sales_rhythm === "custom" ? "border-[#E85D04] bg-[#FFF7F0]" : "border-[#E8E8E4]"
              }`}
            >
              <input
                type="radio"
                name="sales_rhythm"
                checked={draft.sales_rhythm === "custom"}
                onChange={() => set({ sales_rhythm: "custom", custom_rhythm_days: draft.custom_rhythm_days ?? 21 })}
                className="accent-[#E85D04]"
              />
              <span>Every</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={365}
                value={draft.custom_rhythm_days ?? ""}
                onFocus={() => draft.sales_rhythm !== "custom" && set({ sales_rhythm: "custom" })}
                onChange={(e) => set({ sales_rhythm: "custom", custom_rhythm_days: e.target.value ? Number(e.target.value) : null })}
                className="w-16 bg-white border border-[#E8E8E4] rounded-md px-2 py-1 text-sm focus:outline-none focus:border-[#E85D04]"
                aria-label="Custom rhythm in days"
              />
              <span className="text-[#4A5568]">days</span>
            </label>
            <p className="text-xs text-[#A0AEC0]">TENDA uses this to predict when customers are ready to buy again.</p>
          </Section>

          <Section title="Primary Sales Channel">
            <RadioGroup name="sales_channel" options={CHANNELS} value={draft.sales_channel} onChange={(sales_channel) => set({ sales_channel })} />
          </Section>

          <Section title="Communication Style" hint="This shapes suggested follow-up messages.">
            <RadioGroup
              name="communication_tone"
              options={TONES}
              value={draft.communication_tone}
              onChange={(communication_tone) => set({ communication_tone })}
            />
          </Section>

          <Section title="Typical Purchase Size">
            <RadioGroup name="price_range" options={PRICES} value={draft.price_range} onChange={(price_range) => set({ price_range })} />
          </Section>
        </>
      )}
    </ProfileForm>
  );
}
