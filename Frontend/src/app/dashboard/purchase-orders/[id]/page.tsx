"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import {
  PurchaseOrder,
  getPurchaseOrder,
  submitPurchaseOrder,
  approvePurchaseOrder,
  rejectPurchaseOrder,
  sendPurchaseOrderToVendor,
  vendorAcceptPurchaseOrder,
  vendorRejectPurchaseOrder,
} from "@/lib/procurement";

import StatusBadge from "@/components/procurement/StatusBadge";
import WorkflowStepper from "@/components/procurement/WorkflowStepper";
import LineItemsTable from "@/components/procurement/LineItemsTable";

export default function PurchaseOrderDetailsPage() {
  const params = useParams();

  /*
   * The URL contains the PO number.
   *
   * Example:
   * /dashboard/purchase-orders/PO-3B8E2B04
   */

  const poNumber = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [po, setPO] =
    useState<PurchaseOrder | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [remarks, setRemarks] =
    useState("");

  /*
   * Load Purchase Order
   */

  async function loadPurchaseOrder() {
    if (!poNumber) {
      setError("Invalid Purchase Order number.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data =
        await getPurchaseOrder(poNumber);

      setPO(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load Purchase Order."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPurchaseOrder();
  }, [poNumber]);

  /*
   * Execute PO action
   */

  async function execute(
    action: () => Promise<unknown>
  ) {
    try {
      setActionLoading(true);
      setError("");

      await action();

      setRemarks("");

      await loadPurchaseOrder();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Action failed."
      );
    } finally {
      setActionLoading(false);
    }
  }

  /*
   * Loading
   */

  if (loading) {
    return (
      <main className="p-6">
        Loading...
      </main>
    );
  }

  /*
   * Not found
   */

  if (!po) {
    return (
      <main className="p-6">
        {error ||
          "Purchase Order not found."}
      </main>
    );
  }

  return (
    <main className="p-6">
      {/* =====================================================
          Workflow
      ====================================================== */}

      <WorkflowStepper
        currentStep="Purchase Order"
      />

      {/* =====================================================
          Header
      ====================================================== */}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {po.po_number}
          </h1>

          <p className="text-gray-500">
            Vendor: {po.vendor_name}
          </p>
        </div>

        <StatusBadge status={po.status} />
      </div>

      {/* =====================================================
          Error
      ====================================================== */}

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* =====================================================
          Financial Information
      ====================================================== */}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-5">
          <p className="text-sm text-gray-500">
            Vendor
          </p>

          <p className="mt-1 font-semibold">
            {po.vendor_name}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-5">
          <p className="text-sm text-gray-500">
            Subtotal
          </p>

          <p className="mt-1 font-semibold">
            {po.currency}{" "}
            {po.subtotal.toLocaleString()}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-5">
          <p className="text-sm text-gray-500">
            Total
          </p>

          <p className="mt-1 text-xl font-bold">
            {po.currency}{" "}
            {po.total_amount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* =====================================================
          Line Items
      ====================================================== */}

      <div className="mt-6 rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">
          PO Line Items
        </h2>

        <LineItemsTable
          items={po.line_items ?? []}
          currency={po.currency}
        />
      </div>

      {/* =====================================================
          Created -> Submit for Approval
      ====================================================== */}

      {po.status === "Created" && (
        <div className="mt-6 rounded-lg border bg-white p-6">
          <h2 className="mb-2 text-lg font-semibold">
            Submit Purchase Order
          </h2>

          <p className="mb-4 text-sm text-gray-500">
            Submit this Purchase Order for approval.
          </p>

          <button
            type="button"
            disabled={actionLoading}
            onClick={() =>
              execute(() =>
                submitPurchaseOrder(po.id)
              )
            }
            className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actionLoading
              ? "Submitting..."
              : "Submit for Approval"}
          </button>
        </div>
      )}

      {/* =====================================================
          Pending Approval -> Approve / Reject
      ====================================================== */}

      {po.status === "Pending Approval" && (
        <div className="mt-6 rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">
            PO Approval
          </h2>

          <textarea
            value={remarks}
            onChange={(event) =>
              setRemarks(event.target.value)
            }
            placeholder="Approval / rejection remarks"
            className="mb-4 w-full rounded-lg border p-3"
            rows={4}
          />

          <div className="flex gap-3">
            <button
              type="button"
              disabled={actionLoading}
              onClick={() =>
                execute(() =>
                  approvePurchaseOrder(
                    po.id,
                    remarks
                  )
                )
              }
              className="rounded-lg bg-green-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading
                ? "Processing..."
                : "Approve"}
            </button>

            <button
              type="button"
              disabled={actionLoading}
              onClick={() =>
                execute(() =>
                  rejectPurchaseOrder(
                    po.id,
                    remarks
                  )
                )
              }
              className="rounded-lg bg-red-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading
                ? "Processing..."
                : "Reject"}
            </button>
          </div>
        </div>
      )}

      {/* =====================================================
          Approved -> Send to Vendor
      ====================================================== */}

      {po.status === "Approved" && (
        <div className="mt-6 rounded-lg border bg-white p-6">
          <h2 className="mb-2 text-lg font-semibold">
            Send PO to Vendor
          </h2>

          <p className="mb-4 text-sm text-gray-500">
            The Purchase Order has been approved.
            Send it to the selected vendor.
          </p>

          <button
            type="button"
            disabled={actionLoading}
            onClick={() =>
              execute(() =>
                sendPurchaseOrderToVendor(
                  po.id
                )
              )
            }
            className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actionLoading
              ? "Sending..."
              : "Send to Vendor"}
          </button>
        </div>
      )}

      {/* =====================================================
          Sent -> Vendor Accept / Reject
      ====================================================== */}

      {po.status === "Sent" && (
        <div className="mt-6 rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">
            Vendor Response
          </h2>

          <textarea
            value={remarks}
            onChange={(event) =>
              setRemarks(event.target.value)
            }
            placeholder="Vendor response remarks"
            className="mb-4 w-full rounded-lg border p-3"
            rows={4}
          />

          <div className="flex gap-3">
            <button
              type="button"
              disabled={actionLoading}
              onClick={() =>
                execute(() =>
                  vendorAcceptPurchaseOrder(
                    po.id,
                    remarks
                  )
                )
              }
              className="rounded-lg bg-green-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading
                ? "Processing..."
                : "Vendor Accepted"}
            </button>

            <button
              type="button"
              disabled={actionLoading}
              onClick={() =>
                execute(() =>
                  vendorRejectPurchaseOrder(
                    po.id,
                    remarks
                  )
                )
              }
              className="rounded-lg bg-red-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading
                ? "Processing..."
                : "Vendor Rejected"}
            </button>
          </div>
        </div>
      )}

      {/* =====================================================
          Vendor Accepted
      ====================================================== */}

      {po.status === "Vendor Accepted" && (
        <div className="mt-6 rounded-lg border bg-white p-6">
          <h2 className="mb-2 text-lg font-semibold">
            Purchase Order Accepted
          </h2>

          <p className="text-sm text-gray-500">
            The vendor has accepted this Purchase
            Order. The next step is Goods Receipt.
          </p>
        </div>
      )}

      {/* =====================================================
          Vendor Rejected
      ====================================================== */}

      {po.status === "Vendor Rejected" && (
        <div className="mt-6 rounded-lg border bg-red-50 p-6">
          <h2 className="mb-2 text-lg font-semibold text-red-800">
            Purchase Order Rejected by Vendor
          </h2>

          <p className="text-sm text-red-700">
            The vendor has rejected this Purchase
            Order.
          </p>
        </div>
      )}

      {/* =====================================================
          Rejected
      ====================================================== */}

      {po.status === "Rejected" && (
        <div className="mt-6 rounded-lg border bg-red-50 p-6">
          <h2 className="mb-2 text-lg font-semibold text-red-800">
            Purchase Order Rejected
          </h2>

          <p className="text-sm text-red-700">
            This Purchase Order was rejected during
            approval.
          </p>
        </div>
      )}
    </main>
  );
}