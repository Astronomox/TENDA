"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { useDebounced } from "@/lib/hooks";
import { inputClass } from "@/components/ui";

export interface Option<T> {
  key: string;
  label: string;
  hint?: string;
  value: T;
}

/**
 * Search-as-you-type input backed by the API. The typed text is always kept
 * (free text is allowed); picking an option links the record.
 */
export default function Autocomplete<T>({
  id,
  value,
  onTextChange,
  onSelect,
  search,
  placeholder,
  selectedKey,
}: {
  id?: string;
  value: string;
  onTextChange: (text: string) => void;
  onSelect: (option: Option<T>) => void;
  search: (q: string, signal: AbortSignal) => Promise<Option<T>[]>;
  placeholder?: string;
  selectedKey?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Option<T>[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(-1);
  const q = useDebounced(value.trim(), 250);
  const searchRef = useRef(search);
  const boxRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    searchRef.current = search;
  });

  useEffect(() => {
    if (!q || !open) return;
    const ctrl = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- start of an async search
    setLoading(true);
    setFailed(false);
    searchRef.current(q, ctrl.signal)
      .then((r) => {
        setResults(r);
        setActive(-1);
      })
      .catch(() => {
        if (!ctrl.signal.aborted) {
          setResults([]);
          setFailed(true);
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [q, open]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function pick(option: Option<T>) {
    onSelect(option);
    setOpen(false);
    setResults([]);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      pick(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && !!q && (loading || results.length > 0 || failed);

  return (
    <div className="relative w-full" ref={boxRef}>
      <input
        id={id}
        value={value}
        onChange={(e) => {
          onTextChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        className={`${inputClass} ${selectedKey ? "border-[#16A34A]" : ""}`}
      />

      {showList && (
        <div
          id={listId}
          role="listbox"
          className="absolute z-20 bg-white border border-[#E8E8E4] w-full mt-1 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden"
        >
          {loading && results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[#A0AEC0]">Searching…</div>
          ) : failed ? (
            <div className="px-4 py-3 text-sm text-[#A0AEC0]">Search isn&apos;t available right now — you can still type a name.</div>
          ) : (
            results.map((r, i) => (
              <div
                key={r.key}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(r)}
                className={`px-4 py-3 cursor-pointer transition-colors ${i === active ? "bg-[#FFF0E6]" : "hover:bg-[#FFF0E6]"}`}
              >
                <div className="text-sm font-medium text-[#1A1A1A]">{r.label}</div>
                {r.hint && <div className="text-xs text-[#4A5568] font-mono">{r.hint}</div>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
