"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DashboardOverview {
  funnel: {
    business_needs: number;
    purchase_requisitions: number;
    purchase_orders: number;
    goods_receipts: number;
    invoices: number;
    payments: number;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function loadFunnel(): Promise<DashboardOverview> {
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
      `Failed to load procurement funnel: ${response.status}`
    );
  }

  return response.json();
}

export default function ProcurementFunnelPage() {
  const [data, setData] =
    useState<DashboardOverview | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadFunnel()
      .then(setData)
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load funnel."
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

  const funnel = data?.funnel;

  const stages = [
    {
      number: 1,
      name: "Business Needs",
      count: funnel?.business_needs ?? 0,
    },
    {
      number: 2,
      name: "Purchase Requisitions",
      count: funnel?.purchase_requisitions ?? 0,
    },
    {
      number: 3,
      name: "Purchase Orders",
      count: funnel?.purchase_orders ?? 0,
    },
    {
      number: 4,
      name: "Goods Receipts",
      count: funnel?.goods_receipts ?? 0,
    },
    {
      number: 5,
      name: "Invoices",
      count: funnel?.invoices ?? 0,
    },
    {
      number: 6,
      name: "Payments",
      count: funnel?.payments ?? 0,
    },
  ];

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
            Procurement Cycle Funnel
          </h1>

          <p className="mt-2 text-on-surface-variant">
            Business Need → Purchase Requisition → Purchase Order
            → Goods Receipt → Invoice → Payment
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

          {stages.map((stage) => (
            <div
              key={stage.name}
              className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6"
            >

              <div className="flex items-center justify-between">

                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                  {stage.number}
                </span>

                {stage.number < stages.length && (
                  <span className="text-on-surface-variant">
                    →
                  </span>
                )}

              </div>

              <h2 className="mt-5 text-lg font-semibold text-on-surface">
                {stage.name}
              </h2>

              <p className="mt-2 text-3xl font-bold text-primary">
                {stage.count}
              </p>

              <div className="mt-5 space-y-2 text-sm">

                <Row
                  label="Count"
                  value={String(stage.count)}
                />

                <Row
                  label="Value"
                  value="API data required"
                />

                <Row
                  label="Average Time"
                  value="API data required"
                />

                <Row
                  label="Pending"
                  value="API data required"
                />

                <Row
                  label="SLA Breaches"
                  value="API data required"
                />

              </div>

            </div>
          ))}

        </div>

      </div>
    </main>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between border-b border-outline-variant/10 pb-2">
      <span className="text-on-surface-variant">
        {label}
      </span>

      <span className="font-medium text-on-surface">
        {value}
      </span>
    </div>
  );
}

function Loading() {
  return (
    <main className="min-h-screen bg-surface pt-24">
      <div className="max-w-container-max mx-auto px-margin-desktop">
        Loading procurement funnel...
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