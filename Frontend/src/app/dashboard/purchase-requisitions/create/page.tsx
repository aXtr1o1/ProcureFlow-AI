"use client";

import {
  FormEvent,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  createPurchaseRequisition,
} from "@/lib/procurement";

interface Line {
  description: string;
  quantity: string;
  unit_price: string;
}

export default function CreatePRPage() {
  const router = useRouter();

  const [businessNeedId, setBusinessNeedId] =
    useState("");

  const [title, setTitle] =
    useState("");

  const [justification, setJustification] =
    useState("");

  const [lines, setLines] = useState<Line[]>([
    {
      description: "",
      quantity: "1",
      unit_price: "0",
    },
  ]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  function updateLine(
    index: number,
    field: keyof Line,
    value: string
  ) {
    setLines((current) =>
      current.map((line, i) =>
        i === index
          ? {
              ...line,
              [field]: value,
            }
          : line
      )
    );
  }

  function addLine() {
    setLines((current) => [
      ...current,
      {
        description: "",
        quantity: "1",
        unit_price: "0",
      },
    ]);
  }

  function removeLine(index: number) {
    setLines((current) =>
      current.filter(
        (_, i) => i !== index
      )
    );
  }

  async function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const result =
        await createPurchaseRequisition({
          business_need_id:
            Number(businessNeedId),

          title,

          justification,

          line_items: lines.map(
            (line) => ({
              description:
                line.description,

              quantity:
                Number(line.quantity),

              unit_price:
                Number(line.unit_price),
            })
          ),
        });

      router.push(
        `/dashboard/purchase-requisitions/${result.id}`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create PR."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6">
      <h1 className="mb-6 text-2xl font-bold">
        Create Purchase Requisition
      </h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-lg border bg-white p-6"
      >
        <div>
          <label className="mb-1 block text-sm font-medium">
            Business Need ID
          </label>

          <input
            required
            type="number"
            value={businessNeedId}
            onChange={(e) =>
              setBusinessNeedId(
                e.target.value
              )
            }
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Title
          </label>

          <input
            required
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Justification
          </label>

          <textarea
            value={justification}
            onChange={(e) =>
              setJustification(
                e.target.value
              )
            }
            className="min-h-24 w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <div className="mb-3 flex justify-between">
            <h2 className="font-semibold">
              Line Items
            </h2>

            <button
              type="button"
              onClick={addLine}
              className="rounded border px-3 py-1"
            >
              Add Line
            </button>
          </div>

          <div className="space-y-3">
            {lines.map((line, index) => (
              <div
                key={index}
                className="grid gap-3 md:grid-cols-4"
              >
                <input
                  required
                  placeholder="Description"
                  value={line.description}
                  onChange={(e) =>
                    updateLine(
                      index,
                      "description",
                      e.target.value
                    )
                  }
                  className="rounded-lg border px-3 py-2"
                />

                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Quantity"
                  value={line.quantity}
                  onChange={(e) =>
                    updateLine(
                      index,
                      "quantity",
                      e.target.value
                    )
                  }
                  className="rounded-lg border px-3 py-2"
                />

                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Unit Price"
                  value={line.unit_price}
                  onChange={(e) =>
                    updateLine(
                      index,
                      "unit_price",
                      e.target.value
                    )
                  }
                  className="rounded-lg border px-3 py-2"
                />

                <button
                  type="button"
                  onClick={() =>
                    removeLine(index)
                  }
                  disabled={lines.length === 1}
                  className="rounded-lg border border-red-300 px-3 py-2 text-red-600 disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          disabled={loading}
          className="rounded-lg bg-blue-600 px-5 py-2 text-white"
        >
          {loading
            ? "Creating..."
            : "Create Purchase Requisition"}
        </button>
      </form>
    </main>
  );
}