"use client";

/**
 * In-app confirmation dialog — replaces the browser's window.confirm() box.
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "Delete this sale?", message: "…", confirmLabel: "Delete" }))) return;
 *
 * A bottom sheet on phones, a centred card on larger screens. Escape, the
 * backdrop and Cancel all resolve false.
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";

export interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" (default) for deletes; "default" for harmless confirmations. */
  tone?: "danger" | "default";
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

export function useConfirm(): Confirm {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx;
}

interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback<Confirm>(
    (options) =>
      new Promise<boolean>((resolve) => {
        setPending((prev) => {
          prev?.resolve(false); // a new question replaces an unanswered one
          return { ...options, resolve };
        });
      }),
    []
  );

  const answer = useCallback((ok: boolean) => {
    setPending((prev) => {
      prev?.resolve(ok);
      return null;
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && <Dialog key="confirm" {...pending} onAnswer={answer} />}
    </ConfirmContext.Provider>
  );
}

function Dialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  onAnswer,
}: ConfirmOptions & { onAnswer: (ok: boolean) => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const danger = tone === "danger";

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    // Safer default for destructive actions: focus Cancel.
    (danger ? cancelRef : confirmRef).current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onAnswer(false);
      } else if (e.key === "Tab") {
        // keep focus inside the two buttons
        const order = [cancelRef.current, confirmRef.current].filter(Boolean) as HTMLElement[];
        const i = order.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        order[(i + (e.shiftKey ? order.length - 1 : 1)) % order.length]?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [danger, onAnswer]);

  const Icon = danger ? AlertTriangle : HelpCircle;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-[#1A0A00]/45 backdrop-blur-[2px] animate-fade-in"
        onClick={() => onAnswer(false)}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={message ? "confirm-message" : undefined}
        className="animate-sheet-up sm:animate-rise-in relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-2xl shadow-[0_-8px_40px_rgba(26,10,0,0.18)] sm:shadow-[0_20px_60px_rgba(26,10,0,0.25)] px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#E8E8E4] sm:hidden" aria-hidden />
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              danger ? "bg-red-50 text-[#DC2626]" : "bg-[#FFF0E6] text-[#E85D04]"
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0 pt-1">
            <h2 id="confirm-title" className="text-base font-bold text-[#1A1A1A] leading-snug">
              {title}
            </h2>
            {message && (
              <p id="confirm-message" className="mt-1.5 text-sm text-[#4A5568] leading-relaxed">
                {message}
              </p>
            )}
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => onAnswer(false)}
            className="h-12 sm:h-10 px-5 rounded-xl border border-[#E8E8E4] bg-white text-sm font-semibold text-[#4A5568] hover:bg-[#FAFAF8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E85D04]/30"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => onAnswer(true)}
            className={`h-12 sm:h-10 px-5 rounded-xl text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 ${
              danger
                ? "bg-[#DC2626] hover:bg-[#B91C1C] focus-visible:ring-red-300"
                : "bg-[#E85D04] hover:bg-[#FF8C42] focus-visible:ring-[#E85D04]/30"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
