"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface POIntelligence {
  total_pos: number;
  po_value: number;
  open_pos: number;
  closed_pos: number;
  cancelled_pos: number;
  pending_approvals: number;
  average_po_creation_time: number;
  average_po_approval_time: number;
  po_to_invoice_conversion_ratio: number;
  average_po_aging: number;
  po_value_by_department: Record<string, number>;
  po_value_by_vendor: Record<string, number>;
}

interface DashboardOverview {
  po_intelligence: POIntelligence;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function getDashboardOverview(): Promise<DashboardOverview> {
  const token = localStorage.getItem("access_token");

  if (!token) {
    throw new Error("Authentication token not found.");
  }

  const response = await fetch(`${API_URL}/dashboard/overview`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
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

  const po = data?.po_intelligence;

  if (!po) {
    return (
      <ErrorState message="PO Intelligence data is not available." />
    );
  }

  return (
    <main className="min-h-screen bg-surface pt-6 pb-12">
      <div className="max-w-container-max mx-auto px-margin-desktop">
        <Header />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card
            title="Total POs"
            value={po.total_pos}
          />

          <Card
            title="PO Value"
            value={formatCurrency(po.po_value)}
          />

          <Card
            title="Open POs"
            value={po.open_pos}
          />

          <Card
            title="Closed POs"
            value={po.closed_pos}
          />

          <Card
            title="Cancelled POs"
            value={po.cancelled_pos}
          />

          <Card
            title="Pending Approvals"
            value={po.pending_approvals}
          />

          <Card
            title="Average PO Creation Time"
            value={formatDuration(po.average_po_creation_time)}
          />

          <Card
            title="Average PO Approval Time"
            value={formatDuration(po.average_po_approval_time)}
          />
        </div>

        <section className="mt-8 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6">
          <h2 className="text-xl font-semibold text-on-surface">
            PO Analytics
          </h2>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Info
              label="PO-to-Invoice Conversion"
              value={`${po.po_to_invoice_conversion_ratio.toFixed(2)}%`}
            />

            <Info
              label="Average PO Aging"
              value={formatDuration(po.average_po_aging)}
            />
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6">
          <h2 className="text-xl font-semibold text-on-surface">
            PO Value by Department
          </h2>

          <div className="mt-5 space-y-3">
            {Object.entries(po.po_value_by_department).length === 0 ? (
              <p className="text-on-surface-variant">
                No department data available.
              </p>
            ) : (
              Object.entries(po.po_value_by_department).map(
                ([department, value]) => (
                  <div
                    key={department}
                    className="flex justify-between border-b border-outline-variant/10 pb-3"
                  >
                    <span>{department}</span>

                    <span className="font-semibold text-primary">
                      {formatCurrency(value)}
                    </span>
                  </div>
                )
              )
            )}
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6">
          <h2 className="text-xl font-semibold text-on-surface">
            PO Value by Vendor
          </h2>

          <div className="mt-5 space-y-3">
            {Object.entries(po.po_value_by_vendor).length === 0 ? (
              <p className="text-on-surface-variant">
                No vendor data available.
              </p>
            ) : (
              Object.entries(po.po_value_by_vendor).map(
                ([vendor, value]) => (
                  <div
                    key={vendor}
                    className="flex justify-between border-b border-outline-variant/10 pb-3"
                  >
                    <span>{vendor}</span>

                    <span className="font-semibold text-primary">
                      {formatCurrency(value)}
                    </span>
                  </div>
                )
              )
            )}
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

function formatDuration(seconds: number) {
  if (!seconds || seconds < 0) {
    return "0 days";
  }

  const days = seconds / 86400;

  if (days >= 1) {
    return `${days.toFixed(2)} days`;
  }

  const hours = seconds / 3600;

  if (hours >= 1) {
    return `${hours.toFixed(2)} hours`;
  }

  const minutes = seconds / 60;
  return `${minutes.toFixed(2)} minutes`;
}