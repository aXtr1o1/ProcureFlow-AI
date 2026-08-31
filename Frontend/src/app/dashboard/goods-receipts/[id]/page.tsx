"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import {
  GoodsReceipt,
  getGoodsReceipt,
} from "@/lib/procurement";

import StatusBadge from "@/components/procurement/StatusBadge";
import WorkflowStepper from "@/components/procurement/WorkflowStepper";

export default function GoodsReceiptDetailsPage() {
  const params = useParams();

  const id = Number(params.id);

  const [receipt, setReceipt] =
    useState<GoodsReceipt | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    getGoodsReceipt(id)
      .then(setReceipt)
      .catch((err) =>
        setError(err.message)
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main className="p-6">
        Loading...
      </main>
    );
  }

  if (!receipt) {
    return (
      <main className="p-6">
        {error || "Goods Receipt not found."}
      </main>
    );
  }

  return (
    <main className="p-6">
      <WorkflowStepper
        currentStep="Goods Receipt"
      />

      <div className="mb-6 flex justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {receipt.receipt_number}
          </h1>

          <p className="text-gray-500">
            Purchase Order ID:{" "}
            {receipt.purchase_order_id}
          </p>
        </div>

        <StatusBadge
          status={receipt.status}
        />
      </div>

      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">
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
              {receipt.line_items.map(
                (line) => (
                  <tr
                    key={line.id}
                    className="border-t"
                  >
                    <td className="px-4 py-3">
                      {line.description}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {line.ordered_quantity}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {line.received_quantity}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {line.accepted_quantity}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {line.rejected_quantity}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}