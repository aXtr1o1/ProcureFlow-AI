"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getDashboardOverview,
  type DashboardOverview,
} from "@/services/api";

export default function VendorIntelligencePage() {
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
            : "Failed to load vendor analytics."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-surface pt-24 pb-12">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          Loading vendor intelligence...
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

  const vendorData = data?.vendor_intelligence;

  const vendors = vendorData?.vendors ?? [];
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
            Vendor Intelligence
          </h1>

          <p className="mt-2 text-on-surface-variant">
            Vendor performance, spend and procurement compliance analytics.
          </p>
        </div>

        <section className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6">

          <h2 className="text-xl font-semibold text-on-surface">
            Vendor Performance
          </h2>

          <div className="mt-5 overflow-x-auto">

            <table className="w-full text-left">

              <thead>
                <tr className="border-b border-outline-variant/20">

                  <th className="p-3 text-sm text-on-surface-variant">
                    Vendor Name
                  </th>

                  <th className="p-3 text-sm text-on-surface-variant">
                    Overall Score
                  </th>

                  <th className="p-3 text-sm text-on-surface-variant">
                    On-Time Delivery
                  </th>

                  <th className="p-3 text-sm text-on-surface-variant">
                    Invoice Accuracy
                  </th>

                  <th className="p-3 text-sm text-on-surface-variant">
                    PO Compliance
                  </th>

                  <th className="p-3 text-sm text-on-surface-variant">
                    Price Variance
                  </th>

                  <th className="p-3 text-sm text-on-surface-variant">
                    Exception Rate
                  </th>

                  <th className="p-3 text-sm text-on-surface-variant">
                    Payment Dispute
                  </th>

                </tr>
              </thead>

              <tbody>
                {vendors.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-8 text-center text-on-surface-variant"
                    >
                      No vendor data available.
                    </td>
                  </tr>
                ) : (
                  vendors.map((vendor) => (
                    <tr
                      key={vendor.vendor_name}
                      className="border-b border-outline-variant/10"
                    >
                      <td className="p-3 font-medium text-on-surface">
                        {vendor.vendor_name}
                      </td>

                      <td className="p-3">
                        {formatMetric(vendor.overall_score, "%")}
                      </td>

                      <td className="p-3">
                        {formatMetric(vendor.on_time_delivery, "%")}
                      </td>

                      <td className="p-3">
                        {formatMetric(vendor.invoice_accuracy, "%")}
                      </td>

                      <td className="p-3">
                        {formatMetric(vendor.po_compliance, "%")}
                      </td>

                      <td className="p-3">
                        {vendor.price_variance !== null &&
                        vendor.price_variance !== undefined
                          ? formatCurrency(vendor.price_variance)
                          : "—"}
                      </td>

                      <td className="p-3">
                        {formatMetric(vendor.exception_rate, "%")}
                      </td>

                      <td className="p-3">
                        {formatMetric(vendor.payment_dispute, "%")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

            </table>

          </div>

        </section>

        <section className="mt-6 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6">

          <h2 className="text-xl font-semibold text-on-surface">
            Vendor Analytics
          </h2>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">

            <Metric
              title="Total Spend"
              value={formatCurrency(vendorData?.total_vendor_spend ?? 0)}
            />

            <Metric
              title="Number of Vendors"
              value={String(vendorData?.total_vendors ?? 0)}
            />

            <Metric
              title="Number of POs"
              value={String(
                vendors.reduce(
                  (total, vendor) =>
                    total + (vendor.number_of_pos ?? 0),
                  0
                )
              )}
            />

            <Metric
              title="Number of Invoices"
              value={String(
                vendors.reduce(
                  (total, vendor) =>
                    total + (vendor.number_of_invoices ?? 0),
                  0
                )
              )}
            />

            <Metric
              title="Average Invoice Value"
              value={formatCurrency(
                vendors.length > 0
                  ? vendors.reduce(
                      (total, vendor) =>
                        total + (vendor.average_invoice_value ?? 0),
                      0
                    ) / vendors.length
                  : 0
              )}
            />

          </div>

        </section>

      </div>
    </main>
  );
}

function Metric({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-surface-container p-4">
      <p className="text-sm text-on-surface-variant">
        {title}
      </p>

      <p className="mt-2 font-semibold text-on-surface">
        {value}
      </p>
    </div>
  );
}

function formatMetric(
  value: number | null | undefined,
  suffix = ""
) {
  if (value === null || value === undefined) {
    return "—";
  }

  return `${value.toFixed(1)}${suffix}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}