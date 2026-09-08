"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { getInvoices } from "@/services/api";
import { formatUsd } from "@/lib/currency";

interface Invoice {
  id: number;
  invoice_number: string;
  vendor_name: string;
  invoice_date?: string;
  currency: string;
  total_amount: number;
  processing_status: string;
}

const PAYMENT_RELATED_STATUSES = new Set([
  "payment pending",
  "pending payment",
  "payment pending approval",
  "partially paid",
  "paid",
]);

export default function PaymentCenterPage() {
  const router = useRouter();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getInvoices()
      .then((response) => {
        const data = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : [];
        setInvoices(data);
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load payment invoices."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const paymentInvoices = useMemo(
    () =>
      invoices.filter((invoice) =>
        PAYMENT_RELATED_STATUSES.has(
          (invoice.processing_status || "").toLowerCase()
        )
      ),
    [invoices]
  );

  return (
    <main className="min-h-screen bg-surface p-6">
      <div className="mx-auto max-w-container-max">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-sm text-primary hover:underline"
          >
            ← Dashboard
          </Link>

          <h1 className="mt-4 text-3xl font-bold text-on-surface">
            Payment Center
          </h1>

          <p className="mt-2 text-on-surface-variant">
            Invoices ready for payment or already paid.
          </p>
        </div>

        {loading && (
          <p className="text-on-surface-variant">
            Loading payments...
          </p>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && paymentInvoices.length === 0 && (
          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6">
            <p className="text-on-surface">
              No payment-ready invoices found.
            </p>
            <p className="mt-2 text-sm text-on-surface-variant">
              Invoices appear here after they reach Payment Pending
              or Paid status.
            </p>
            <button
              type="button"
              onClick={() => router.push("/dashboard/invoices")}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Go to Invoices
            </button>
          </div>
        )}

        {!loading && !error && paymentInvoices.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest">
            <table className="w-full text-sm">
              <thead className="bg-surface-container">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-on-surface">
                    Invoice
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-on-surface">
                    Vendor
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-on-surface">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-on-surface">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-on-surface">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {paymentInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-t border-outline-variant/10"
                  >
                    <td className="px-4 py-3 text-on-surface">
                      {invoice.invoice_number || `Invoice #${invoice.id}`}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {invoice.vendor_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-on-surface">
                      {formatUsd(invoice.total_amount ?? 0)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                        {invoice.processing_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/dashboard/invoices/${invoice.id}/payment`
                          )
                        }
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        Open Payment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
