"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DashboardOverview {
  kpis: {
    total_invoices: number;
    total_exceptions: number;
    total_invoice_value: number;
  };
  invoice_status: Record<string, number>;
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

export default function InvoiceIntelligencePage() {
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
            : "Failed to load invoice intelligence."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <PageLoading title="Invoice Intelligence" />;
  }

  if (error) {
    return <PageError error={error} />;
  }

  const statuses = data?.invoice_status ?? {};
  const totalInvoices = data?.kpis.total_invoices ?? 0;

  const duplicateInvoices =
    statuses["Duplicate"] ??
    statuses["Duplicate Invoice"] ??
    0;

  const extractionFailed =
    statuses["Extraction Failed"] ??
    statuses["Failed"] ??
    0;

  const pendingInvoices =
    statuses["Pending"] ??
    statuses["Pending Review"] ??
    statuses["Pending Approval"] ??
    0;

  const approvedInvoices =
    statuses["Approved"] ??
    statuses["Processed"] ??
    0;

  const exceptionCount =
    data?.kpis.total_exceptions ?? 0;

  return (
    <main className="min-h-screen bg-surface pt-24 pb-12">
      <div className="max-w-container-max mx-auto px-margin-desktop">

        <PageHeader
          title="Invoice Intelligence"
          description="Insights into invoice processing, extraction and exceptions."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          <MetricCard
            title="Total Invoices Received"
            value={totalInvoices}
          />

          <MetricCard
            title="Successfully Processed"
            value={approvedInvoices}
          />

          <MetricCard
            title="Extraction Failed"
            value={extractionFailed}
          />

          <MetricCard
            title="Duplicate Invoices"
            value={duplicateInvoices}
          />

          <MetricCard
            title="Pending Invoices"
            value={pendingInvoices}
          />

          <MetricCard
            title="Open Exceptions"
            value={exceptionCount}
          />

          <MetricCard
            title="Invoice Value"
            value={formatCurrency(
              data?.kpis.total_invoice_value ?? 0
            )}
          />

          <MetricCard
            title="PO-Linked / Non-PO"
            value="API data required"
          />

        </div>

        <section className="mt-8 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6">

          <h2 className="text-xl font-semibold text-on-surface">
            Invoice Status
          </h2>

          <div className="mt-5 space-y-3">
            {Object.entries(statuses).map(
              ([status, count]) => (
                <div
                  key={status}
                  className="flex items-center justify-between border-b border-outline-variant/10 pb-3"
                >
                  <span className="text-on-surface">
                    {status}
                  </span>

                  <span className="font-semibold text-primary">
                    {count}
                  </span>
                </div>
              )
            )}

            {Object.keys(statuses).length === 0 && (
              <p className="text-on-surface-variant">
                No invoice status data available.
              </p>
            )}
          </div>

        </section>

        <section className="mt-6 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6">

          <h2 className="text-xl font-semibold text-on-surface">
            Additional Invoice Analytics
          </h2>

          <p className="mt-2 text-sm text-on-surface-variant">
            Extraction confidence, missing fields, PO matching,
            processing time and manual review time require
            additional backend analytics fields.
          </p>

        </section>

      </div>
    </main>
  );
}

function MetricCard({
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

function PageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-8">
      <Link
        href="/dashboard"
        className="text-sm text-primary hover:underline"
      >
        ← Dashboard
      </Link>

      <h1 className="mt-4 text-3xl font-bold text-on-surface">
        {title}
      </h1>

      <p className="mt-2 text-on-surface-variant">
        {description}
      </p>
    </div>
  );
}

function PageLoading({ title }: { title: string }) {
  return (
    <main className="min-h-screen bg-surface pt-24">
      <div className="max-w-container-max mx-auto px-margin-desktop">
        <h1 className="text-3xl font-bold text-on-surface">
          {title}
        </h1>

        <p className="mt-4 text-on-surface-variant">
          Loading...
        </p>
      </div>
    </main>
  );
}

function PageError({ error }: { error: string }) {
  return (
    <main className="min-h-screen bg-surface pt-24">
      <div className="max-w-container-max mx-auto px-margin-desktop">
        <div className="rounded-xl border border-red-300 bg-surface-container-lowest p-6">
          <h1 className="text-xl font-semibold text-red-600">
            Unable to load dashboard
          </h1>

          <p className="mt-2 text-on-surface-variant">
            {error}
          </p>
        </div>
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