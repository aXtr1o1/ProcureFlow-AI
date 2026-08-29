"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fmtDate } from "@/lib/invoices";
import { getInvoice } from "@/services/api";
import { formatUsd } from "@/lib/currency";


interface LineItem {
  id: number;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface StatusLog {
  id: number;
  status: string;
  remarks: string;
  created_at: string;
}

interface Invoice {
  id: number;
  invoice_number: string;
  vendor_name: string;
  vendor_address: string;
  customer_name: string;
  invoice_date: string;
  currency: string;
  due_date: string;
  purchase_order_number: string | null;
  subtotal: number;
  tax: number;
  total_amount: number;
  processing_status: string;
  blob_name: string;
  blob_url: string;
  line_items: LineItem[];
  status_logs: StatusLog[];
}

const STATUS_LABEL: Record<string, string> = {
  Uploaded: "Uploaded",
  Matched: "Matched",
  "Review Required": "Review Required",
  "Approval Pending": "Approval Pending",
  Approved: "Approved",
  Rejected: "Rejected",
  "PO Generated": "PO Generated",
};

export default function InvoiceDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null | undefined>(undefined);
  const [exportState, setExportState] = useState<"idle" | "working" | "done">(
    "idle"
  );

  useEffect(() => {

    const loadInvoice = async () => {

        try {

            const response = await getInvoice(params.id);

            setInvoice(response.data);

        } catch {

            setInvoice(null);

        }

    };

    loadInvoice();

}, [params.id]);

