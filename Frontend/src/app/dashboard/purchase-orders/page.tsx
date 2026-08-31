"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  PurchaseOrder,
  getPurchaseOrders,
} from "@/lib/procurement";

import StatusBadge from "@/components/procurement/StatusBadge";

export default function PurchaseOrdersPage() {
  const [items, setItems] =
    useState<PurchaseOrder[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    getPurchaseOrders()
      .then(setItems)
      .catch((err) =>
        setError(err.message)
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Purchase Orders
        </h1>

        <p className="text-sm text-gray-500">
          Manage procurement purchase orders.
        </p>
      </div>

      {loading && <p>Loading...</p>}

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  PO Number
                </th>

                <th className="px-4 py-3 text-left">
                  Vendor
                </th>

                <th className="px-4 py-3 text-right">
                  Total
                </th>

                <th className="px-4 py-3 text-left">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {items.map((po) => (
                <tr
                  key={po.id}
                  className="border-t"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/purchase-orders/${po.id}`}
                      className="font-medium text-blue-600"
                    >
                      {po.po_number}
                    </Link>
                  </td>

                  <td className="px-4 py-3">
                    {po.vendor_name}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {po.currency}{" "}
                    {po.total_amount.toLocaleString()}
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge
                      status={po.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}