"use client";

import Autocomplete from "@/components/Autocomplete";
import { customers } from "@/lib/api";
import { phone } from "@/lib/format";
import type { Customer } from "@/lib/types";

export default function CustomerAutocomplete({
  id,
  text,
  selected,
  onTextChange,
  onSelect,
}: {
  id?: string;
  text: string;
  selected: Customer | null;
  onTextChange: (text: string) => void;
  onSelect: (customer: Customer) => void;
}) {
  return (
    <Autocomplete<Customer>
      id={id}
      value={text}
      selectedKey={selected?.id ?? null}
      placeholder="Search or type a new customer name…"
      onTextChange={onTextChange}
      onSelect={(o) => onSelect(o.value)}
      search={async (q, signal) => {
        const page = await customers.list({ q, limit: 5 }, signal);
        return page.items.map((c) => ({
          key: c.id,
          label: c.name,
          // Disambiguate customers with the same name (README §22 #14).
          hint: phone(c.phone) || c.email || undefined,
          value: c,
        }));
      }}
    />
  );
}
