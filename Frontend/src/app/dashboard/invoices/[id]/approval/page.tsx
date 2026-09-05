"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getInvoice,
  approveInvoice,
  rejectInvoice,
  getApprovalHistory,
  getInvoicePreviewUrl,
} from "@/services/api";

import { fmtDate } from "@/lib/invoices";
import { formatUsd } from "@/lib/currency";

interface ApprovalHistory {
  invoice_id: number;
  reviewer: string;
  decision: string;
  remarks: string;
  approved_at: string;
}

interface LineItem {
  id: number;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface Invoice {
  id: number;
  invoice_number: string;
  vendor_name: string;
  vendor_address: string;
  customer_name: string;
  invoice_date: string;
  due_date: string;
  purchase_order_number: string;
  currency: string;
  subtotal: number;
  tax: number;
  total_amount: number;
  processing_status: string;
  blob_name: string;
  blob_url: string;
  line_items: LineItem[];
}

const inputClass =
  "mt-1 w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 font-body-sm text-body-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:py-0";

export default function InvoiceApprovalPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [invoice, setInvoice] = useState<Invoice | null | undefined>(undefined);
  const [invoicePreviewUrl, setInvoicePreviewUrl] = useState<string | null>(null);
  const [deciding, setDeciding] = useState<"approved" | "rejected" | null>(null);
  const [history, setHistory] = useState<ApprovalHistory[]>([]);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadApproval = async () => {
      try {
        const response = await getInvoice(params.id);
        setInvoice(response.data);
        const historyResponse = await getApprovalHistory(params.id);
        setHistory(historyResponse);
      } catch {
        setInvoice(null);
      }
    };

