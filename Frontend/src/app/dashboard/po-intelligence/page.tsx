"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DashboardOverview {
  kpis: {
    total_purchase_orders: number;
    total_po_value: number;
  };
  purchase_order_status: Record<string, number>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function getDashboardOverview(): Promise<DashboardOverview> {
  const token = localStorage.getItem("access_token");

  const response = await fetch(`${API_URL}/dashboard/overview`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to load dashboard overview: ${response.status}`
    );
  }

  return response.json();
}

export default function POIntelligencePage() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getDashboardOverview()
      .then(setData)
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load PO intelligence."
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

  const statuses = data?.purchase_order_status ?? {};

  const openPOs =
    (statuses["Created"] ?? 0) +
    (statuses["Pending Approval"] ?? 0) +
    (statuses["Approved"] ?? 0) +
    (statuses["Sent"] ?? 0) +
    (statuses["Vendor Accepted"] ?? 0);

  const pendingApprovals =
    statuses["Pending Approval"] ?? 0;

  const closedPOs =
    statuses["Closed"] ?? 0;

  const cancelledPOs =
    statuses["Cancelled"] ?? 0;

  return (
    <main className="min-h-screen bg-surface pt-6 pb-12">
      <div className="max-w-container-max mx-auto px-margin-desktop">

        <Header />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          <Card
            title="Total POs"
            value={data?.kpis.total_purchase_orders ?? 0}
          />

          <Card
            title="PO Value"
            value={formatCurrency(
              data?.kpis.total_po_value ?? 0
            )}
          />

          <Card
            title="Open POs"
            value={openPOs}
          />

          <Card
            title="Closed POs"
            value={closedPOs}
          />

          <Card
            title="Cancelled POs"
            value={cancelledPOs}
          />

          <Card
            title="Pending Approvals"
            value={pendingApprovals}
          />

          <Card
            title="Average PO Creation Time"
            value="API data required"
          />

          <Card
            title="PO Approval Time"
            value="API data required"
          />

        </div>

        <section className="mt-8 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6">

          <h2 className="text-xl font-semibold text-on-surface">
            Purchase Order Status
          </h2>

          <div className="mt-5 space-y-3">

            {Object.entries(statuses).map(
              ([status, count]) => (
                <div
                  key={status}
                  className="flex justify-between border-b border-outline-variant/10 pb-3"
                >
                  <span>{status}</span>

                  <span className="font-semibold text-primary">
                    {count}
                  </span>
                </div>
              )
            )}

          </div>

        </section>

        <section className="mt-6 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6">

          <h2 className="text-xl font-semibold text-on-surface">
            PO Analytics
          </h2>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">

            <Info
              label="PO-to-Invoice Conversion"
              value="Additional API data required"
            />

            <Info
              label="PO Aging"
              value="Additional API data required"
            />

            <Info
              label="PO Value by Department"
              value="Additional API data required"
            />

            <Info
              label="PO Value by Vendor"
              value="Additional API data required"
            />

          </div>

        </section>

      </div>
    </main>
  );
}

function Header() {
  return (
    <div className="mb-8">
      <Link
        href="/dashboard"
        className="text-sm text-primary hover:underline"
      >
        ← Dashboard
      </Link>

      <h1 className="mt-4 text-3xl font-bold text-on-surface">
        PO Intelligence
      </h1>

      <p className="mt-2 text-on-surface-variant">
        Purchase order performance and lifecycle insights.
      </p>
    </div>
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

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-surface-container p-4">
      <p className="text-sm text-on-surface-variant">
        {label}
      </p>

      <p className="mt-2 font-semibold text-on-surface">
        {value}
      </p>
    </div>
  );
}

function Loading() {
  return (
    <main className="min-h-screen bg-surface pt-24">
      <div className="max-w-container-max mx-auto px-margin-desktop">
        Loading PO intelligence...
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