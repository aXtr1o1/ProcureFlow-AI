"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  PurchaseRequisition,
  getPurchaseRequisition,
  submitPurchaseRequisition,
  approvePurchaseRequisition,
  rejectPurchaseRequisition,
  selectVendor,
  recordNegotiation,
} from "@/lib/procurement";

import StatusBadge from "@/components/procurement/StatusBadge";
import WorkflowStepper from "@/components/procurement/WorkflowStepper";
import LineItemsTable from "@/components/procurement/LineItemsTable";
import SearchableSelect from "@/components/procurement/SearchableSelect";

export default function PRDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const id = Number(params.id);

  const [pr, setPR] =
    useState<PurchaseRequisition | null>(
      null
    );

  const [remarks, setRemarks] =
    useState("");

  const [vendor, setVendor] =
    useState("");

  const [negotiatedAmount, setNegotiatedAmount] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function load() {
    try {
      setPR(
        await getPurchaseRequisition(id)
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load PR."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function execute(
    action: () => Promise<unknown>
  ) {
    setActionLoading(true);
    setError("");

    try {
      await action();
      setRemarks("");
      await load();
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

  if (loading) {
    return (
      <main className="p-6">
        Loading...
      </main>
    );
  }

  if (!pr) {
    return (
      <main className="p-6">
        {error || "PR not found."}
      </main>
    );
  }

  const vendorSelected = Boolean(
    pr.selected_vendor_name?.trim()
  );

  const vendorOptions = [
    ...(vendorSelected &&
    pr.selected_vendor_name &&
    pr.selected_vendor_name !== "Redefine Properties"
      ? [
          {
            value: pr.selected_vendor_name,
            label: pr.selected_vendor_name,
          },
        ]
      : []),
    {
      value: "Redefine Properties",
      label: "Redefine Properties",
    },
  ];

  function round2(n: number) {
    return Math.round(n * 100) / 100;
  }

  const originalAmount = Number(pr.total_amount || 0);
  const negotiatedValue = Number(negotiatedAmount || 0);
  const variance =
    negotiatedValue > 0
      ? round2(originalAmount - negotiatedValue)
      : null;
  const variancePct =
    variance != null && originalAmount > 0
      ? round2((variance / originalAmount) * 100)
      : null;
  const totalQty = (pr.line_items || []).reduce(
    (sum, line) => sum + Number(line.quantity || 0),
    0
  );
  const impliedUnit =
    negotiatedValue > 0 && totalQty > 0
      ? round2(negotiatedValue / totalQty)
      : null;
  const exceedsOriginal =
    negotiatedValue > 0 && negotiatedValue > originalAmount;

  return (
    <main className="p-6">
      <WorkflowStepper
        currentStep={
          pr.status === "Draft" ||
          pr.status === "Submitted"
            ? "Purchase Requisition"
            : pr.status === "Approved"
            ? "Approval"
            : "Purchase Order"
        }
      />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {pr.pr_number}
          </h1>

          <p className="text-gray-500">
            {pr.title}
          </p>
        </div>

        <StatusBadge
          status={pr.status}
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-5">
          <p className="text-sm text-gray-500">
            Total Amount
          </p>

          <p className="mt-1 text-xl font-bold">
            {pr.currency}{" "}
            {pr.total_amount.toLocaleString()}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-5">
          <p className="text-sm text-gray-500">
            Selected Vendor
          </p>

          <p className="mt-1 font-semibold">
            {pr.selected_vendor_name ||
              "Not selected"}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-5">
          <p className="text-sm text-gray-500">
            Negotiated Amount
          </p>

          <p className="mt-1 font-semibold">
            {pr.negotiated_amount != null
              ? `${pr.currency} ${pr.negotiated_amount.toLocaleString()}`
              : "Not negotiated"}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">
          Line Items
        </h2>

        <LineItemsTable
          items={pr.line_items}
          currency={pr.currency}
        />
      </div>

      {/* Submit */}
      {pr.status === "Draft" && (
        <div className="mt-6 rounded-lg border bg-white p-6">
          <h2 className="mb-3 text-lg font-semibold">
            Submit PR
          </h2>

          <button
            disabled={actionLoading}
            onClick={() =>
              execute(() =>
                submitPurchaseRequisition(id)
              )
            }
            className="rounded-lg bg-blue-600 px-4 py-2 text-white"
          >
            Submit for Approval
          </button>
        </div>
      )}

      {/* Approval */}
      {pr.status === "Submitted" && (
        <div className="mt-6 rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">
            PR Approval
          </h2>

          <textarea
            placeholder="Approval / rejection remarks"
            value={remarks}
            onChange={(e) =>
              setRemarks(e.target.value)
            }
            className="mb-4 w-full rounded-lg border p-3"
          />

          <div className="flex gap-3">
            <button
              disabled={actionLoading}
              onClick={() =>
                execute(() =>
                  approvePurchaseRequisition(
                    id,
                    remarks
                  )
                )
              }
              className="rounded-lg bg-green-600 px-4 py-2 text-white"
            >
              Approve
            </button>

            <button
              disabled={actionLoading}
              onClick={() =>
                execute(() =>
                  rejectPurchaseRequisition(
                    id,
                    remarks
                  )
                )
              }
              className="rounded-lg bg-red-600 px-4 py-2 text-white"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Vendor */}
      {pr.status === "Approved" && (
        <div className="mt-6 rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">
            Vendor Selection
          </h2>

          <div className="flex gap-3">
            <div
              className={
                vendorSelected || actionLoading
                  ? "pointer-events-none flex-1 opacity-70"
                  : "flex-1"
              }
            >
              <SearchableSelect
                value={
                  vendorSelected
                    ? pr.selected_vendor_name ?? ""
                    : vendor
                }
                onChange={(name) => setVendor(name)}
                options={vendorOptions}
                placeholder="Select vendor"
                searchPlaceholder="Search vendor..."
                required={!vendorSelected}
              />
            </div>

            <button
              disabled={
                actionLoading ||
                !vendor.trim() ||
                vendorSelected
              }
              onClick={() =>
                execute(() =>
                  selectVendor(
                    id,
                    vendor
                  )
                )
              }
              className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {vendorSelected
                ? "Vendor Selected"
                : "Select Vendor"}
            </button>
          </div>
        </div>
      )}

      {/* Negotiation */}
      {pr.status === "Approved" &&
        pr.selected_vendor_name && (
          <div className="mt-6 rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">
              Negotiation
            </h2>

            <div className="mb-4 space-y-1 text-sm text-gray-600">
              <p>
                Original amount: {pr.currency}{" "}
                {originalAmount.toLocaleString()}
              </p>
              {variance != null && (
                <>
                  <p>
                    Price variance: {pr.currency}{" "}
                    {variance.toLocaleString()}
                    {variancePct != null
                      ? ` (${variancePct}%)`
                      : ""}
                  </p>
                  {impliedUnit != null && (
                    <p>
                      Implied avg unit (negotiated ÷ qty):{" "}
                      {pr.currency} {impliedUnit.toLocaleString()}
                    </p>
                  )}
                </>
              )}
              {exceedsOriginal && (
                <p className="text-red-600">
                  Negotiated amount cannot exceed the original
                  PR amount.
                </p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <input
                type="number"
                min="0"
                step="0.01"
                max={originalAmount || undefined}
                value={negotiatedAmount}
                onChange={(e) =>
                  setNegotiatedAmount(
                    e.target.value
                  )
                }
                placeholder="Negotiated amount"
                className="rounded-lg border px-3 py-2"
              />

              <input
                value={remarks}
                onChange={(e) =>
                  setRemarks(e.target.value)
                }
                placeholder="Negotiation remarks"
                className="rounded-lg border px-3 py-2"
              />
            </div>

            <button
              disabled={
                actionLoading ||
                !negotiatedAmount ||
                Number(negotiatedAmount) <= 0 ||
                exceedsOriginal
              }
              onClick={async () => {
                setActionLoading(true);
                setError("");

                try {
                  await recordNegotiation(
                    id,
                    Number(negotiatedAmount),
                    remarks
                  );

                  router.push(
                    `/dashboard/purchase-orders/create?purchaseRequisitionId=${id}`
                  );
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "Failed to record negotiation."
                  );
                } finally {
                  setActionLoading(false);
                }
              }}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {actionLoading
                ? "Recording..."
                : "Record Negotiation"}
            </button>
          </div>
        )}
    </main>
  );
}