"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getInvoice,
  matchInvoice,
  linkInvoiceToPurchaseOrder,
  updateInvoiceStatus,
  approveMatchOverride,
  rejectInvoiceMatch,
} from "@/services/api";
import { formatUsd } from "@/lib/currency";
import { fmtDate } from "@/lib/invoices";

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
  vendor_address?: string;
  customer_name?: string;
  invoice_date?: string;
  due_date?: string;
  purchase_order_number?: string;
  currency?: string;
  subtotal?: number;
  tax?: number;
  total_amount?: number;
  processing_status: string;
  blob_url?: string;
  line_items: LineItem[];
}

interface MatchingMismatch {
  field_name: string;
  invoice_value: string | null;
  po_value: string | null;
}

interface MatchingResult {
  success: boolean;
  invoice_id: number;
  po_number: string;
  is_match: boolean;
  match_score: number;
  mismatches: MatchingMismatch[];
  status: string;
  message: string;
  match_run_id: number;
  exception_id?: number | null;
}

export default function InvoiceMatchingPage() {
  const params = useParams();
  const router = useRouter();

  const invoiceId = Number(params.id);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [result, setResult] = useState<MatchingResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [linking, setLinking] = useState(false);
  const [sendingForApproval, setSendingForApproval] = useState(false);
  const [approvingMatch, setApprovingMatch] = useState(false);
  const [rejectingInvoice, setRejectingInvoice] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const [purchaseOrderId, setPurchaseOrderId] = useState("");

  const [error, setError] = useState("");

  // ==========================================================
  // Load Invoice
  // ==========================================================

  const loadInvoice = async () => {
    if (!invoiceId) return;

    try {
      setLoading(true);
      setError("");

      const response = await getInvoice(invoiceId);

      const invoiceData = response?.data ?? response;

      setInvoice(invoiceData);

      // Clear previous matching result when invoice is loaded
      setResult(null);
    } catch (err) {
      console.error("Failed to load invoice:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load invoice."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInvoice();
  }, [invoiceId]);

  // ==========================================================
  // Link Purchase Order
  // ==========================================================

  const handleLinkPurchaseOrder = async () => {
    if (!invoice) return;

    const poId = Number(purchaseOrderId);

    if (!poId || poId <= 0) {
      setError("Please enter a valid Purchase Order ID.");
      return;
    }

    try {
      setLinking(true);
      setError("");

      const response = await linkInvoiceToPurchaseOrder(
        invoice.id,
        poId
      );

      console.log("Purchase Order linked:", response);

      // Backend returns the updated invoice
      const updatedInvoice =
        response?.data ??
        response;

      if (updatedInvoice?.id) {
        setInvoice((previous) =>
          previous
            ? {
                ...previous,
                ...updatedInvoice,
                purchase_order_number:
                  updatedInvoice.purchase_order_number,
                processing_status:
                  updatedInvoice.processing_status ||
                  "PO Linked",
              }
            : previous
        );
      } else {
        // If backend returns a different structure,
        // reload invoice from backend.
        await loadInvoice();
      }

      setPurchaseOrderId("");
    } catch (err) {
      console.error(
        "Failed to link Purchase Order:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to link Purchase Order."
      );
    } finally {
      setLinking(false);
    }
  };

  // ==========================================================
  // Run 2-Way Match
  // ==========================================================

  const handleMatch = async () => {
    if (!invoice) return;

    if (!invoice.purchase_order_number) {
      setError(
        "Please link a Purchase Order before running the 2-Way Match."
      );
      return;
    }

    try {
      setMatching(true);
      setError("");

      const response = await matchInvoice(invoice.id);

      setResult(response);

      setInvoice((previous) =>
        previous
          ? {
              ...previous,
              processing_status:
                response.status ||
                previous.processing_status,
            }
          : previous
      );
    } catch (err) {
      console.error(
        "Invoice matching failed:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Invoice matching failed."
      );
    } finally {
      setMatching(false);
    }
  };

  // ==========================================================
  // Approve Match Override
  // ==========================================================

  const handleApproveMatch = async () => {
    if (!invoice) return;

    try {
      setApprovingMatch(true);
      setError("");

      const response = await approveMatchOverride(invoice.id);

      console.log("Match override approved:", response);

      setInvoice((previous) =>
        previous
          ? {
              ...previous,
              processing_status:
                response?.status || "Approval Pending",
            }
          : previous
      );

      router.push(
        `/dashboard/invoices/${invoice.id}/approval`
      );
    } catch (err) {
      console.error(
        "Failed to approve match override:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to approve match."
      );
    } finally {
      setApprovingMatch(false);
    }
  };

  // ==========================================================
  // Reject Invoice During Match Review
  // ==========================================================

  const handleRejectInvoice = async () => {
    if (!invoice) return;

    try {
      setRejectingInvoice(true);
      setError("");

      const response = await rejectInvoiceMatch(invoice.id);

      console.log("Invoice rejected:", response);

      setInvoice((previous) =>
        previous
          ? {
              ...previous,
              processing_status:
                response?.status || "Rejected",
            }
          : previous
      );

      setResult(null);
      setShowRejectModal(false);

      router.push(
        `/dashboard/invoices/${invoice.id}`
      );
    } catch (err) {
      console.error(
        "Failed to reject invoice:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to reject invoice."
      );
    } finally {
      setRejectingInvoice(false);
    }
  };

  // ==========================================================
  // Send Matched Invoice for Approval
  // ==========================================================

  const handleSendForApproval = async () => {
    if (!invoice) return;

    if (!result?.is_match) {
      setError(
        "Only successfully matched invoices can be sent for approval."
      );
      return;
    }

    try {
      setSendingForApproval(true);
      setError("");

      const response = await updateInvoiceStatus(invoice.id);

      console.log("Invoice sent for approval:", response);

      setInvoice((previous) =>
        previous
          ? {
              ...previous,
              processing_status:
                response?.status || "Approval Pending",
            }
          : previous
      );

      router.push(
        `/dashboard/invoices/${invoice.id}/approval`
      );
    } catch (err) {
      console.error(
        "Failed to send invoice for approval:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to send invoice for approval."
      );
    } finally {
      setSendingForApproval(false);
    }
  };


  // ==========================================================
  // Loading
  // ==========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-surface pt-24 pb-12">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          </div>
        </div>
      </main>
    );
  }

  // ==========================================================
  // Invoice Loading Error
  // ==========================================================

  if (error && !invoice) {
    return (
      <main className="min-h-screen bg-surface pt-24 pb-12">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-red-900">
            <h1 className="text-xl font-semibold">
              Unable to load invoice
            </h1>

            <p className="mt-2">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                router.push(
                  `/dashboard/invoices/${invoiceId}`
                )
              }
              className="mt-5 rounded-lg bg-primary px-5 py-2.5 text-on-primary"
            >
              Back to Invoice
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!invoice) {
    return null;
  }

  // ==========================================================
  // Status
  // ==========================================================

  const isMatched =
    result?.is_match === true ||
    invoice.processing_status === "Approval Pending";

  const reviewRequired =
    result?.is_match === false ||
    invoice.processing_status === "Review Required";

  const isRejected =
    invoice.processing_status === "Rejected";

  const isPOLinked =
    Boolean(invoice.purchase_order_number);

  return (
    <main className="min-h-screen bg-surface pt-24 pb-12">
      <div className="max-w-container-max mx-auto px-margin-desktop">

        {/* =====================================================
            Header
        ===================================================== */}

        <div className="mb-8">
          <button
            type="button"
            onClick={() =>
              router.push(
                `/dashboard/invoices/${invoice.id}`
              )
            }
            className="text-sm text-primary hover:underline"
          >
            ← Back to Invoice
          </button>

          <div className="mt-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-wide text-on-surface-variant">
                Invoice Matching
              </p>

              <h1 className="mt-1 text-3xl font-bold text-on-surface">
                2-Way Match
              </h1>

              <p className="mt-2 text-on-surface-variant">
                Compare the invoice against its linked Purchase Order.
              </p>
            </div>

            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                isMatched
                  ? "bg-green-100 text-green-700"
                  : reviewRequired
                    ? "bg-yellow-100 text-yellow-700"
                    : isPOLinked
                      ? "bg-blue-100 text-blue-700"
                      : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {invoice.processing_status}
            </span>
          </div>
        </div>

        {/* =====================================================
            Error
        ===================================================== */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-5 text-red-900">
            {error}
          </div>
        )}

        {/* =====================================================
            Successful Match
        ===================================================== */}

        {isMatched && result && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-8 text-center">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500">
              <span className="material-symbols-outlined text-[48px] text-white">
                check
              </span>
            </div>

            <h2 className="mt-5 text-2xl font-bold text-green-800">
              Invoice Matched Successfully
            </h2>

            <p className="mt-2 text-green-700">
              The invoice matches the Purchase Order successfully.
            </p>

            <div className="mx-auto mt-6 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">

              <InfoCard
                label="PO Number"
                value={result.po_number}
              />

              <InfoCard
                label="Match Score"
                value={`${result.match_score}%`}
              />

              <InfoCard
                label="Match Run"
                value={String(result.match_run_id)}
              />

            </div>

            <button
              type="button"
              onClick={handleSendForApproval}
              disabled={sendingForApproval}
              className="mt-7 rounded-lg bg-primary px-6 py-3 font-semibold text-on-primary shadow-md hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sendingForApproval
                ? "Sending for Approval..."
                : "Continue to Invoice Approval"}
            </button>
          </div>
        )}

        {/* =====================================================
            Review Required
        ===================================================== */}

        {reviewRequired && result && (
          <div className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-8">

            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500">
                <span className="material-symbols-outlined text-[32px] text-white">
                  warning
                </span>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-yellow-800">
                  Review Required
                </h2>

                <p className="mt-1 text-yellow-700">
                  The invoice does not completely match the Purchase Order.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-white p-5">
              <h3 className="font-semibold text-on-surface">
                Mismatches
              </h3>

              <div className="mt-4 space-y-4">
                {result.mismatches.map(
                  (mismatch, index) => (
                    <div
                      key={`${mismatch.field_name}-${index}`}
                      className="rounded-lg border border-yellow-200 bg-yellow-50 p-4"
                    >
                      {/* Field name */}
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-yellow-600">
                          error
                        </span>

                        <span className="font-semibold text-on-surface">
                          {mismatch.field_name}
                        </span>
                      </div>

                      {/* Comparison */}
                      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">

                        {/* Invoice Value */}
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                            Invoice
                          </p>

                          <p className="mt-2 text-sm font-medium text-on-surface">
                            {mismatch.invoice_value ?? "Not available"}
                          </p>
                        </div>

                        {/* Purchase Order Value */}
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                            Purchase Order
                          </p>

                          <p className="mt-2 text-sm font-medium text-on-surface">
                            {mismatch.po_value ?? "Not available"}
                          </p>
                        </div>

                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* =====================================================
                Matching Decision
            ===================================================== */}

            <div className="mt-6 rounded-xl border border-yellow-200 bg-white p-5">

              <div>
                <h3 className="text-lg font-semibold text-on-surface">
                  Matching Decision
                </h3>

                <p className="mt-1 text-sm text-on-surface-variant">
                  Review the mismatches and choose how you want to proceed.
                </p>
              </div>

              {/* Decision Actions */}
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">

                {/* Approve Match */}
                <button
                  type="button"
                  onClick={handleApproveMatch}
                  disabled={
                    approvingMatch ||
                    rejectingInvoice
                  }
                  className="order-1 flex-1 rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {approvingMatch
                    ? "Approving Match..."
                    : "Approve Match"}
                </button>

                {/* Reject Invoice */}
                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  disabled={
                    approvingMatch ||
                    rejectingInvoice
                  }
                  className="order-2 flex-1 rounded-lg border border-red-300 bg-white px-6 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {rejectingInvoice
                    ? "Rejecting Invoice..."
                    : "Reject Invoice"}
                </button>

              </div>

              {/* Secondary Actions */}
              <div className="mt-4 flex flex-col gap-3 border-t border-outline-variant/10 pt-4 sm:flex-row">

                {/* Review Invoice */}
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/dashboard/invoices/${invoice.id}`
                    )
                  }
                  className="rounded-lg border border-outline px-5 py-2.5 text-sm font-medium text-on-surface transition hover:bg-surface-container-low"
                >
                  Review Invoice
                </button>

                {/* Run Match Again */}
                <button
                  type="button"
                  onClick={handleMatch}
                  disabled={
                    matching ||
                    approvingMatch ||
                    rejectingInvoice
                  }
                  className="rounded-lg border border-primary px-5 py-2.5 text-sm font-medium text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {matching
                    ? "Running Match..."
                    : "Run Match Again"}
                </button>

              </div>

            </div>
          </div>
        )}

        {/* =====================================================
            Rejected
        ===================================================== */}

        {isRejected && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-8">

            <div className="flex items-center gap-4">

              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500">
                <span className="material-symbols-outlined text-[32px] text-white">
                  block
                </span>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-red-800">
                  Invoice Rejected
                </h2>

                <p className="mt-1 text-red-700">
                  This invoice has been rejected and will not
                  proceed to payment.
                </p>
              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  `/dashboard/invoices/${invoice.id}`
                )
              }
              className="mt-6 rounded-lg border border-red-300 bg-white px-5 py-2.5 text-red-700"
            >
              Back to Invoice
            </button>

          </div>
        )}

        {/* =====================================================
            Reject Confirmation Modal
        ===================================================== */}

        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">

            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">

              <div className="flex items-start gap-4">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <span className="material-symbols-outlined text-[28px] text-red-600">
                    warning
                  </span>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-on-surface">
                    Reject Invoice?
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    Are you sure you want to reject this invoice?
                    Once rejected, it will not proceed to payment.
                  </p>
                </div>

              </div>

              <div className="mt-6 rounded-lg bg-red-50 p-4">

                <p className="text-sm font-medium text-red-800">
                  Invoice
                </p>

                <p className="mt-1 text-sm text-red-700">
                  {invoice.invoice_number}
                </p>

                <p className="mt-3 text-sm font-medium text-red-800">
                  Vendor
                </p>

                <p className="mt-1 text-sm text-red-700">
                  {invoice.vendor_name}
                </p>

              </div>

              <div className="mt-6 flex justify-end gap-3">

                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  disabled={rejectingInvoice}
                  className="rounded-lg border border-outline px-5 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container-low disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleRejectInvoice}
                  disabled={rejectingInvoice}
                  className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {rejectingInvoice
                    ? "Rejecting..."
                    : "Yes, Reject Invoice"}
                </button>

              </div>

            </div>

          </div>
        )}

        {/* =====================================================
            Invoice + Purchase Order
        ===================================================== */}

        {!result && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* =================================================
                Invoice
            ================================================= */}

            <section className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <span className="material-symbols-outlined">
                    receipt_long
                  </span>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-on-surface">
                    Invoice
                  </h2>

                  <p className="text-sm text-on-surface-variant">
                    Invoice details
                  </p>
                </div>

              </div>

              <div className="mt-6 space-y-4">

                <DetailRow
                  label="Invoice Number"
                  value={
                    invoice.invoice_number || "—"
                  }
                />

                <DetailRow
                  label="Vendor"
                  value={
                    invoice.vendor_name || "—"
                  }
                />

                <DetailRow
                  label="Invoice Date"
                  value={
                    invoice.invoice_date
                      ? fmtDate(
                          invoice.invoice_date
                        )
                      : "—"
                  }
                />

                <DetailRow
                  label="Currency"
                  value={
                    invoice.currency || "USD"
                  }
                />

                <DetailRow
                  label="Subtotal"
                  value={formatUsd(
                    invoice.subtotal ?? 0,
                    invoice.currency
                  )}
                />

                <DetailRow
                  label="Tax"
                  value={formatUsd(
                    invoice.tax ?? 0,
                    invoice.currency
                  )}
                />

                <DetailRow
                  label="Total Amount"
                  value={formatUsd(
                    invoice.total_amount ?? 0,
                    invoice.currency
                  )}
                  strong
                />

              </div>
            </section>

            {/* =================================================
                Purchase Order
            ================================================= */}

            <section className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <span className="material-symbols-outlined">
                    description
                  </span>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-on-surface">
                    Purchase Order
                  </h2>

                  <p className="text-sm text-on-surface-variant">
                    Linked procurement PO
                  </p>
                </div>

              </div>

              <div className="mt-6 space-y-4">

                <DetailRow
                  label="PO Number"
                  value={
                    invoice.purchase_order_number ||
                    "Not linked"
                  }
                />

                <DetailRow
                  label="Vendor"
                  value={
                    invoice.vendor_name || "—"
                  }
                />

                <DetailRow
                  label="Currency"
                  value={
                    invoice.currency || "USD"
                  }
                />

                <DetailRow
                  label="Invoice Total"
                  value={formatUsd(
                    invoice.total_amount ?? 0,
                    invoice.currency
                  )}
                />

              </div>

              {/* =================================================
                  Link PO
              ================================================= */}

              {!isPOLinked && (
                <div className="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 p-5">

                  <h3 className="font-semibold text-yellow-900">
                    Purchase Order Required
                  </h3>

                  <p className="mt-1 text-sm text-yellow-800">
                    This invoice must be linked to a Purchase
                    Order before 2-Way Matching can be performed.
                  </p>

                  <div className="mt-4">

                    <label
                      htmlFor="purchase-order-id"
                      className="block text-sm font-medium text-on-surface"
                    >
                      Purchase Order ID
                    </label>

                    <input
                      id="purchase-order-id"
                      type="number"
                      min="1"
                      value={purchaseOrderId}
                      onChange={(event) =>
                        setPurchaseOrderId(
                          event.target.value
                        )
                      }
                      placeholder="Enter Purchase Order ID"
                      className="mt-2 w-full rounded-lg border border-outline-variant bg-white px-4 py-3 text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />

                  </div>

                  <button
                    type="button"
                    onClick={handleLinkPurchaseOrder}
                    disabled={
                      linking ||
                      !purchaseOrderId
                    }
                    className="mt-4 w-full rounded-lg bg-primary px-5 py-3 font-semibold text-on-primary shadow-md hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {linking
                      ? "Linking Purchase Order..."
                      : "Link Purchase Order"}
                  </button>

                </div>
              )}

              {/* =================================================
                  PO Linked
              ================================================= */}

              {isPOLinked && (
                <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">

                  <div className="flex items-center gap-3">

                    <span className="material-symbols-outlined text-green-600">
                      check_circle
                    </span>

                    <div>
                      <p className="font-semibold text-green-800">
                        Purchase Order Linked
                      </p>

                      <p className="text-sm text-green-700">
                        {invoice.purchase_order_number}
                      </p>
                    </div>

                  </div>

                </div>
              )}

            </section>
          </div>
        )}

        {/* =====================================================
            Run Matching
        ===================================================== */}

        {!result && (
          <section className="mt-6 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6">

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <h2 className="text-xl font-semibold text-on-surface">
                  Run 2-Way Match
                </h2>

                <p className="mt-1 text-sm text-on-surface-variant">
                  The system will compare vendor, currency,
                  subtotal, tax, total amount and line items.
                </p>
              </div>

              <button
                type="button"
                onClick={handleMatch}
                disabled={
                  matching ||
                  !invoice.purchase_order_number
                }
                className="shrink-0 rounded-lg bg-primary px-7 py-3 font-semibold text-on-primary shadow-md hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {matching
                  ? "Matching..."
                  : "Run 2-Way Match"}
              </button>

            </div>

            {!invoice.purchase_order_number && (
              <div className="mt-4 rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
                Link a Purchase Order above before
                running the 2-Way Match.
              </div>
            )}

            {invoice.purchase_order_number && (
              <div className="mt-4 rounded-lg bg-green-50 p-4 text-sm text-green-800">
                Purchase Order linked successfully.
                You can now run the 2-Way Match.
              </div>
            )}

          </section>
        )}

        {/* =====================================================
            Invoice Line Items
        ===================================================== */}

        {invoice.line_items?.length > 0 && (
          <section className="mt-6 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6">

            <h2 className="text-xl font-semibold text-on-surface">
              Invoice Line Items
            </h2>

            <div className="mt-5 overflow-x-auto">

              <table className="w-full text-sm">

                <thead>
                  <tr className="border-b border-outline-variant/20">

                    <th className="px-4 py-3 text-left">
                      Description
                    </th>

                    <th className="px-4 py-3 text-right">
                      Quantity
                    </th>

                    <th className="px-4 py-3 text-right">
                      Unit Price
                    </th>

                    <th className="px-4 py-3 text-right">
                      Amount
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {invoice.line_items.map(
                    (item) => (
                      <tr
                        key={item.id}
                        className="border-b border-outline-variant/10"
                      >

                        <td className="px-4 py-3">
                          {item.description}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {item.quantity}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {formatUsd(
                            item.unit_price,
                            invoice.currency
                          )}
                        </td>

                        <td className="px-4 py-3 text-right font-medium">
                          {formatUsd(
                            item.amount,
                            invoice.currency
                          )}
                        </td>

                      </tr>
                    )
                  )}

                </tbody>
              </table>

            </div>
          </section>
        )}

      </div>
    </main>
  );
}

// ==========================================================
// Detail Row
// ==========================================================

function DetailRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-outline-variant/10 pb-3">

      <span className="text-sm text-on-surface-variant">
        {label}
      </span>

      <span
        className={`text-right ${
          strong
            ? "font-semibold text-on-surface"
            : "text-on-surface"
        }`}
      >
        {value}
      </span>

    </div>
  );
}

// ==========================================================
// Info Card
// ==========================================================

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-green-200 bg-white p-4">

      <p className="text-xs text-on-surface-variant">
        {label}
      </p>

      <p className="mt-1 font-semibold text-on-surface">
        {value}
      </p>

    </div>
  );
}