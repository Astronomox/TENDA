"use client";

import ProfileForm, { RadioGroup, Section } from "../ProfileForm";
import type { CustomerStyle, Goal } from "@/lib/types";

const GOALS: { value: Goal; label: string }[] = [
  { value: "grow_revenue", label: "Grow revenue" },
  { value: "repeat_customers", label: "Get more repeat customers" },
  { value: "move_inventory", label: "Move inventory" },
  { value: "stabilize", label: "Stabilise the business" },
];

const STYLES: { value: CustomerStyle; label: string }[] = [
  { value: "one_time", label: "Mostly one-time buyers" },
  { value: "repeat_heavy", label: "Mostly repeat buyers" },
  { value: "relationship_based", label: "Relationship-based (I know my customers personally)" },
];

export default function BusinessIntent() {
  return (
    <ProfileForm
      title="Business Intent"
      subtitle="What is the main goal for your business?"
      next={{ href: "/settings/business-structure", label: "Next: how you sell" }}
    >
      {(draft, set) => (
        <>
          <Section title="Main goal">
            <RadioGroup name="goal" options={GOALS} value={draft.goal} onChange={(goal) => set({ goal })} />
          </Section>
          <Section title="Customer style">
            <RadioGroup
              name="customer_style"
              options={STYLES}
              value={draft.customer_style}
              onChange={(customer_style) => set({ customer_style })}
            />
          </Section>
        </>
      )}
    </ProfileForm>
  );
}
