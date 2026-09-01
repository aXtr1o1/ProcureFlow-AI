"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DashboardOverview {
  spend: {
    total_po_value: number;
    total_invoice_value: number;
    total_paid_amount: number;
    total_pending_payment: number;
    total_exception_value: number;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function loadSpend(): Promise<DashboardOverview> {
  const token = localStorage.getItem("access_token");

  const response = await fetch(
    `${API_URL}/dashboard/overview`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to load spend analytics: ${response.status}`
    );
  }

  return response.json();
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

  return (
    <main className="min-h-screen bg-surface pt-24 pb-12">
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

          <h2 className="text-xl font-semibold text-on-surface">
            Spend Breakdown
          </h2>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">

            <BreakdownCard
              title="Department"
            />

            <BreakdownCard
              title="Business Unit"
            />

            <BreakdownCard
              title="Category"
            />

            <BreakdownCard
              title="Vendor"
            />

            <BreakdownCard
              title="Location"
            />

            <BreakdownCard
              title="Month"
            />

            <BreakdownCard
              title="Quarter"
            />

            <BreakdownCard
              title="Project"
            />

            <BreakdownCard
              title="Cost Center"
            />

          </div>

          <p className="mt-6 text-sm text-on-surface-variant">
            Detailed breakdowns require grouped analytics
            endpoints from the backend.
          </p>

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
}: {
  title: string;
}) {
  return (
    <div className="rounded-lg bg-surface-container p-5">

      <h3 className="font-semibold text-on-surface">
        Spend by {title}
      </h3>

      <p className="mt-3 text-sm text-on-surface-variant">
        Detailed analytics will be displayed here when
        grouped spend data is available.
      </p>

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