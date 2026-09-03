"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  PurchaseRequisition,
  getPurchaseRequisitions,
} from "@/lib/procurement";

import StatusBadge from "@/components/procurement/StatusBadge";

export default function PurchaseRequisitionsPage() {
  const [items, setItems] = useState<PurchaseRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getPurchaseRequisitions()
      .then(setItems)
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load purchase requisitions."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Purchase Requisitions
          </h1>

          <p className="text-sm text-gray-500">
            Manage PRs and procurement approvals.
          </p>
        </div>

        <Link
          href="/dashboard/purchase-requisitions/create"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create Purchase Requisition
        </Link>
      </div>

      {loading && (
        <p>Loading purchase requisitions...</p>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  PR Number
                </th>

                <th className="px-4 py-3 text-left">
                  Title
                </th>

                <th className="px-4 py-3 text-left">
                  Vendor
                </th>

                <th className="px-4 py-3 text-right">
                  Amount
                </th>

                <th className="px-4 py-3 text-left">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No purchase requisitions found.
                  </td>
                </tr>
              ) : (
                items.map((pr) => (
                  <tr
                    key={pr.id}
                    className="border-t hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/purchase-requisitions/${pr.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {pr.pr_number}
                      </Link>
                    </td>

                    <td className="px-4 py-3">
                      {pr.title}
                    </td>

                    <td className="px-4 py-3">
                      {pr.selected_vendor_name || "-"}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {pr.currency}{" "}
                      {pr.total_amount.toLocaleString()}
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge status={pr.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}