  if (invoice === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </main>
    );
  }

  if (invoice === null) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
        <p className="font-title-lg text-title-lg text-on-surface">
          Invoice not found
        </p>
        <button
          onClick={() => router.push("/dashboard/invoices")}
          className="text-primary font-label-md hover:underline"
        >
          Back to Invoices
        </button>
      </main>
    );
  }

  const isOverdue =
    invoice.due_date &&
    new Date(invoice.due_date).getTime() < Date.now();

  const securityDeposit =
    invoice.line_items.find((item) =>
      item.description.toLowerCase().includes("deposit")
    )?.amount ?? 0;

  const handleExportJson = () => {
    setExportState("working");
    const blob = new Blob([JSON.stringify(invoice, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${invoice.invoice_number}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setTimeout(() => setExportState("done"), 400);
    setTimeout(() => setExportState("idle"), 2200);
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  return (
    <div className="max-w-container-max mx-auto px-margin-desktop w-full py-12">
      <button
        onClick={() => router.push("/dashboard/invoices")}
        className="flex items-center gap-1 font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors mb-6"
      >
        <span className="material-symbols-outlined text-[18px]">
          arrow_back
        </span>
        Back to Invoices
      </button>

      {/* Hero header */}
      <div className="bg-surface-container-low rounded-xl p-8 mb-6 flex items-start justify-between gap-6 flex-wrap">
        <div className="flex flex-col gap-xs">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            Invoice Details
          </span>
          <h1 className="font-display-lg text-display-lg text-on-surface">
            {invoice.invoice_number}
          </h1>
          <div className="flex items-center gap-xs mt-1">
            <span className="material-symbols-outlined text-primary text-[18px]">
              verified
            </span>
            <span className="font-title-lg text-title-lg text-on-surface">
              {invoice.vendor_name}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-sm">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary-container text-on-primary-container font-label-md text-label-md shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-on-primary-container mr-2 animate-pulse" />
            {(STATUS_LABEL[invoice.processing_status] ?? invoice.processing_status).toUpperCase()}
          </span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            Status: {invoice.processing_status}
          </span>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex gap-sm mb-8">
        <button
          type="button"
          onClick={handleDownloadPdf}
          className="flex items-center justify-center gap-xs px-6 py-2.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          PDF
        </button>
        <button
          type="button"
          onClick={handleExportJson}
          disabled={exportState === "working"}
          className="flex items-center justify-center gap-xs px-6 py-2.5 rounded-lg bg-surface-container-highest text-on-surface font-label-md text-label-md shadow-sm hover:shadow-md active:scale-[0.98] transition-all disabled:opacity-70"
        >
          <span className="material-symbols-outlined text-[18px]">
            {exportState === "working"
              ? "progress_activity"
              : exportState === "done"
              ? "check"
              : "code"}
          </span>
          {exportState === "working"
            ? "Processing..."
            : exportState === "done"
            ? "Done!"
            : "Export JSON"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Metadata + line items */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-sm mb-6">
              <div className="w-10 h-10 rounded-lg bg-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-secondary-container">
                  receipt_long
                </span>
              </div>
              <div>
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                  Total Amount
                </p>
                <p className="font-headline-lg text-headline-lg text-on-surface">
                  {formatUsd(invoice.total_amount, invoice.currency)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-6 gap-x-4 border-t pt-6 border-surface-variant mb-6">
              <div>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  Invoice Date
                </p>
                <p className="font-body-md text-body-md text-on-surface font-semibold">
                  {fmtDate(invoice.invoice_date)}
                </p>
              </div>
              <div>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  Due Date
                </p>
                <p
                  className={`font-body-md text-body-md font-semibold ${
                    isOverdue ? "text-error" : "text-on-surface"
                  }`}
                >
                  {fmtDate(invoice.due_date)}
                </p>
              </div>
              <div>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  Terms
                </p>
                <p className="font-body-md text-body-md text-on-surface font-semibold">
                  USD
                </p>
              </div>
              <div>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  Tax ID
                </p>
                <p className="font-body-md text-body-md text-on-surface font-semibold">
                  {invoice.purchase_order_number ?? "N/A"}
                </p>
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border border-surface-variant">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low/50">
                    <th className="px-4 py-3 font-label-sm text-label-sm text-on-surface-variant">
                      Description
                    </th>
                    <th className="px-4 py-3 font-label-sm text-label-sm text-on-surface-variant text-right">
                      Qty
                    </th>
                    <th className="px-4 py-3 font-label-sm text-label-sm text-on-surface-variant text-right">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant">
                  {invoice.line_items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <p className="font-body-md text-body-md text-on-surface font-medium">
                          {item.description}
                        </p>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right font-body-md text-body-md">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-right font-body-md text-body-md text-on-surface font-semibold">
                        {formatUsd(item.amount, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td
                      className="px-4 py-3 font-medium text-on-surface"
                      colSpan={2}
                    >
                      Subtotal (Rent + Charges)
                    </td>

                    <td className="px-4 py-3 text-right">
                      {formatUsd(invoice.subtotal, invoice.currency)}
                    </td>
                  </tr>

                  <tr>
                    <td
                      className="px-4 py-3 font-medium text-on-surface"
                      colSpan={2}
                    >
                      Security Deposit
                    </td>

                    <td className="px-4 py-3 text-right">
                      {formatUsd(securityDeposit, invoice.currency)}
                    </td>
                  </tr>

                  <tr>
                    <td
                      className="px-4 py-3 font-medium text-on-surface"
                      colSpan={2}
                    >
                      VAT (5%)
                    </td>

                    <td className="px-4 py-3 text-right">
                      {formatUsd(invoice.tax, invoice.currency)}
                    </td>
                  </tr>

                  <tr className="border-t">
                    <td
                      className="px-4 py-3 font-title-md text-title-md text-on-surface"
                      colSpan={2}
                    >
                      Grand Total
                    </td>

                    <td className="px-4 py-3 text-right font-title-md text-title-md text-on-surface">
                      {formatUsd(invoice.total_amount, invoice.currency)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Approval history timeline */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6 h-fit">
          <h3 className="font-title-lg text-title-lg text-on-surface mb-6">
            Approval History
          </h3>
          <div className="relative space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-surface-variant">
            {invoice.status_logs.map((event) => (
              <div key={event.id} className="relative pl-9">
                <div className="absolute left-0 top-0.5 w-6 h-6 rounded-full bg-primary flex items-center justify-center z-10">
                  <span className="material-symbols-outlined text-on-primary text-[14px]">
                    check
                  </span>
                </div>
                <p className="font-body-md text-body-md text-on-surface font-semibold">
                  {event.status}
                </p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {event.remarks}
                </p>
                <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
                  {fmtDate(event.created_at)}
                </p>
              </div>
            ))}
            {invoice.processing_status !== "Approved" &&
             invoice.processing_status !== "Rejected" &&
             invoice.processing_status !== "PO Generated" && (
              <div className="relative pl-9">
                <div className="absolute left-0 top-0.5 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center z-10">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <p className="font-body-md text-body-md text-on-surface font-semibold">
                  Awaiting Next Step
                </p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {invoice.processing_status === "Approval Pending"
                    ? "Pending manager approval"
                    : "Pending internal validation"}
                </p>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-sm">
            <button
              type="button"
              onClick={() =>
                router.push(
                  invoice.processing_status === "Approval Pending" ||
                  invoice.processing_status === "Approved" ||
                  invoice.processing_status === "Rejected" ||
                  invoice.processing_status === "PO Generated"
                      ? `/dashboard/invoices/${invoice.id}/approval`
                      : `/dashboard/invoices/${invoice.id}/validation`
              )
              }
              className="w-full py-2.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md shadow-sm hover:shadow-md transition-all"
            >
              {
                invoice.processing_status === "Approval Pending"
                  ? "Go to Approval"
                  : invoice.processing_status === "Approved" ||
                    invoice.processing_status === "Rejected" ||
                    invoice.processing_status === "PO Generated"
                  ? "View Approval Record"
                  : "Go to Validation"
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
