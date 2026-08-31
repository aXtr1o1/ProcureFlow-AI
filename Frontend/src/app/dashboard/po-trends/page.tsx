"use client";

import Link from "next/link";

export default function POTrendsPage() {
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
            />

            <TrendCard
              title="Invoice Value"
              description="Track invoice value over time."
            />

            <TrendCard
              title="Payment Value"
              description="Track payment value over time."
            />

            <TrendCard
              title="Number of POs"
              description="Track purchase order volume."
            />

            <TrendCard
              title="Number of Invoices"
              description="Track invoice volume."
            />

            <TrendCard
              title="Exceptions"
              description="Track invoice exceptions over time."
            />

            <TrendCard
              title="Savings"
              description="Track negotiation and price variance savings."
            />

          </div>

        </section>

        <section className="mt-6 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6">

          <h2 className="text-xl font-semibold text-on-surface">
            Time Series Chart
          </h2>

          <div className="mt-5 h-80 rounded-lg bg-surface-container flex items-center justify-center">

            <div className="text-center">

              <span className="material-symbols-outlined text-4xl text-primary">
                monitoring
              </span>

              <p className="mt-3 font-semibold text-on-surface">
                Trend chart
              </p>

              <p className="mt-2 text-sm text-on-surface-variant">
                Historical time-series API data is required
                to render the chart.
              </p>

            </div>

          </div>

        </section>

      </div>
    </main>
  );
}

function TrendCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-outline-variant/20 bg-surface-container p-5">

      <h3 className="font-semibold text-on-surface">
        {title}
      </h3>

      <p className="mt-2 text-sm text-on-surface-variant">
        {description}
      </p>

      <div className="mt-5 h-24 rounded-md bg-surface-container-lowest flex items-center justify-center">
        <span className="text-sm text-on-surface-variant">
          Analytics API required
        </span>
      </div>

    </div>
  );
}