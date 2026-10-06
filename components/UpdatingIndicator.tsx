"use client";

import React, { useEffect, useState } from "react";
import { useRefreshing } from "@/lib/hooks";

/** Shown only when a refresh takes longer than this, so fast updates don't flicker. */
const SHOW_AFTER_MS = 400;

/**
 * "Updating..." pill for the top bar: tells the owner the numbers on screen are
 * from their last visit and fresh ones are on the way.
 */
export default function UpdatingIndicator({ className = "" }: { className?: string }) {
  const refreshing = useRefreshing();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!refreshing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hide as soon as the refresh ends
      setVisible(false);
      return;
    }
    const id = window.setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => window.clearTimeout(id);
  }, [refreshing]);

  return (
    <span role="status" aria-live="polite" className={className}>
      {visible && (
        <span className="animate-fade-in inline-flex items-center gap-1.5 rounded-full border border-[#F4C9A4] bg-[#FFF7F0] px-2.5 py-1 text-[11px] font-semibold text-[#C94E00]">
          Updating
          <span className="updating-dots inline-flex gap-[3px]" aria-hidden>
            <span />
            <span />
            <span />
          </span>
        </span>
      )}
    </span>
  );
}
