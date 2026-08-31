"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  createPurchaseOrderFromPR,
} from "@/lib/procurement";

export default function CreatePurchaseOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPRId =
    searchParams.get("prId") ||
    searchParams.get("purchaseRequisitionId") ||
    "";

  const [
    purchaseRequisitionId,
    setPurchaseRequisitionId,
  ] = useState(initialPRId);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleCreate() {
    setError("");

    if (!purchaseRequisitionId.trim()) {
      setError(
        "Purchase Requisition ID is required."
      );
      return;
    }

    const prId = Number(
      purchaseRequisitionId
    );

    if (
      !Number.isInteger(prId) ||
      prId <= 0
    ) {
      setError(
        "Please enter a valid Purchase Requisition ID."
      );
      return;
    }

    setLoading(true);

    try {
      const result =
        await createPurchaseOrderFromPR(
          prId
        );

      /*
       * Backend returns the PO number.
       *
       * GET /purchase-orders/{po_number}
       * expects the PO number, not the database ID.
       */

      router.push(
        `/dashboard/purchase-orders/${encodeURIComponent(
          result.po_number
        )}`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create Purchase Order."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-3xl">

        {/* Page Header */}

        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            Create Purchase Order
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Create a Purchase Order from an
            approved Purchase Requisition.
          </p>
        </div>

        {/* Error */}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        {/* Create PO */}

        <section className="rounded-xl border bg-white p-6 shadow-sm">

          <h2 className="mb-2 text-lg font-semibold">
            Purchase Requisition
          </h2>

          <p className="mb-6 text-sm text-gray-500">
            Select an approved Purchase
            Requisition to generate the Purchase
            Order.
          </p>

          <div>
            <label
              htmlFor="purchaseRequisitionId"
              className="mb-2 block text-sm font-medium"
            >
              Purchase Requisition ID
            </label>

            <input
              id="purchaseRequisitionId"
              type="number"
              min="1"
              value={purchaseRequisitionId}
              onChange={(event) =>
                setPurchaseRequisitionId(
                  event.target.value
                )
              }
              placeholder="Enter PR ID"
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />

            <p className="mt-2 text-xs text-gray-500">
              The PR must be approved before a
              Purchase Order can be created.
            </p>
          </div>

          {/* Information */}

          <div className="mt-6 rounded-lg bg-gray-50 p-4">
            <h3 className="text-sm font-semibold">
              PO information
            </h3>

            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              <li>
                • Vendor information comes from
                the approved PR.
              </li>

              <li>
                • Currency comes from the PR.
              </li>

              <li>
                • Line items come from the PR.
              </li>

              <li>
                • The backend generates the PO
                number.
              </li>

              <li>
                • The created PO starts in the
                Created state.
              </li>
            </ul>
          </div>

          {/* Actions */}

          <div className="mt-6 flex justify-end gap-3">

            <button
              type="button"
              disabled={loading}
              onClick={() =>
                router.back()
              }
              className="rounded-lg border px-5 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={handleCreate}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Creating..."
                : "Create Purchase Order"}
            </button>

          </div>
        </section>
      </div>
    </main>
  );
}