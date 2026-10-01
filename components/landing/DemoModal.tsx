"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { VIDEO } from "./chapters";

/**
 * Full-screen demo player built on the native <dialog> element:
 * showModal() gives us focus trapping, Escape-to-close and an inert page for free.
 * Focus is returned to whatever opened it.
 */
export default function DemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) {
      returnFocusRef.current = document.activeElement as HTMLElement | null;
      d.showModal();
      document.documentElement.style.overflow = "hidden";
    } else if (!open && d.open) {
      d.close();
    }
    if (!open) {
      document.documentElement.style.overflow = "";
      returnFocusRef.current?.focus?.();
      returnFocusRef.current = null;
    }
  }, [open]);

  useEffect(() => () => void (document.documentElement.style.overflow = ""), []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="demo-title"
      className="demo-dialog"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex h-full w-full items-center justify-center p-3 sm:p-8"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="demo-dialog-panel w-full max-w-[1180px]">
          <div className="mb-3 flex items-center justify-between gap-4 text-white">
            <h2 id="demo-title" className="font-display text-[15px] font-semibold tracking-tight sm:text-lg">
              TENDA in 50 seconds <span className="font-mono text-[12px] font-medium text-[#C9C0B6]">· silent screen recording</span>
            </h2>
            <button
              type="button"
              onClick={onClose}
              autoFocus
              aria-label="Close demo video"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF8C42]"
            >
              <X aria-hidden className="h-5 w-5" />
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl bg-black shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)] ring-1 ring-white/10">
            {open && (
              <video
                className="block aspect-[16/10] w-full max-h-[calc(100dvh-120px)] bg-black object-contain"
                controls
                autoPlay
                muted
                playsInline
                preload="auto"
                poster={VIDEO.poster}
                aria-label="Product tour of the TENDA dashboard: overview, customers, logging a sale, WhatsApp follow-ups, the AI assistant and insights"
              >
                <source src={VIDEO.mp4} type="video/mp4" />
                <source src={VIDEO.webm} type="video/webm" />
                Your browser can’t play this video.
              </video>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}
