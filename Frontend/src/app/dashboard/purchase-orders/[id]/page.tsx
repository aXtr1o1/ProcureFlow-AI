"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import {
  PurchaseOrder,
  getPurchaseOrder,
} from "@/lib/procurement";

import StatusBadge from "@/components/procurement/StatusBadge";
import WorkflowStepper from "@/components/procurement/WorkflowStepper";
import LineItemsTable from "@/components/procurement/LineItemsTable";

export default function PurchaseOrderDetailsPage() {
  const params = useParams();

  const id = Number(params.id);

  const [po, setPO] =
    useState<PurchaseOrder | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    getPurchaseOrder(id)
      .then(setPO)
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

  if (!po) {
    return (
      <main className="p-6">
        {error || "Purchase Order not found."}
      </main>
    );
  }

  return (
    <main className="p-6">
      <WorkflowStepper
        currentStep="Purchase Order"
      />

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

      <div className="mt-6 rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">
          PO Line Items
        </h2>

        <LineItemsTable
          items={po.line_items}
          currency={po.currency}
        />
      </div>
    </main>
  );
}