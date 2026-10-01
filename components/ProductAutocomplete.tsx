"use client";

import Autocomplete from "@/components/Autocomplete";
import { products } from "@/lib/api";
import { naira } from "@/lib/format";
import type { Product } from "@/lib/types";

export default function ProductAutocomplete({
  id,
  text,
  selected,
  onTextChange,
  onSelect,
}: {
  id?: string;
  text: string;
  selected: Product | null;
  onTextChange: (text: string) => void;
  onSelect: (product: Product) => void;
}) {
  return (
    <Autocomplete<Product>
      id={id}
      value={text}
      selectedKey={selected?.id ?? null}
      placeholder="Search or type a product…"
      onTextChange={onTextChange}
      onSelect={(o) => onSelect(o.value)}
      search={async (q, signal) => {
        const page = await products.list({ q, limit: 5 }, signal);
        return page.items.map((p) => ({ key: p.id, label: p.name, hint: naira(p.price), value: p }));
      }}
    />
  );
}
