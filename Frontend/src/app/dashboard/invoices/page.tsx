"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fmtDate } from "@/lib/invoices";
import { getInvoices } from "@/services/api";
import { formatUsd } from "@/lib/currency";

interface Invoice {
  id: number;
  invoice_number: string;
  vendor_name: string;
  invoice_date: string;
  currency: string;
  total_amount: number;
  processing_status: string;
  blob_name: string;
  blob_url: string;
}

const STATUS_LABEL: Record<string, string> = {
  Uploaded: "Uploaded",
  "OCR Completed": "OCR Completed",
  "Validation Completed": "Validation Completed",
  Matched: "Matched",
  "Review Required": "Review Required",
  "Approval Pending": "Approval Pending",
  Approved: "Approved",
  Rejected: "Rejected",
  Duplicate: "Duplicate",
  Failed: "Failed",
  "PO Generated": "PO Generated",
  "PO Completed": "PO Completed",
};

const STATUS_STYLE: Record<string, string> = {
  Uploaded: "bg-primary/10 text-primary",
  "OCR Completed": "bg-blue-50 text-blue-700",
  "Validation Completed": "bg-green-50 text-green-700",
  Matched: "bg-green-50 text-green-700",
  "Review Required": "bg-yellow-50 text-yellow-700",
  "Approval Pending": "bg-secondary-container text-on-secondary-container",
  Approved: "bg-green-50 text-green-700",
  Rejected: "bg-error-container text-on-error-container",
  Duplicate: "bg-yellow-50 text-yellow-700",
  Failed: "bg-error-container text-on-error-container",
  "PO Generated": "bg-blue-50 text-blue-700",
  "PO Completed": "bg-indigo-50 text-indigo-700",
};

export default function InvoicesListPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getInvoices();
        if (cancelled) return;
        setInvoices(Array.isArray(response?.data) ? response.data : []);
      } catch (err) {
        console.error(err);
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Failed to load invoices.",
        );
        setInvoices([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void refresh();

    window.addEventListener("invoices:updated", refresh);

    return () => {
      cancelled = true;
      window.removeEventListener("invoices:updated", refresh);
    };
  }, []);

  return (
    <div className="max-w-container-max mx-auto px-margin-desktop w-full py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display-lg text-display-lg text-on-surface">
          Invoices
        </h1>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="px-6 py-2.5 bg-primary text-on-primary font-title-lg text-title-lg rounded-lg shadow-md hover:shadow-lg transition-all"
        >
          Upload New
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-red-900">
          {error}
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl p-16 text-center shadow-sm">
          <p className="font-title-lg text-title-lg text-on-surface mb-2">
            No invoices yet
          </p>
          <p className="font-body-md text-body-md text-on-surface-variant mb-6">
            Upload your first invoice to see it processed here.
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="text-primary font-label-md hover:underline"
          >
            Go to Upload
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="w-full text-left bg-surface-container-lowest rounded-xl p-6 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4"
            >
              <button
                type="button"
                onClick={() => router.push(`/dashboard/invoices/${inv.id}`)}
                className="flex items-center gap-4 flex-1 min-w-0 text-left"
              >
                <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined">
                    receipt_long
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-title-lg text-title-lg text-on-surface truncate">
                    {inv.vendor_name || "Unknown vendor"}
                  </span>
                  <span className="font-label-md text-label-md text-on-surface-variant truncate">
                    {inv.invoice_number || "—"} · {fmtDate(inv.invoice_date)}
                  </span>
                </div>
              </button>
              <div className="flex items-center gap-4 shrink-0">
                <span className="font-title-lg text-title-lg text-on-surface">
                  {formatUsd(inv.total_amount, inv.currency)}
                </span>
                <span
                  className={`font-label-md text-label-md px-3 py-1.5 rounded-full ${
                    STATUS_STYLE[inv.processing_status] ??
                    "bg-surface-container-highest text-on-surface-variant"
                  }`}
                >
                  {STATUS_LABEL[inv.processing_status] ?? inv.processing_status}
                </span>
                <button
                  type="button"
                  title="View details"
                  onClick={() => router.push(`/dashboard/invoices/${inv.id}`)}
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-surface-container text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    visibility
                  </span>
                </button>
                <button
                  type="button"
                  title={
                    inv.processing_status === "Approval Pending" ||
                    inv.processing_status === "Approved" ||
                    inv.processing_status === "Rejected" ||
                    inv.processing_status === "PO Completed" ||
                    inv.processing_status === "PO Generated"
                      ? "Go to approval"
                      : "Go to validation"
                  }
                  onClick={() =>
                    router.push(
                      inv.processing_status === "Approval Pending" ||
                        inv.processing_status === "Approved" ||
                        inv.processing_status === "Rejected" ||
                        inv.processing_status === "PO Completed" ||
                        inv.processing_status === "PO Generated"
                        ? `/dashboard/invoices/${inv.id}/approval`
                        : `/dashboard/invoices/${inv.id}/validation`,
                    )
                  }
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-surface-container text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    chevron_right
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
