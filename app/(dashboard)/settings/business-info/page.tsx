"use client";

import { useState } from "react";
import ProfileForm, { Section } from "../ProfileForm";
import { useCurrentUser } from "@/components/AuthGate";
import { auth } from "@/lib/api";
import { FieldLabel, inputClass } from "@/components/ui";

export default function BusinessInfo() {
  const { user, refreshUser } = useCurrentUser();
  const [ownerName, setOwnerName] = useState(user.full_name ?? "");

  return (
    <ProfileForm
      title="Business Info"
      subtitle="Teach TENDA who you are"
      next={{ href: "/settings/business-intent", label: "Next: your goals" }}
      validate={(d) =>
        (d.business_name ?? "").trim().length > 80 || ownerName.trim().length > 80 ? "Names must be 80 characters or fewer." : null
      }
      extraSave={async () => {
        const name = ownerName.trim() || null;
        if (name !== (user.full_name ?? null)) {
          await auth.updateMe({ full_name: name });
          await refreshUser();
        }
      }}
    >
      {(draft, set) => (
        <Section title="Identity">
          <div>
            <FieldLabel htmlFor="owner">Your name</FieldLabel>
            <input id="owner" value={ownerName} maxLength={80} onChange={(e) => setOwnerName(e.target.value)}
              placeholder="e.g. Amina Bello" className={inputClass} />
          </div>
          <div>
            <FieldLabel htmlFor="bname">Business name</FieldLabel>
            <input id="bname" value={draft.business_name ?? ""} maxLength={80}
              onChange={(e) => set({ business_name: e.target.value || null })}
              placeholder="e.g. Amina Beauty" className={inputClass} />
          </div>
          <div>
            <FieldLabel htmlFor="currency">Currency</FieldLabel>
            <select id="currency" value={draft.currency} onChange={() => set({ currency: "NGN" })} className={inputClass}>
              <option value="NGN">NGN — Nigerian Naira (₦)</option>
            </select>
          </div>
        </Section>
      )}
    </ProfileForm>
  );
}
