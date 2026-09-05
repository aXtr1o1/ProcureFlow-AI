"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import html2pdf from "html2pdf.js";

import {
  GoodsReceipt,
  getGoodsReceipt,
  submitGoodsReceipt,
  acceptGoodsReceipt,
  rejectGoodsReceipt,
} from "@/lib/procurement";

import StatusBadge from "@/components/procurement/StatusBadge";
import WorkflowStepper from "@/components/procurement/WorkflowStepper";

export default function GoodsReceiptDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const receiptPdfRef = useRef<HTMLDivElement>(null);

  const id = Number(params.id);

  const [receipt, setReceipt] =
    useState<GoodsReceipt | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [remarks, setRemarks] = 
    useState("");

  useEffect(() => {
    if (!id || Number.isNaN(id)) {
      setError("Invalid Goods Receipt ID.");
      setLoading(false);
      return;
    }

    getGoodsReceipt(id)
      .then(setReceipt)
      .catch((err) =>
        setError(err.message || "Failed to load Goods Receipt.")
      )
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    if (!receipt) return;

    try {
      setLoading(true);
      setError("");

      const updatedReceipt = await submitGoodsReceipt(receipt.id);

      setReceipt(updatedReceipt);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to submit Goods Receipt."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!receipt) return;

    try {
      setLoading(true);
      setError("");

      const updatedReceipt =
        await acceptGoodsReceipt(
          receipt.id,
          remarks.trim() || undefined
        );

      setReceipt(updatedReceipt);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to accept Goods Receipt."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!receipt) return;

    try {
      setLoading(true);
      setError("");

      const updatedReceipt =
        await rejectGoodsReceipt(
          receipt.id,
          remarks.trim() || undefined
        );

      setReceipt(updatedReceipt);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to reject Goods Receipt."
      );
    } finally {
      setLoading(false);
    }
  };

    const handleDownloadReceipt = async () => {
    if (!receiptPdfRef.current || !receipt) {
      return;
    }

    const options = {
      margin: 0.35,
      filename: `${receipt.receipt_number}.pdf`,
      image: {
        type: "jpeg" as const,
        quality: 0.98,
      },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        ignoreElements: (element: HTMLElement) =>
          element.classList.contains("no-pdf"),
      },
      jsPDF: {
        unit: "in",
        format: "a4",
        orientation: "portrait" as const,
      },
      pagebreak: {
        mode: ["css", "legacy"],
      },
    };

    await html2pdf()
      .set(options)
      .from(receiptPdfRef.current)
      .save();
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8f9fc] p-6">
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-gray-500">
            Loading Goods Receipt...
          </p>
        </div>
      </main>
    );
  }

  if (!receipt) {
    return (
        <main className="min-h-screen bg-[#f8f9fc] p-6">
          <div
            ref={receiptPdfRef}
            id="goods-receipt-pdf"
            className="bg-white"
          >
          </div>
      </main>
    );
  }

  const isDraft =
    receipt.status?.toLowerCase() === "draft";

  const isAccepted =
    receipt.status?.toLowerCase() === "accepted";

  const isRejected =
    receipt.status?.toLowerCase() === "rejected";

  const isSubmitted =
    receipt.status?.toLowerCase() === "submitted";

  return (
    <main className="min-h-screen bg-[#f8f9fc] p-6">
      {/* Workflow */}
      <WorkflowStepper
        currentStep="Goods Receipt"
      />

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#06264b]">
            {receipt.receipt_number}
          </h1>

          <p className="mt-1 text-gray-500">
            Purchase Order ID:{" "}
            {receipt.purchase_order_id}
          </p>
        </div>

        <StatusBadge
          status={receipt.status}
        />
      </div>

      {/* ===================================================== */}
      {/* DRAFT - SUBMIT GOODS RECEIPT */}
      {/* ===================================================== */}

      {isDraft && (
        <section className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[#06264b]">
            Goods Receipt Actions
          </h2>

          <p className="mb-4 text-sm text-gray-600">
            This Goods Receipt is currently in Draft status.
            Submit it for approval after verifying the received quantities.
          </p>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Goods Receipt"}
          </button>
        </section>
      )}

      {/* ===================================================== */}
      {/* ACCEPTED SUCCESS SCREEN */}
      {/* ===================================================== */}

      {isAccepted && (
        <section className="mb-6 rounded-xl border border-green-200 bg-gradient-to-b from-green-50 to-white px-6 py-10 text-center shadow-sm">
          {/* Success Icon */}
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-9 w-9 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>

          {/* Success Message */}
          <h2 className="text-3xl font-bold text-green-700">
            Goods Receipt Accepted
          </h2>

          <p className="mt-2 text-gray-600">
            This Goods Receipt has been accepted successfully.
          </p>

          {/* Receipt Summary */}
          <div className="mx-auto mt-7 grid max-w-2xl grid-cols-1 overflow-hidden rounded-lg border border-green-100 bg-white text-left sm:grid-cols-3">
            {/* Receipt Number */}
            <div className="flex items-center gap-3 border-b border-green-100 p-4 sm:border-b-0 sm:border-r">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-green-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Receipt Number
                </p>

                <p className="font-semibold text-[#06264b]">
                  {receipt.receipt_number}
                </p>
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center gap-3 border-b border-green-100 p-4 sm:border-b-0 sm:border-r">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-green-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect
                    x="3"
                    y="4"
                    width="18"
                    height="18"
                    rx="2"
                    ry="2"
                  />
                  <line
                    x1="16"
                    y1="2"
                    x2="16"
                    y2="6"
                  />
                  <line
                    x1="8"
                    y1="2"
                    x2="8"
                    y2="6"
                  />
                  <line
                    x1="3"
                    y1="10"
                    x2="21"
                    y2="10"
                  />
                </svg>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Receipt Date
                </p>

                <p className="font-semibold text-[#06264b]">
                  {formatDate(receipt.received_date)}
                </p>
              </div>
            </div>

            {/* PO */}
            <div className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-green-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 2h9l5 5v15H6z" />
                  <path d="M14 2v6h6" />
                </svg>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Purchase Order ID
                </p>

                <p className="font-semibold text-[#06264b]">
                  {receipt.purchase_order_id}
                </p>
              </div>
            </div>
          </div>

          {/* Button */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => window.print()}
              className="no-pdf inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3v12" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 21h14" />
              </svg>

              Download Receipt
            </button>
          </div>
        </section>
      )}

      {/* ===================================================== */}
      {/* REJECTED MESSAGE */}
      {/* ===================================================== */}

      {isRejected && (
        <section className="mb-6 rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              >
                <path d="M6 6l12 12" />
                <path d="M18 6L6 18" />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-red-700">
            Goods Receipt Rejected
          </h2>

          <p className="mt-2 text-red-600">
            This Goods Receipt has been rejected.
          </p>
        </section>
      )}

      {/* ===================================================== */}
      {/* RECEIPT LINE ITEMS */}
      {/* ===================================================== */}

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold text-[#06264b]">
          Receipt Line Items
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  Description
                </th>

                <th className="px-4 py-3 text-right">
                  Ordered
                </th>

                <th className="px-4 py-3 text-right">
                  Received
                </th>

                <th className="px-4 py-3 text-right">
                  Accepted
                </th>

                <th className="px-4 py-3 text-right">
                  Rejected
                </th>
              </tr>
            </thead>

            <tbody>
              {receipt.line_items.map((line) => (
                <tr
                  key={line.id}
                  className="border-t"
                >
                  <td className="px-4 py-4">
                    {line.description}
                  </td>

                  <td className="px-4 py-4 text-right">
                    {line.ordered_quantity}
                  </td>

                  <td className="px-4 py-4 text-right">
                    {line.received_quantity}
                  </td>

                  <td
                    className={`px-4 py-4 text-right font-semibold ${
                      isAccepted
                        ? "text-green-600"
                        : ""
                    }`}
                  >
                    {line.accepted_quantity}
                  </td>

                  <td
                    className={`px-4 py-4 text-right font-semibold ${
                      line.rejected_quantity > 0
                        ? "text-red-600"
                        : ""
                    }`}
                  >
                    {line.rejected_quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================================================== */}
      {/* SUBMITTED - APPROVAL CONTROLS */}
      {/* ===================================================== */}

      {isSubmitted && (
        <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[#06264b]">
            Goods Receipt Approval
          </h2>

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Remarks
          </label>

          <textarea
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            rows={4}
            placeholder="Approval / rejection remarks"
          />

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleAccept}
              disabled={loading}
              className="rounded-lg bg-green-600 px-5 py-2.5 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Accepting..." : "Accept"}
            </button>

            <button
              type="button"
              onClick={handleReject}
              disabled={loading}
              className="rounded-lg bg-red-600 px-5 py-2.5 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Rejecting..." : "Reject"}
            </button>
          </div>
        </div>
      )}

      {/* Back Button */}
      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={() =>
            router.push("/dashboard/goods-receipts")
          }
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-blue-600 hover:bg-gray-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>

          Back to Goods Receipts
        </button>
      </div>
    </main>
  );
}

/**
 * Safely format the received date.
 * Handles ISO dates and existing date strings.
 */
function formatDate(
  date?: string | null
) {
  if (!date) {
    return "-";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleDateString("en-GB");
}