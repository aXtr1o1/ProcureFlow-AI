"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  BusinessNeedType,
  createBusinessNeed,
  getBusinessNeedTypes,
} from "@/lib/procurement";

export default function CreateBusinessNeedPage() {
  const router = useRouter();

  const [types, setTypes] = useState<BusinessNeedType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    business_need_type_id: "",
    title: "",
    description: "",
    department: "",
    business_unit: "",
    project: "",
    location: "",
    cost_center: "",
    required_by_date: "",
    estimated_value: "0",
    currency: "USD",
  });

  useEffect(() => {
    getBusinessNeedTypes()
      .then(setTypes)
      .catch((err) =>
        setError(err.message)
      );
  }, []);

  function updateField(
    field: string,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const result =
        await createBusinessNeed({
          business_need_type_id:
            Number(form.business_need_type_id),
          title: form.title,
          description: form.description,
          department: form.department,
          business_unit: form.business_unit,
          project: form.project,
          location: form.location,
          cost_center: form.cost_center,
          required_by_date:
            form.required_by_date,
          estimated_value:
            Number(form.estimated_value),
          currency: form.currency,
        });

      router.push(
        `/dashboard/business-needs/${result.id}`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create business need."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6">
      <h1 className="mb-6 text-2xl font-bold">
        Create Business Need
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
            Business Need Type
          </label>

          <select
            required
            value={form.business_need_type_id}
            onChange={(e) =>
              updateField(
                "business_need_type_id",
                e.target.value
              )
            }
            className="w-full rounded-lg border px-3 py-2"
          >
            <option value="">
              Select type
            </option>

            {types.map((type) => (
              <option
                key={type.id}
                value={type.id}
              >
                {type.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Title
          </label>

          <input
            required
            value={form.title}
            onChange={(e) =>
              updateField(
                "title",
                e.target.value
              )
            }
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Description
          </label>

          <textarea
            value={form.description}
            onChange={(e) =>
              updateField(
                "description",
                e.target.value
              )
            }
            className="min-h-24 w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            ["department", "Department"],
            ["business_unit", "Business Unit"],
            ["project", "Project"],
            ["location", "Location"],
            ["cost_center", "Cost Center"],
            [
              "required_by_date",
              "Required By Date",
            ],
          ].map(([field, label]) => (
            <div key={field}>
              <label className="mb-1 block text-sm font-medium">
                {label}
              </label>

              <input
                type={
                  field === "required_by_date"
                    ? "date"
                    : "text"
                }
                value={
                  form[
                    field as keyof typeof form
                  ]
                }
                onChange={(e) =>
                  updateField(
                    field,
                    e.target.value
                  )
                }
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Estimated Value
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={form.estimated_value}
              onChange={(e) =>
                updateField(
                  "estimated_value",
                  e.target.value
                )
              }
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Currency
            </label>

            <input
              value={form.currency}
              onChange={(e) =>
                updateField(
                  "currency",
                  e.target.value.toUpperCase()
                )
              }
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
        </div>

        <button
          disabled={loading}
          className="rounded-lg bg-blue-600 px-5 py-2 text-white disabled:opacity-50"
        >
          {loading
            ? "Creating..."
            : "Create Business Need"}
        </button>
      </form>
    </main>
  );
}