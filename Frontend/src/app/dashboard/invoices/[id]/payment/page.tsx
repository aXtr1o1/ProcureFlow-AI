"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  getInvoice,
  getInvoicePaymentSummary,
  getInvoicePayments,
  createPayment,
  markPaymentPaid,
  markPaymentFailed,
  cancelPayment,
} from "@/services/api";

import { formatUsd } from "@/lib/currency";

interface Invoice {
  id: number;
  invoice_number: string;
  vendor_name: string;
  currency: string;
  total_amount: number;
  processing_status: string;
}

interface Payment {
  id: number;
  invoice_id: number;
  payment_reference: string;
  payment_method?: string | null;
  amount: number;
  currency: string;
  status: string;
  payment_date?: string | null;
  due_date?: string | null;
  remarks?: string | null;
}

interface PaymentSummary {
  invoice_id: number;
  invoice_total: number;
  total_paid: number;
  remaining_amount: number;
  payment_status: string;
  currency: string;
}

export default function InvoicePaymentPage() {
  const params = useParams();
  const router = useRouter();

  const invoiceId = Number(params.id);

  const [invoice, setInvoice] =
    useState<Invoice | null>(null);

  const [summary, setSummary] =
    useState<PaymentSummary | null>(null);

  const [payments, setPayments] =
    useState<Payment[]>([]);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [error, setError] = useState("");

  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState("Bank Transfer");

  const [paymentReference, setPaymentReference] =
    useState("");

  const [remarks, setRemarks] = useState("");

  async function loadPaymentData() {
    try {
      setLoading(true);
      setError("");

      const [
        invoiceResponse,
        summaryResponse,
        paymentsResponse,
      ] = await Promise.all([
        getInvoice(invoiceId),
        getInvoicePaymentSummary(invoiceId),
        getInvoicePayments(invoiceId),
      ]);

      setInvoice(
        invoiceResponse?.data ?? invoiceResponse
      );

      setSummary(summaryResponse);
      setPayments(paymentsResponse);

      if (
        summaryResponse &&
        summaryResponse.remaining_amount > 0
      ) {
        setAmount(
          String(summaryResponse.remaining_amount)
        );
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load payment information."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!invoiceId || Number.isNaN(invoiceId)) {
      setError("Invalid invoice ID.");
      setLoading(false);
      return;
    }

    void loadPaymentData();
  }, [invoiceId]);

  async function handleCreatePayment() {
    if (!invoice) return;

    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      setError(
        "Please enter a valid payment amount."
      );
      return;
    }

    if (
      summary &&
      paymentAmount > summary.remaining_amount
    ) {
      setError(
        "Payment amount cannot exceed the remaining invoice amount."
      );
      return;
    }

    try {
      setProcessing(true);
      setError("");

      const reference = paymentReference.trim();

        if (!reference) {
        setError("Please enter a payment reference.");
        return;
        }

        await createPayment({
        invoice_id: invoice.id,
        payment_reference: reference,
        payment_method: paymentMethod,
        amount: paymentAmount,
        currency: invoice.currency || "USD",
        remarks: remarks.trim() || undefined,
        });

      setPaymentReference("");
      setRemarks("");

      await loadPaymentData();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to create payment."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handlePaid(paymentId: number) {
    try {
      setProcessing(true);
      setError("");

      await markPaymentPaid(
        paymentId,
        "Payment completed successfully.",
        new Date().toISOString()
      );

      await loadPaymentData();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to mark payment as paid."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handleFailed(paymentId: number) {
    try {
      setProcessing(true);
      setError("");

      await markPaymentFailed(
        paymentId,
        "Payment failed."
      );

      await loadPaymentData();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to mark payment as failed."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handleCancel(paymentId: number) {
    try {
      setProcessing(true);
      setError("");

      await cancelPayment(
        paymentId,
        "Payment cancelled."
      );

      await loadPaymentData();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to cancel payment."
      );
    } finally {
      setProcessing(false);
    }
  }

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

  if (error && !invoice) {
    return (
      <main className="min-h-screen bg-surface pt-24 pb-12">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-red-900">
            {error}
          </div>
        </div>
      </main>
    );
  }

  if (!invoice) {
    return null;
  }

  const paymentAllowed =
    invoice.processing_status === "Payment Pending";

  return (
    <main className="min-h-screen bg-surface pt-24 pb-12">
      <div className="max-w-container-max mx-auto px-margin-desktop">

        {/* Header */}
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

          <h1 className="mt-4 text-3xl font-bold text-on-surface">
            Invoice Payment
          </h1>

          <p className="mt-2 text-on-surface-variant">
            Manage payment for invoice{" "}
            <strong>
              {invoice.invoice_number}
            </strong>
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-red-900">
            {error}
          </div>
        )}

        {/* Invoice Summary */}
        <section className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div>
              <p className="text-sm text-on-surface-variant">
                Vendor
              </p>

              <p className="mt-1 text-lg font-semibold text-on-surface">
                {invoice.vendor_name || "Unknown Vendor"}
              </p>

              <p className="mt-1 text-sm text-on-surface-variant">
                Invoice: {invoice.invoice_number}
              </p>
            </div>

            <div className="text-left md:text-right">
              <p className="text-sm text-on-surface-variant">
                Invoice Total
              </p>

              <p className="mt-1 text-2xl font-bold text-primary">
                {formatUsd(
                  invoice.total_amount,
                  invoice.currency
                )}
              </p>

              <span className="mt-2 inline-flex rounded-full bg-yellow-50 px-3 py-1 text-sm font-medium text-yellow-700">
                {invoice.processing_status}
              </span>
            </div>

          </div>
        </section>

        {/* Payment Summary */}
        {summary && (
          <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">

            <SummaryCard
              title="Invoice Total"
              value={formatUsd(
                summary.invoice_total,
                summary.currency
              )}
            />

            <SummaryCard
              title="Total Paid"
              value={formatUsd(
                summary.total_paid,
                summary.currency
              )}
            />

            <SummaryCard
              title="Remaining Amount"
              value={formatUsd(
                summary.remaining_amount,
                summary.currency
              )}
            />

          </section>
        )}

        {/* Create Payment */}
        {paymentAllowed &&
          summary &&
          summary.remaining_amount > 0 && (
            <section className="mt-6 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6">

              <h2 className="text-xl font-semibold text-on-surface">
                Create Payment
              </h2>

              <p className="mt-1 text-sm text-on-surface-variant">
                Create a payment for this approved invoice.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">

                <div>
                  <label className="text-sm font-medium text-on-surface">
                    Payment Amount
                  </label>

                  <input
                    type="number"
                    min="0.01"
                    max={summary.remaining_amount}
                    step="0.01"
                    value={amount}
                    onChange={(e) =>
                      setAmount(e.target.value)
                    }
                    className="mt-2 w-full rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-on-surface outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-on-surface">
                    Payment Method
                  </label>

                  <select
                    value={paymentMethod}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value)
                    }
                    className="mt-2 w-full rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-on-surface outline-none focus:border-primary"
                  >
                    <option>
                      Bank Transfer
                    </option>
                    <option>
                      Cheque
                    </option>
                    <option>
                      Credit Card
                    </option>
                    <option>
                      Cash
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-on-surface">
                    Payment Reference
                  </label>

                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) =>
                      setPaymentReference(e.target.value)
                    }
                    placeholder="Enter payment reference"
                    className="mt-2 w-full rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-on-surface outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-on-surface">
                    Remarks
                  </label>

                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) =>
                      setRemarks(e.target.value)
                    }
                    placeholder="Optional remarks"
                    className="mt-2 w-full rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-on-surface outline-none focus:border-primary"
                  />
                </div>

              </div>

              <button
                type="button"
                disabled={processing}
                onClick={handleCreatePayment}
                className="mt-6 rounded-lg bg-primary px-6 py-3 font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {processing
                  ? "Creating..."
                  : "Create Payment"}
              </button>

            </section>
          )}

        {/* Payment History */}
        <section className="mt-6 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6">

          <h2 className="text-xl font-semibold text-on-surface">
            Payment History
          </h2>

          {payments.length === 0 ? (
            <p className="mt-5 text-sm text-on-surface-variant">
              No payments have been created for this invoice.
            </p>
          ) : (
            <div className="mt-5 space-y-4">

              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-lg border border-outline-variant/20 p-4"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                    <div>
                      <p className="font-semibold text-on-surface">
                        {payment.payment_reference}
                      </p>

                      <p className="mt-1 text-sm text-on-surface-variant">
                        {payment.payment_method ||
                          "Payment Method Not Specified"}
                      </p>

                      {payment.remarks && (
                        <p className="mt-1 text-sm text-on-surface-variant">
                          {payment.remarks}
                        </p>
                      )}
                    </div>

                    <div className="text-left md:text-right">
                      <p className="font-semibold text-on-surface">
                        {formatUsd(
                          payment.amount,
                          payment.currency
                        )}
                      </p>

                      <span
                        className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          payment.status === "Paid"
                            ? "bg-green-50 text-green-700"
                            : payment.status ===
                                "Failed"
                            ? "bg-red-50 text-red-700"
                            : payment.status ===
                                "Cancelled"
                            ? "bg-gray-100 text-gray-700"
                            : "bg-yellow-50 text-yellow-700"
                        }`}
                      >
                        {payment.status}
                      </span>
                    </div>

                  </div>

                  {payment.status === "Pending" && (
                    <div className="mt-4 flex flex-wrap gap-2">

                      <button
                        type="button"
                        disabled={processing}
                        onClick={() =>
                          handlePaid(payment.id)
                        }
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      >
                        Mark Paid
                      </button>

                      <button
                        type="button"
                        disabled={processing}
                        onClick={() =>
                          handleFailed(payment.id)
                        }
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      >
                        Mark Failed
                      </button>

                      <button
                        type="button"
                        disabled={processing}
                        onClick={() =>
                          handleCancel(payment.id)
                        }
                        className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      >
                        Cancel
                      </button>

                    </div>
                  )}

                </div>
              ))}

            </div>
          )}

        </section>

      </div>
    </main>
  );
}

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5">
      <p className="text-sm text-on-surface-variant">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold text-primary">
        {value}
      </p>
    </div>
  );
}