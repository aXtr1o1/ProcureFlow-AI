"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  createGoodsReceipt,
  getPurchaseOrder,
  PurchaseOrder,
} from "@/lib/procurement";

interface ReceiptLine {
  purchase_order_line_id: number;
  description: string;
  ordered_quantity: number;
  received_quantity: string;
  accepted_quantity: string;
  rejected_quantity: string;
  remarks: string;
}

export default function CreateGoodsReceiptPage() {
  const router = useRouter();

  const [purchaseOrderId, setPurchaseOrderId] =
    useState("");

  const [purchaseOrder, setPurchaseOrder] =
    useState<PurchaseOrder | null>(null);

  const [receiptType, setReceiptType] =
    useState("FULL");

  const [receivedDate, setReceivedDate] =
    useState(
      new Date()
        .toISOString()
        .split("T")[0]
    );

  const [remarks, setRemarks] =
    useState("");

  const [lineItems, setLineItems] =
    useState<ReceiptLine[]>([]);

  const [loadingPO, setLoadingPO] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function loadPurchaseOrder() {
    if (!purchaseOrderId) {
      setError(
        "Enter a Purchase Order ID."
      );
      return;
    }

    setLoadingPO(true);
    setError("");
    setPurchaseOrder(null);
    setLineItems([]);

    try {
      const po =
        await getPurchaseOrder(
          Number(purchaseOrderId)
        );

      setPurchaseOrder(po);

      setLineItems(
        po.line_items.map((item) => ({
          purchase_order_line_id:
            item.id,

          description:
            item.description,

          ordered_quantity:
            Number(item.quantity),

          received_quantity:
            "0",

          accepted_quantity:
            "0",

          rejected_quantity:
            "0",

          remarks: "",
        }))
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load Purchase Order."
      );
    } finally {
      setLoadingPO(false);
    }
  }

  function updateLine(
    index: number,
    field:
      | "received_quantity"
      | "accepted_quantity"
      | "rejected_quantity"
      | "remarks",
    value: string
  ) {
    setLineItems((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index
          ? {
              ...line,
              [field]: value,
            }
          : line
      )
    );
  }

  function validateLines() {
    for (
      let index = 0;
      index < lineItems.length;
      index++
    ) {
      const line = lineItems[index];

      const received =
        Number(
          line.received_quantity
        );

      const accepted =
        Number(
          line.accepted_quantity
        );

      const rejected =
        Number(
          line.rejected_quantity
        );

      if (
        received < 0 ||
        accepted < 0 ||
        rejected < 0
      ) {
        throw new Error(
          `Line ${index + 1}: quantities cannot be negative.`
        );
      }

      if (
        accepted + rejected >
        received
      ) {
        throw new Error(
          `Line ${index + 1}: accepted + rejected quantity cannot exceed received quantity.`
        );
      }

      if (
        received >
        line.ordered_quantity
      ) {
        throw new Error(
          `Line ${index + 1}: received quantity cannot exceed ordered quantity.`
        );
      }
    }
  }

  async function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    setError("");

    if (!purchaseOrder) {
      setError(
        "Load a Purchase Order before creating the receipt."
      );
      return;
    }

    try {
      validateLines();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid receipt quantities."
      );
      return;
    }

    setLoading(true);

    try {
      const result =
        await createGoodsReceipt({
          purchase_order_id:
            purchaseOrder.id,

          receipt_type:
            receiptType,

          received_date:
            receivedDate,

          remarks:
            remarks.trim() || null,

          line_items:
            lineItems.map((line) => ({
              purchase_order_line_id:
                line.purchase_order_line_id,

              description:
                line.description,

              ordered_quantity:
                line.ordered_quantity,

              received_quantity:
                Number(
                  line.received_quantity
                ),

              accepted_quantity:
                Number(
                  line.accepted_quantity
                ),

              rejected_quantity:
                Number(
                  line.rejected_quantity
                ),

              remarks:
                line.remarks.trim() || null,
            })),
        });

      router.push(
        `/dashboard/goods-receipts/${result.id}`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create Goods Receipt."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Create Goods Receipt
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Record goods or services received against a Purchase Order.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Purchase Order Selection */}
      <section className="mb-6 rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">
          Purchase Order
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Purchase Order ID
            </label>

            <input
              type="number"
              min="1"
              value={purchaseOrderId}
              onChange={(event) =>
                setPurchaseOrderId(
                  event.target.value
                )
              }
              className="w-full rounded-lg border px-3 py-2"
              placeholder="PO ID"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              disabled={
                loadingPO ||
                !purchaseOrderId
              }
              onClick={loadPurchaseOrder}
              className="rounded-lg bg-blue-600 px-5 py-2 text-white disabled:opacity-50"
            >
              {loadingPO
                ? "Loading..."
                : "Load Purchase Order"}
            </button>
          </div>
        </div>

        {purchaseOrder && (
          <div className="mt-5 grid gap-4 rounded-lg bg-gray-50 p-4 md:grid-cols-4">
            <div>
              <p className="text-xs text-gray-500">
                PO Number
              </p>

              <p className="font-semibold">
                {purchaseOrder.po_number}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Vendor
              </p>

              <p className="font-semibold">
                {purchaseOrder.vendor_name}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Currency
              </p>

              <p className="font-semibold">
                {purchaseOrder.currency}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Total
              </p>

              <p className="font-semibold">
                {purchaseOrder.currency}{" "}
                {purchaseOrder.total_amount.toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Receipt Details */}
      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <section className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">
            Receipt Details
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Receipt Type
              </label>

              <select
                value={receiptType}
                onChange={(event) =>
                  setReceiptType(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="FULL">
                  Full Receipt
                </option>

                <option value="PARTIAL">
                  Partial Receipt
                </option>

                <option value="SERVICE">
                  Service Receipt
                </option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Received Date
              </label>

              <input
                required
                type="date"
                value={receivedDate}
                onChange={(event) =>
                  setReceivedDate(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                General Remarks
              </label>

              <input
                value={remarks}
                onChange={(event) =>
                  setRemarks(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border px-3 py-2"
                placeholder="Optional remarks"
              />
            </div>
          </div>
        </section>

        {/* Receipt Lines */}
        {purchaseOrder && (
          <section className="rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">
              Received Items
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left">
                      Description
                    </th>

                    <th className="px-3 py-3 text-right">
                      Ordered
                    </th>

                    <th className="px-3 py-3 text-right">
                      Received
                    </th>

                    <th className="px-3 py-3 text-right">
                      Accepted
                    </th>

                    <th className="px-3 py-3 text-right">
                      Rejected
                    </th>

                    <th className="px-3 py-3 text-left">
                      Remarks
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {lineItems.map(
                    (line, index) => (
                      <tr
                        key={
                          line.purchase_order_line_id
                        }
                        className="border-t"
                      >
                        <td className="px-3 py-3">
                          {line.description}
                        </td>

                        <td className="px-3 py-3 text-right">
                          {
                            line.ordered_quantity
                          }
                        </td>

                        <td className="px-3 py-3">
                          <input
                            required
                            type="number"
                            min="0"
                            max={
                              line.ordered_quantity
                            }
                            step="0.01"
                            value={
                              line.received_quantity
                            }
                            onChange={(event) =>
                              updateLine(
                                index,
                                "received_quantity",
                                event.target.value
                              )
                            }
                            className="w-24 rounded border px-2 py-1 text-right"
                          />
                        </td>

                        <td className="px-3 py-3">
                          <input
                            required
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              line.accepted_quantity
                            }
                            onChange={(event) =>
                              updateLine(
                                index,
                                "accepted_quantity",
                                event.target.value
                              )
                            }
                            className="w-24 rounded border px-2 py-1 text-right"
                          />
                        </td>

                        <td className="px-3 py-3">
                          <input
                            required
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              line.rejected_quantity
                            }
                            onChange={(event) =>
                              updateLine(
                                index,
                                "rejected_quantity",
                                event.target.value
                              )
                            }
                            className="w-24 rounded border px-2 py-1 text-right"
                          />
                        </td>

                        <td className="px-3 py-3">
                          <input
                            value={
                              line.remarks
                            }
                            onChange={(event) =>
                              updateLine(
                                index,
                                "remarks",
                                event.target.value
                              )
                            }
                            className="min-w-40 rounded border px-2 py-1"
                            placeholder="Optional"
                          />
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() =>
              router.back()
            }
            className="rounded-lg border px-5 py-2"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={
              loading ||
              !purchaseOrder ||
              lineItems.length === 0
            }
            className="rounded-lg bg-blue-600 px-5 py-2 text-white disabled:opacity-50"
          >
            {loading
              ? "Creating..."
              : "Create Goods Receipt"}
          </button>
        </div>
      </form>
    </main>
  );
}