    loadApproval();
  }, [params.id]);

  useEffect(() => {
    if (!invoice?.blob_name) return;

    let previewUrl: string | null = null;
    getInvoicePreviewUrl(invoice.blob_name)
      .then((url) => {
        previewUrl = url;
        setInvoicePreviewUrl(url);
      })
      .catch((error) => console.error("Failed to load invoice preview:", error));

    return () => {
      if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    };
  }, [invoice?.blob_name]);

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
          onClick={() => router.push("/dashboard")}
          className="text-primary font-label-md hover:underline"
        >
          Back to Upload
        </button>
      </main>
    );
  }

  const isDecided = ["Approved", "Rejected", "PO Completed"].includes(
    invoice.processing_status,
  );
  const canApprove = [
  "Approval Pending",
  "Pending Approval",
  "Approval Requested",
  "Matched",
  "Match Passed",
].includes(invoice.processing_status);

  const updateHeader = <K extends keyof Invoice>(key: K, value: Invoice[K]) => {
    setInvoice((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const updateLineItem = (
    lineId: number,
    field: keyof LineItem,
    value: string,
  ) => {
    setInvoice((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        line_items: prev.line_items.map((item) => {
          if (item.id !== lineId) return item;

          const next = { ...item };
          if (field === "description") {
            next.description = value;
          } else if (field === "quantity") {
            next.quantity = Number(value) || 0;
            next.amount = Number(
              (next.quantity * (Number(next.unit_price) || 0)).toFixed(2),
            );
          } else if (field === "unit_price") {
            next.unit_price = Number(value) || 0;
            next.amount = Number(
              ((Number(next.quantity) || 0) * next.unit_price).toFixed(2),
            );
          } else if (field === "amount") {
            next.amount = Number(value) || 0;
          }
          return next;
        }),
      };
    });
  };

  const hasInvoiceEdits = () => {
    if (!invoice) return false;

    return false;
  };

  const buildEditsPayload = () => ({
    invoice_number: invoice.invoice_number ?? "",
    vendor_name: invoice.vendor_name ?? "",
    vendor_address: invoice.vendor_address ?? "",
    customer_name: invoice.customer_name ?? "",
    invoice_date: invoice.invoice_date ?? "",
    due_date: invoice.due_date ?? "",
    purchase_order_number: invoice.purchase_order_number ?? "",
    currency: invoice.currency ?? "USD",
    subtotal: Number(invoice.subtotal) || 0,
    tax: Number(invoice.tax) || 0,
    total_amount: Number(invoice.total_amount) || 0,
    line_items: (invoice.line_items ?? []).map((item) => ({
      id: item.id,
      description: item.description ?? "",
      quantity: Number(item.quantity) || 0,
      unit_price: Number(item.unit_price) || 0,
      amount: Number(item.amount) || 0,
    })),
  });

  const handleDownload = () => {
    if (invoicePreviewUrl) window.open(invoicePreviewUrl, "_blank");
  };

  const handleDecision = async (decision: "approved" | "rejected") => {
  if (deciding) return;

  if (decision === "rejected") {
    setShowRejectDialog(true);
    return;
  }

  setDeciding("approved");
  setError(null);

  try {
    await approveInvoice(invoice.id, "Manager", null);
    router.replace("/dashboard/invoices");
  } catch (err) {
    console.error(err);

    setError(
      err instanceof Error
        ? err.message
        : "Failed to approve invoice.",
    );
  } finally {
    setDeciding(null);
  }
};

  const confirmReject = async () => {
    if (!rejectComment.trim()) {
      alert("Please enter a rejection reason.");
      return;
    }

    setDeciding("rejected");
    setError(null);

    try {
      await rejectInvoice(invoice.id, "Manager", rejectComment);
      router.replace("/dashboard/invoices");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to reject invoice.",
      );
    } finally {
      setDeciding(null);
      setShowRejectDialog(false);
      setRejectComment("");
    }
  };

  const invoicePdfUrl = invoicePreviewUrl;

  return (
    <main className="relative w-full bg-surface min-h-[calc(100vh-80px)] px-lg">
      <div className="max-w-container-max mx-auto w-full pb-40 pt-8">
        {/* Status Header */}
        <div className="flex items-center gap-md py-lg mb-md">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
            <span
              className="material-symbols-outlined text-primary text-[28px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified_user
            </span>
            {!isDecided && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-error rounded-full border-2 border-surface animate-pulse" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-primary uppercase tracking-widest">
              {isDecided ? "Resolved" : "Action Required"}
            </span>
            <h1>
              {invoice.processing_status === "Rejected"
                ? "Rejected"
                : invoice.processing_status === "Approved"
                  ? "Approved"
                  : invoice.processing_status === "PO Completed"
                    ? "PO Completed"
                    : invoice.processing_status === "Pending Approval" ||
                        invoice.processing_status === "Approval Requested"
                      ? "Approval Requested"
                      : invoice.processing_status}
            </h1>
            {!isDecided && (
              <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                Edit any fields below while viewing the original invoice, then
                approve to save changes.
              </p>
            )}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-300 bg-red-50 p-4 text-red-900"
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 items-start">
          {/* Left: editable invoice fields */}
          <div className="flex flex-col w-full min-w-0">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-md mb-lg">
          <div className="bg-surface-container-low p-md rounded-xl flex flex-col gap-xs shadow-sm">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
              Due Date
            </span>
            {isDecided ? (
              <span className="font-title-md text-title-md text-on-surface">
                {fmtDate(invoice.due_date)}
              </span>
            ) : (
              <input
                type="text"
                value={invoice.due_date ?? ""}
                onChange={(e) => updateHeader("due_date", e.target.value)}
                className={inputClass}
              />
            )}
          </div>
          <div className="bg-surface-container-low p-md rounded-xl flex flex-col gap-xs shadow-sm">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
              Status
            </span>
            <span className="font-title-md text-title-md text-on-surface">
              {invoice.processing_status}
            </span>
          </div>
        </div>

        {/* Invoice Summary Card */}
        <div className="bg-surface-container-highest p-lg rounded-xl shadow-md mb-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-lg opacity-10">
            <span className="material-symbols-outlined text-[80px]">
              receipt_long
            </span>
          </div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-md gap-4">
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-xs">
                  Vendor
                </span>
                {isDecided ? (
                  <>
                    <h2 className="font-title-md text-title-md text-on-surface">
                      {invoice.vendor_name}
                    </h2>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      ID: #{invoice.invoice_number}
                    </span>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      value={invoice.vendor_name ?? ""}
                      onChange={(e) =>
                        updateHeader("vendor_name", e.target.value)
                      }
                      className={inputClass}
                    />
                    <label className="mt-2 font-label-sm text-label-sm text-on-surface-variant">
                      Invoice #
                      <input
                        type="text"
                        value={invoice.invoice_number ?? ""}
                        onChange={(e) =>
                          updateHeader("invoice_number", e.target.value)
                        }
                        className={inputClass}
                      />
                    </label>
                  </>
                )}
              </div>
              <div className="bg-primary/10 px-md py-1 rounded-full shrink-0">
                <span className="font-label-sm text-label-sm text-primary uppercase">
                  {isDecided ? invoice.processing_status : "Pending"}
                </span>
              </div>
            </div>

            <div className="pt-md border-t border-on-surface/5">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                Total Amount
              </span>
              {isDecided ? (
                <div className="flex items-baseline gap-xs">
                  <span className="font-display-lg text-display-lg text-on-background tracking-tight">
                    {formatUsd(invoice.total_amount, invoice.currency)}
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    USD
                  </span>
                </div>
              ) : (
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <input
                    type="number"
                    step="0.01"
                    value={invoice.total_amount ?? 0}
                    onChange={(e) =>
                      updateHeader(
                        "total_amount",
                        Number(e.target.value) || 0,
                      )
                    }
                    className={`${inputClass} max-w-[180px] font-title-lg text-title-lg`}
                  />
                  <span className="font-label-md text-label-md text-on-surface-variant">
                    USD (US Dollar)
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 mt-6 sm:grid-cols-2">
              <label>
                <p className="text-sm text-gray-500">Customer</p>
                {isDecided ? (
                  <p>{invoice.customer_name}</p>
                ) : (
                  <input
                    type="text"
                    value={invoice.customer_name ?? ""}
                    onChange={(e) =>
                      updateHeader("customer_name", e.target.value)
                    }
                    className={inputClass}
                  />
                )}
              </label>

              <label>
                <p className="text-sm text-gray-500">Vendor Address</p>
                {isDecided ? (
                  <p>{invoice.vendor_address}</p>
                ) : (
                  <input
                    type="text"
                    value={invoice.vendor_address ?? ""}
                    onChange={(e) =>
                      updateHeader("vendor_address", e.target.value)
                    }
                    className={inputClass}
                  />
                )}
              </label>

              <label>
                <p className="text-sm text-gray-500">Invoice Date</p>
                {isDecided ? (
                  <p>{invoice.invoice_date}</p>
                ) : (
                  <input
                    type="text"
                    value={invoice.invoice_date ?? ""}
                    onChange={(e) =>
                      updateHeader("invoice_date", e.target.value)
                    }
                    className={inputClass}
                  />
                )}
              </label>

              <label>
                <p className="text-sm text-gray-500">Due Date</p>
                {isDecided ? (
                  <p>{invoice.due_date}</p>
                ) : (
                  <input
                    type="text"
                    value={invoice.due_date ?? ""}
                    onChange={(e) => updateHeader("due_date", e.target.value)}
                    className={inputClass}
                  />
                )}
              </label>

              <label>
                <p className="text-sm text-gray-500">Subtotal</p>
                {isDecided ? (
                  <p>
                    {formatUsd(invoice.subtotal, invoice.currency)}
                  </p>
                ) : (
                  <input
                    type="number"
                    step="0.01"
                    value={invoice.subtotal ?? 0}
                    onChange={(e) =>
                      updateHeader("subtotal", Number(e.target.value) || 0)
                    }
                    className={inputClass}
                  />
                )}
              </label>

              <label>
                <p className="text-sm text-gray-500">Tax</p>
                {isDecided ? (
                  <p>
                    {formatUsd(invoice.tax, invoice.currency)}
                  </p>
                ) : (
                  <input
                    type="number"
                    step="0.01"
                    value={invoice.tax ?? 0}
                    onChange={(e) =>
                      updateHeader("tax", Number(e.target.value) || 0)
                    }
                    className={inputClass}
                  />
                )}
              </label>
            </div>

            <div className="mt-8">
              <h3 className="font-semibold mb-3">Line Items</h3>

              {invoice.line_items?.map((item) => (
                <div key={item.id} className="border rounded-lg p-3 mb-2">
                  {isDecided ? (
                    <>
                      <p>
                        <strong>Description:</strong> {item.description}
                      </p>
                      <p>
                        <strong>Qty:</strong> {item.quantity}
                      </p>
                      <p>
                        <strong>Unit Price:</strong> {item.unit_price}
                      </p>
                      <p>
                        <strong>Amount:</strong> {item.amount}
                      </p>
                    </>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="sm:col-span-2">
                        <span className="text-sm text-gray-500">
                          Description
                        </span>
                        <input
                          type="text"
                          value={item.description ?? ""}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              "description",
                              e.target.value,
                            )
                          }
                          className={inputClass}
                        />
                      </label>
                      <label>
                        <span className="text-sm text-gray-500">Qty</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.quantity ?? 0}
                          onChange={(e) =>
                            updateLineItem(item.id, "quantity", e.target.value)
                          }
                          className={inputClass}
                        />
                      </label>
                      <label>
                        <span className="text-sm text-gray-500">Unit Price</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unit_price ?? 0}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              "unit_price",
                              e.target.value,
                            )
                          }
                          className={inputClass}
                        />
                      </label>
                      <label className="sm:col-span-2">
                        <span className="text-sm text-gray-500">Amount</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.amount ?? 0}
                          onChange={(e) =>
                            updateLineItem(item.id, "amount", e.target.value)
                          }
                          className={inputClass}
                        />
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Audit Trail */}
        <div className="flex flex-col gap-md mb-lg">
          <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase px-xs">
            Audit Trail
          </h3>
          <div className="bg-surface-container-low p-lg rounded-xl shadow-sm">
            <div className="flex flex-col gap-lg relative">
              <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-outline-variant" />
              {history.map((item) => (
                <div
                  key={`${item.invoice_id}-${item.approved_at}`}
                  className="flex gap-md relative"
                >
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center z-10">
                    <span className="material-symbols-outlined text-[14px] text-on-primary">
                      check
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md text-on-surface">
                      {item.decision}
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      {item.remarks}
                      <br />
                      {fmtDate(item.approved_at)}
                    </span>
                  </div>
                </div>
              ))}
              {!isDecided && (
                <div className="flex gap-md relative">
                  <div className="w-6 h-6 rounded-full bg-surface-container-highest border-2 border-primary flex items-center justify-center z-10">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md text-primary">
                      Awaiting Your Approval
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Assigned to you
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
          </div>

          {/* Right: original invoice PDF / image */}
          <div className="sticky top-24 h-[calc(100vh-140px)] min-h-[480px]">
            <div className="bg-white rounded-xl shadow h-full overflow-hidden flex flex-col">
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b shrink-0">
                <span className="font-semibold text-on-surface">
                  Original Invoice
                </span>
                {invoicePdfUrl && (
                  <a
                    href={invoicePdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-label-md text-label-md text-primary hover:underline"
                  >
                    Open in new tab
                  </a>
                )}
              </div>
              {invoicePdfUrl ? (
                <iframe
                  src={invoicePdfUrl}
                  title="Original Invoice"
                  className="w-full flex-1 min-h-[600px] border-0 bg-surface-container"
                />
              ) : (
                <div className="flex flex-1 items-center justify-center p-8 text-center text-on-surface-variant">
                  Invoice document is not available.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showRejectDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-xl shadow-xl w-[500px] p-6">
            <h2 className="text-xl font-semibold mb-4">Reject Invoice</h2>
            <p className="text-gray-600 mb-3">
              Please provide a reason for rejecting this invoice.
            </p>
            <textarea
              rows={5}
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Enter rejection comments..."
              className="w-full border rounded-lg p-3 resize-none"
            />
            <div className="flex justify-end gap-3 mt-5">
              <button
                disabled={deciding === "rejected"}
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectComment("");
                }}
                className="px-4 py-2 rounded-lg border disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={deciding === "rejected"}
                className="px-4 py-2 rounded-lg bg-red-600 text-white disabled:opacity-60"
              >
                {deciding === "rejected" ? "Rejecting..." : "Reject Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-xl border-t border-outline-variant px-lg py-md z-50">
        <div className="max-w-md mx-auto flex flex-col gap-sm">
          {isDecided ? (
            <div
              className={`h-12 rounded-xl flex items-center justify-center gap-sm font-title-md text-title-md ${
                invoice.processing_status === "Approved"
                  ? "bg-green-600 text-white"
                  : "bg-surface-container-highest text-on-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined">
                {invoice.processing_status === "Approved"
                  ? "check_circle"
                  : "cancel"}
              </span>
              {invoice.processing_status === "Rejected"
                ? "Rejected"
                : invoice.processing_status === "PO Completed"
                  ? "PO Completed"
                  : "Approved"}
            </div>
          ) : (
            <div className="flex gap-md">
              <button
                type="button"
                onClick={() => handleDecision("rejected")}
                disabled={!!deciding}
                className="flex-1 h-12 rounded-xl bg-error text-on-error font-title-md flex items-center justify-center gap-sm active:scale-95 transition-transform disabled:opacity-70"
              >
                <span className="material-symbols-outlined">close</span>
                Reject
              </button>
              <button
                type="button"
                onClick={() => handleDecision("approved")}
                disabled={!!deciding}
                className="flex-[2] h-12 rounded-xl bg-primary text-on-primary font-title-md flex items-center justify-center gap-sm active:scale-95 transition-transform shadow-lg shadow-primary/20 disabled:opacity-70"
              >
                {deciding === "approved" ? (
                  <span className="material-symbols-outlined animate-spin">
                    sync
                  </span>
                ) : (
                  <span className="material-symbols-outlined">check_circle</span>
                )}
                {deciding === "approved" ? "Saving & Approving..." : "Approve"}
              </button>
            </div>
          )}
          {isDecided && (
            <>
              <button
                type="button"
                onClick={handleDownload}
                className="w-full h-12 rounded-xl bg-primary text-white font-title-md flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">download</span>
                Download Invoice
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="w-full py-2 text-on-surface-variant hover:text-primary"
              >
                Back
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
