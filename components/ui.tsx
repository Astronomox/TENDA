"use client";

import React from "react";
import { AlertTriangle, Loader2, RefreshCw, ServerCog } from "lucide-react";
import type { ApiError } from "@/lib/api";

export function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return <Loader2 className={`${className} animate-spin`} aria-hidden />;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-[#F0F0EC] ${className}`} />;
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16" />
      ))}
    </div>
  );
}

/** Shown when the backend hasn't built this endpoint yet (404 Not Found). */
export function PendingBackend({ feature, endpoint }: { feature: string; endpoint: string }) {
  return (
    <div className="bg-white border border-dashed border-[#E8E8E4] rounded-2xl p-5 text-center">
      <div className="mx-auto mb-3 w-10 h-10 rounded-full bg-[#FFF0E6] flex items-center justify-center">
        <ServerCog className="w-5 h-5 text-[#E85D04]" />
      </div>
      <p className="text-sm font-semibold text-[#1A1A1A]">{feature} is coming soon</p>
      <p className="text-xs text-[#718096] mt-1 leading-relaxed">
        The TENDA server doesn&apos;t support this yet.
        <br />
        <span className="font-mono text-[10px] text-[#A0AEC0]">{endpoint}</span>
      </p>
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  compact,
}: {
  error: ApiError | Error | string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  const message = typeof error === "string" ? error : error.message;
  return (
    <div
      role="alert"
      className={`bg-red-50 border border-red-200 rounded-2xl ${compact ? "px-4 py-3" : "p-5"} flex items-start gap-3`}
    >
      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-red-700 leading-relaxed">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:underline"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Try again
          </button>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: React.ElementType;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      <div className="p-4 bg-[#FFF0E6] rounded-full mb-4">
        <Icon className="w-7 h-7 text-[#E85D04]" />
      </div>
      <p className="text-[#1A1A1A] font-semibold">{title}</p>
      {body && <p className="text-sm text-[#718096] mt-1 max-w-xs leading-relaxed">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/**
 * Renders the standard loading / pending-backend / error states for a resource,
 * or its children once data is available.
 */
export function ResourceView<T>({
  resource,
  feature,
  endpoint,
  loading,
  children,
}: {
  resource: { data: T | undefined; error: ApiError | null; loading: boolean; notImplemented: boolean; reload: () => void };
  feature: string;
  endpoint: string;
  loading?: React.ReactNode;
  children: (data: T) => React.ReactNode;
}) {
  if (resource.data !== undefined) return <>{children(resource.data)}</>;
  if (resource.notImplemented) return <PendingBackend feature={feature} endpoint={endpoint} />;
  if (resource.error) return <ErrorState error={resource.error} onRetry={resource.reload} />;
  return <>{loading ?? <SkeletonList />}</>;
}

export const inputClass =
  "w-full h-12 bg-white border border-[#E8E8E4] rounded-xl px-4 text-[#1A1A1A] placeholder:text-[#A0AEC0] focus:outline-none focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/10 transition disabled:bg-[#FAFAF8] disabled:text-[#A0AEC0]";

export const primaryButtonClass =
  "bg-[#E85D04] hover:bg-[#FF8C42] active:scale-95 disabled:opacity-60 disabled:active:scale-100 text-white font-semibold rounded-xl h-14 w-full transition-all shadow-[0_4px_20px_rgba(232,93,4,0.25)] flex items-center justify-center gap-2";

export function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-[#4A5568] mb-1.5 block">
      {children}
    </label>
  );
}

export function Notice({ tone = "success", children }: { tone?: "success" | "info"; children: React.ReactNode }) {
  const cls =
    tone === "success"
      ? "bg-green-50 border-green-200 text-green-700"
      : "bg-[#FFF7F0] border-[#F4C9A4] text-[#C94E00]";
  return <div className={`border rounded-xl px-4 py-3 text-sm ${cls}`}>{children}</div>;
}
