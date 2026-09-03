"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface FunnelStage {
  count: number;
  value: number;
  average_time: number;
  pending: number;
  sla_breaches: number;
}

interface DashboardOverview {
  funnel: {
    business_needs: FunnelStage;
    purchase_requisitions: FunnelStage;
    purchase_orders: FunnelStage;
    goods_receipts: FunnelStage;
    invoices: FunnelStage;
    payments: FunnelStage;
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
  const router = useRouter();
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
      route: "/dashboard/business-needs",
      data: funnel?.business_needs,
    },
    {
      number: 2,
      name: "Purchase Requisitions",
      route: "/dashboard/purchase-requisitions",
      data: funnel?.purchase_requisitions,
    },
    {
      number: 3,
      name: "Purchase Orders",
      route: "/dashboard/purchase-orders",
      data: funnel?.purchase_orders,
    },
    {
      number: 4,
      name: "Goods Receipts",
      route: "/dashboard/goods-receipts",
      data: funnel?.goods_receipts,
    },
    {
      number: 5,
      name: "Invoices",
      route: "/dashboard/invoices",
      data: funnel?.invoices,
    },
    {
      number: 6,
      name: "Payments",
      route: "/dashboard/payment-center",
      data: funnel?.payments,
    },
  ];

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
            Procurement Cycle Funnel
          </h1>

          <p className="mt-2 text-on-surface-variant">
            Business Need → Purchase Requisition → Purchase Order
            → Goods Receipt → Invoice → Payment
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

          {stages.map((stage) => (
            <button
              type="button"
              key={stage.name}
              onClick={() => router.push(stage.route)}
              className="w-full text-left rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 transition-all hover:-translate-y-1 hover:shadow-md cursor-pointer"
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
                {stage.data?.count ?? 0}
              </p>

              <div className="mt-5 space-y-2 text-sm">

                <Row
                  label="Count"
                  value={String(stage.data?.count ?? 0)}
                />

                <Row
                  label="Value"
                  value={formatCurrency(stage.data?.value ?? 0)}
                />

                <Row
                  label="Average Time"
                  value={`${stage.data?.average_time ?? 0}`}
                />

                <Row
                  label="Pending"
                  value={String(stage.data?.pending ?? 0)}
                />

                <Row
                  label="SLA Breaches"
                  value={String(stage.data?.sla_breaches ?? 0)}
                />

              </div>

            </button>
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}