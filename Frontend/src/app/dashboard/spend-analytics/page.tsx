"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getDashboardOverview,
  type DashboardOverview,
} from "@/services/api";


async function loadSpend(): Promise<DashboardOverview> {
  return getDashboardOverview();
}

export default function SpendAnalyticsPage() {
  const [data, setData] =
    useState<DashboardOverview | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadSpend()
      .then(setData)
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load spend analytics."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  const spend = data?.spend;
  const analytics = data?.spend_analytics;

  return (
    <main className="min-h-screen bg-surface pt-6 pb-12">
      <div className="max-w-container-max mx-auto px-margin-desktop">

        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm text-primary hover:underline"
          >
            ← Dashboard
          </Link>

          <h1 className="mt-4 text-3xl font-bold text-on-surface">
            Spend Analytics
          </h1>

          <p className="mt-2 text-on-surface-variant">
            Procurement spend, invoice value and payment analytics.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

          <Card
            title="Total PO Value"
            value={formatCurrency(
              spend?.total_po_value ?? 0
            )}
          />

          <Card
            title="Total Invoice Value"
            value={formatCurrency(
              spend?.total_invoice_value ?? 0
            )}
          />

          <Card
            title="Paid Amount"
            value={formatCurrency(
              spend?.total_paid_amount ?? 0
            )}
          />

          <Card
            title="Pending Payment"
            value={formatCurrency(
              spend?.total_pending_payment ?? 0
            )}
          />

          <Card
            title="Exception Value"
            value={formatCurrency(
              spend?.total_exception_value ?? 0
            )}
          />

        </div>

        <section className="mt-8 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6">

          <div className="mb-5">
            <h2 className="text-xl font-semibold text-on-surface">
              Spend Breakdown
            </h2>

            <p className="mt-1 text-sm text-on-surface-variant">
              Procurement spend across key business dimensions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            <BreakdownCard
              title="Department"
              data={analytics?.by_department ?? {}}
            />

            <BreakdownCard
              title="Business Unit"
              data={analytics?.by_business_unit ?? {}}
            />

            <BreakdownCard
              title="Category"
              data={analytics?.by_category ?? {}}
            />

            <BreakdownCard
              title="Vendor"
              data={analytics?.by_vendor ?? {}}
            />

            <BreakdownCard
              title="Location"
              data={analytics?.by_location ?? {}}
            />

            <BreakdownCard
              title="Month"
              data={analytics?.by_month ?? {}}
            />

            <BreakdownCard
              title="Quarter"
              data={analytics?.by_quarter ?? {}}
            />

            <BreakdownCard
              title="Project"
              data={analytics?.by_project ?? {}}
            />

            <BreakdownCard
              title="Cost Center"
              data={analytics?.by_cost_center ?? {}}
            />

          </div>

        </section>

      </div>
    </main>
  );
}

function Card({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5">
      <p className="text-sm text-on-surface-variant">
        {title}
      </p>

      <p className="mt-2 text-2xl font-semibold text-primary">
        {value}
      </p>
    </div>
  );
}

function BreakdownCard({
  title,
  data,
}: {
  title: string;
  data: Record<string, number>;
}) {
  const entries = Object.entries(data);

  return (
    <div className="rounded-lg border border-outline-variant/20 bg-surface-container p-5">

      <h3 className="font-semibold text-on-surface">
        Spend by {title}
      </h3>

      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-on-surface-variant">
          No data available.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {entries.map(([name, value]) => (
            <div
              key={name}
              className="flex items-center justify-between gap-4"
            >
              <span className="truncate text-sm text-on-surface-variant">
                {name}
              </span>

              <span className="shrink-0 font-semibold text-on-surface">
                {formatCurrency(value)}
              </span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

function Loading() {
  return (
    <main className="min-h-screen bg-surface pt-24">
      <div className="max-w-container-max mx-auto px-margin-desktop">
        Loading spend analytics...
      </div>
    </main>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-surface pt-24">
      <div className="max-w-container-max mx-auto px-margin-desktop">
        <p className="text-red-600">{message}</p>
      </div>
    </main>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}