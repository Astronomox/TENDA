"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, UserX } from "lucide-react";
import CustomerSnapshot from "../components/CustomerSnapshot";
import RevenueChart from "../components/RevenueChart";
import CustomerTopProducts from "../components/CustomerTopProducts";
import RecentActivity from "../components/RecentActivityFeed";
import QuickActions from "../components/QuickActions";
import EditCustomerForm from "../components/EditCustomerForm";
import { ApiError, customers } from "@/lib/api";
import { invalidate, useResource } from "@/lib/hooks";
import { EmptyState, ErrorState, PendingBackend, Skeleton } from "@/components/ui";

export default function IndividualCustomer() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const router = useRouter();
  const res = useResource(`customers:detail:${id}`, () => customers.get(id));
  const [editing, setEditing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleDelete() {
    if (!res.data) return;
    if (!window.confirm(`Delete ${res.data.name}? Their past sales will still count in your totals.`)) return;
    setActionError(null);
    try {
      await customers.remove(id);
      invalidate("customers:");
      invalidate("analytics:");
      invalidate("followups:");
      router.replace("/customers");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't delete this customer.");
    }
  }

  const back = (
    <Link href="/customers" className="flex items-center gap-1 text-sm font-medium text-[#4A5568] hover:text-[#1A1A1A] transition-colors w-fit">
      <ChevronLeft className="w-4 h-4" /> Back to customers
    </Link>
  );

  if (!res.data) {
    return (
      <div className="flex flex-col w-full px-4 py-6 lg:px-0 lg:py-0 space-y-5">
        {back}
        {res.notImplemented ? (
          <PendingBackend feature="Customer profiles" endpoint="GET /customers/{id}" />
        ) : res.error instanceof ApiError && res.error.status === 404 ? (
          <EmptyState icon={UserX} title="Customer not found" body="They may have been deleted." />
        ) : res.error ? (
          <ErrorState error={res.error} onRetry={() => void res.reload()} />
        ) : (
          <>
            <Skeleton className="h-36" />
            <Skeleton className="h-40" />
            <Skeleton className="h-32" />
          </>
        )}
      </div>
    );
  }

  const c = res.data;

  return (
    <div className="flex flex-col w-full min-h-full px-4 py-6 lg:px-0 lg:py-0 space-y-5">
      {back}

      <CustomerSnapshot customer={c} />

      {actionError && <ErrorState error={actionError} compact />}

      {editing && (
        <EditCustomerForm
          customer={c}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            invalidate("customers:list");
            void res.reload();
          }}
        />
      )}

      <div className="lg:grid lg:grid-cols-3 lg:gap-6 space-y-5 lg:space-y-0">
        <div className="lg:col-span-2 space-y-5">
          <RevenueChart months={c.revenue_by_month} />
          <CustomerTopProducts products={c.top_products} />
          <RecentActivity items={c.recent_activity} />
        </div>
        <div className="lg:col-span-1">
          <QuickActions customer={c} onEdit={() => setEditing(true)} onDelete={() => void handleDelete()} />
        </div>
      </div>
    </div>
  );
}
