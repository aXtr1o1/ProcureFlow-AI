"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import {
  PurchaseRequisition,
  createPurchaseOrderFromPR,
  getPurchaseOrders,
  getPurchaseRequisitions,
} from "@/lib/procurement";

export default function CreatePurchaseOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPRId =
    searchParams.get("prId") ||
    searchParams.get("purchaseRequisitionId") ||
    "";

  const [purchaseRequisitionId, setPurchaseRequisitionId] =
    useState(initialPRId);

  const [approvedPRs, setApprovedPRs] = useState<
    PurchaseRequisition[]
  >([]);

  const [loadingPRs, setLoadingPRs] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      getPurchaseRequisitions(),
      getPurchaseOrders(),
    ])
      .then(([items, purchaseOrders]) => {
        const preSendStatuses = new Set([
          "Created",
          "Pending Approval",
          "Approved",
        ]);

        const prIdsWithPreSendPO = new Set(
          purchaseOrders
            .filter((po) =>
              preSendStatuses.has(po.status)
            )
            .map((po) => po.purchase_requisition_id)
        );

        const available = items.filter(
          (pr) =>
            pr.status?.toLowerCase() === "approved" &&
            Boolean(pr.selected_vendor_name) &&
            pr.negotiated_amount != null &&
            !prIdsWithPreSendPO.has(pr.id)
        );

        setApprovedPRs(available);

        if (
          initialPRId &&
          available.some((pr) => String(pr.id) === initialPRId)
        ) {
          setPurchaseRequisitionId(initialPRId);
        } else if (available.length === 1) {
          setPurchaseRequisitionId(String(available[0].id));
        } else if (
          initialPRId &&
          !available.some((pr) => String(pr.id) === initialPRId)
        ) {
          setPurchaseRequisitionId("");
        }
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load Purchase Requisitions."
        );
      })
      .finally(() => setLoadingPRs(false));
  }, [initialPRId]);

  const selectedPR = useMemo(
    () =>
      approvedPRs.find(
        (pr) => String(pr.id) === purchaseRequisitionId
      ) ?? null,
    [approvedPRs, purchaseRequisitionId]
  );

  async function handleCreate() {
    setError("");

    if (!purchaseRequisitionId.trim()) {
      setError("Please select an approved Purchase Requisition.");
      return;
    }

    const prId = Number(purchaseRequisitionId);

    if (!Number.isInteger(prId) || prId <= 0) {
      setError("Please select a valid Purchase Requisition.");
      return;
    }

    setLoading(true);

    try {
      const result = await createPurchaseOrderFromPR(prId);

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
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            Create Purchase Order
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Create a Purchase Order from an approved Purchase
            Requisition.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold">
            Purchase Requisition
          </h2>

          <p className="mb-6 text-sm text-gray-500">
            Select one of your approved Purchase Requisitions to
            generate the Purchase Order.
          </p>

          <div>
            <label
              htmlFor="purchaseRequisitionId"
              className="mb-2 block text-sm font-medium"
            >
              Approved Purchase Requisition
            </label>

            {loadingPRs ? (
              <p className="text-sm text-gray-500">
                Loading your approved PRs...
              </p>
            ) : approvedPRs.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-800">
                  No approved Purchase Requisitions available for
                  PO creation. Create and approve a PR (with vendor
                  and negotiated amount), or all eligible PRs may
                  already have a Purchase Order.
                </p>
                <Link
                  href="/dashboard/purchase-requisitions"
                  className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline"
                >
                  Go to Purchase Requisitions →
                </Link>
              </div>
            ) : (
              <>
                <select
                  id="purchaseRequisitionId"
                  value={purchaseRequisitionId}
                  onChange={(event) =>
                    setPurchaseRequisitionId(event.target.value)
                  }
                  className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a Purchase Requisition</option>
                  {approvedPRs.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.pr_number}
                      {pr.title ? ` — ${pr.title}` : ""}
                      {pr.selected_vendor_name
                        ? ` (${pr.selected_vendor_name})`
                        : ""}
                    </option>
                  ))}
                </select>

                {selectedPR && (
                  <div className="mt-3 rounded-lg border bg-gray-50 p-3 text-sm text-gray-600">
                    <p>
                      <span className="font-medium text-gray-800">
                        Vendor:
                      </span>{" "}
                      {selectedPR.selected_vendor_name || "—"}
                    </p>
                    <p className="mt-1">
                      <span className="font-medium text-gray-800">
                        Negotiated amount:
                      </span>{" "}
                      {selectedPR.negotiated_amount != null
                        ? `${selectedPR.currency || "USD"} ${selectedPR.negotiated_amount}`
                        : "—"}
                    </p>
                  </div>
                )}
              </>
            )}

            <p className="mt-2 text-xs text-gray-500">
              Approved PRs are listed when they have no PO still
              waiting to be sent to the vendor. After a PO is
              Sent, you can create another PO for the same PR
              (or another PR under the same Business Need).
            </p>
          </div>

          <div className="mt-6 rounded-lg bg-gray-50 p-4">
            <h3 className="text-sm font-semibold">PO information</h3>

            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              <li>• Vendor information comes from the approved PR.</li>
              <li>• Currency comes from the PR.</li>
              <li>• Line items come from the PR.</li>
              <li>• The backend generates the PO number.</li>
              <li>• The created PO starts in the Created state.</li>
            </ul>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => router.back()}
              className="rounded-lg border px-5 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={
                loading ||
                loadingPRs ||
                approvedPRs.length === 0 ||
                !purchaseRequisitionId
              }
              onClick={handleCreate}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Purchase Order"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
