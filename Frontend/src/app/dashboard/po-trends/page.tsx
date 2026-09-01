"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getDashboardOverview,
  type DashboardOverview,
} from "@/services/api";

export default function POTrendsPage() {

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
            : "Failed to load PO trends."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-surface pt-6 pb-12">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          Loading PO trends...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-surface pt-24 pb-12">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          <p className="text-red-600">{error}</p>
        </div>
      </main>
    );
  }

  const trends = data?.po_trends?.trends ?? [];

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
            PO Trend Analytics
          </h1>

          <p className="mt-2 text-on-surface-variant">
            Track procurement activity and financial trends over time.
          </p>
        </div>

        <section className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6">

          <h2 className="text-xl font-semibold text-on-surface">
            Procurement Trends
          </h2>

          <p className="mt-2 text-sm text-on-surface-variant">
            Time-series analytics for PO value, invoice value,
            payments, PO count, invoice count, exceptions and savings.
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">

            <TrendCard
              title="PO Value"
              description="Track purchase order value over time."
              value={trends.reduce((sum, item) => sum + item.po_value, 0)}
            />

            <TrendCard
              title="Invoice Value"
              description="Track invoice value over time."
              value={trends.reduce(
                (sum, item) => sum + item.invoice_value,
                0
              )}
            />

            <TrendCard
              title="Payment Value"
              description="Track payment value over time."
              value={trends.reduce(
                (sum, item) => sum + item.payment_value,
                0
              )}
            />

            <TrendCard
              title="Number of POs"
              description="Track purchase order volume."
              value={trends.reduce(
                (sum, item) => sum + item.number_of_pos,
                0
              )}
              currency={false}
            />

            <TrendCard
              title="Number of Invoices"
              description="Track invoice volume."
              value={trends.reduce(
                (sum, item) => sum + item.number_of_invoices,
                0
              )}
              currency={false}
            />

            <TrendCard
              title="Exceptions"
              description="Track invoice exceptions over time."
              value={trends.reduce(
                (sum, item) => sum + item.exceptions,
                0
              )}
              currency={false}
            />

            <TrendCard
              title="Savings"
              description="Track negotiation and price variance savings."
              value={trends.reduce(
                (sum, item) => sum + item.savings,
                0
              )}
            />

          </div>

        </section>

        <section className="mt-6 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6">

          <h2 className="text-xl font-semibold text-on-surface">
            Time Series Chart
          </h2>

          {trends.length === 0 ? (
            <div className="mt-5 h-80 rounded-lg bg-surface-container flex items-center justify-center">
              <div className="text-center">

                <span className="material-symbols-outlined text-4xl text-primary">
                  monitoring
                </span>

                <p className="mt-3 font-semibold text-on-surface">
                  No trend data available
                </p>

                <p className="mt-2 text-sm text-on-surface-variant">
                  Historical procurement data is not available yet.
                </p>

              </div>
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">

              <table className="w-full text-left">

                <thead>
                  <tr className="border-b border-outline-variant/20">

                    <th className="p-3 text-sm text-on-surface-variant">
                      Period
                    </th>

                    <th className="p-3 text-sm text-on-surface-variant">
                      PO Value
                    </th>

                    <th className="p-3 text-sm text-on-surface-variant">
                      Invoice Value
                    </th>

                    <th className="p-3 text-sm text-on-surface-variant">
                      Payment Value
                    </th>

                    <th className="p-3 text-sm text-on-surface-variant">
                      POs
                    </th>

                    <th className="p-3 text-sm text-on-surface-variant">
                      Invoices
                    </th>

                    <th className="p-3 text-sm text-on-surface-variant">
                      Exceptions
                    </th>

                    <th className="p-3 text-sm text-on-surface-variant">
                      Savings
                    </th>

                  </tr>
                </thead>

                <tbody>
                  {trends.map((item) => (
                    <tr
                      key={item.period}
                      className="border-b border-outline-variant/10"
                    >

                      <td className="p-3 font-medium text-on-surface">
                        {item.period}
                      </td>

                      <td className="p-3">
                        {formatCurrency(item.po_value)}
                      </td>

                      <td className="p-3">
                        {formatCurrency(item.invoice_value)}
                      </td>

                      <td className="p-3">
                        {formatCurrency(item.payment_value)}
                      </td>

                      <td className="p-3">
                        {item.number_of_pos.toLocaleString()}
                      </td>

                      <td className="p-3">
                        {item.number_of_invoices.toLocaleString()}
                      </td>

                      <td className="p-3">
                        {item.exceptions.toLocaleString()}
                      </td>

                      <td className="p-3">
                        {formatCurrency(item.savings)}
                      </td>

                    </tr>
                  ))}
                </tbody>

              </table>

            </div>
          )}

        </section>

      </div>
    </main>
  );
}

function TrendCard({
  title,
  description,
  value,
  currency = true,
}: {
  title: string;
  description: string;
  value: number;
  currency?: boolean;
}) {
  return (
    <div className="rounded-lg border border-outline-variant/20 bg-surface-container p-5">

      <h3 className="font-semibold text-on-surface">
        {title}
      </h3>

      <p className="mt-2 text-sm text-on-surface-variant">
        {description}
      </p>

      <div className="mt-5 rounded-md bg-surface-container-lowest p-4">
        <p className="text-2xl font-bold text-primary">
          {currency ? formatCurrency(value) : value.toLocaleString()}
        </p>
      </div>

    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}