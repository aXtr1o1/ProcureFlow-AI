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
    let isMounted = true;

    getDashboardOverview()
      .then((response) => {
        if (isMounted) {
          setData(response);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load vendor analytics."
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
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

  const totalPurchaseOrders = vendors.reduce(
    (total, vendor) => total + (vendor.number_of_pos ?? 0),
    0
  );

  const totalInvoices = vendors.reduce(
    (total, vendor) => total + (vendor.number_of_invoices ?? 0),
    0
  );

  const totalInvoiceValue = vendors.reduce(
    (total, vendor) =>
      total +
      (vendor.average_invoice_value ?? 0) *
        (vendor.number_of_invoices ?? 0),
    0
  );

  const averageInvoiceValue =
    totalInvoices > 0 ? totalInvoiceValue / totalInvoices : null;

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
                    Price Variance (USD)
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
                        {vendor.vendor_name || "Unknown Vendor"}
                      </td>

                      <td className="p-3 text-on-surface">
                        {formatMetric(vendor.overall_score)}
                      </td>

                      <td className="p-3 text-on-surface">
                        {formatMetric(vendor.on_time_delivery)}
                      </td>

                      <td className="p-3 text-on-surface">
                        {formatMetric(vendor.invoice_accuracy)}
                      </td>

                      <td className="p-3 text-on-surface">
                        {formatMetric(vendor.po_compliance)}
                      </td>

                      <td className="px-4 py-3 text-right text-sm">
                        {formatPriceVariance(vendor.price_variance)}
                      </td>

                      <td className="p-3 text-on-surface">
                        {formatMetric(vendor.exception_rate)}
                      </td>

                      <td className="p-3 text-on-surface">
                        {formatMetric(vendor.payment_dispute)}
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

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Metric
              title="Total Spend"
              value={formatCurrency(vendorData?.total_vendor_spend)}
            />

            <Metric
              title="Number of Vendors"
              value={formatNumber(vendorData?.total_vendors)}
            />

            <Metric
              title="Number of POs"
              value={formatNumber(totalPurchaseOrders)}
            />

            <Metric
              title="Number of Invoices"
              value={formatNumber(totalInvoices)}
            />

            <Metric
              title="Average Invoice Value"
              value={formatCurrency(averageInvoiceValue)}
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
      <p className="text-sm text-on-surface-variant">{title}</p>

      <p className="mt-2 font-semibold text-on-surface">{value}</p>
    </div>
  );
}

function formatMetric(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }

  return `${value.toFixed(1)}%`;
}

function formatPriceVariance(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
    signDisplay: "always",
  }).format(value);
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("en-US").format(value);
}