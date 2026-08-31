"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  GoodsReceipt,
  getGoodsReceipts,
} from "@/lib/procurement";

import StatusBadge from "@/components/procurement/StatusBadge";

export default function GoodsReceiptsPage() {
  const [items, setItems] =
    useState<GoodsReceipt[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    getGoodsReceipts()
      .then(setItems)
      .catch((err) =>
        setError(err.message)
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="p-6">
      <div className="mb-6 flex justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Goods Receipts
          </h1>

          <p className="text-sm text-gray-500">
            Track received goods and services.
          </p>
        </div>

        <Link
          href="/dashboard/goods-receipts/create"
          className="rounded-lg bg-blue-600 px-4 py-2 text-white"
        >
          Create Receipt
        </Link>
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
                  Receipt Number
                </th>

                <th className="px-4 py-3 text-left">
                  Type
                </th>

                <th className="px-4 py-3 text-left">
                  Received Date
                </th>

                <th className="px-4 py-3 text-left">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {items.map((receipt) => (
                <tr
                  key={receipt.id}
                  className="border-t"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/goods-receipts/${receipt.id}`}
                      className="font-medium text-blue-600"
                    >
                      {receipt.receipt_number}
                    </Link>
                  </td>

                  <td className="px-4 py-3">
                    {receipt.receipt_type}
                  </td>

                  <td className="px-4 py-3">
                    {new Date(
                      receipt.received_date
                    ).toLocaleDateString()}
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge
                      status={receipt.status}
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