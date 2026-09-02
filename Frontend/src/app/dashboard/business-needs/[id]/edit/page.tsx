"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  BusinessNeed,
  BusinessNeedPayload,
  getBusinessNeed,
  getBusinessNeedTypes,
  updateBusinessNeed,
} from "@/lib/procurement";

export default function EditBusinessNeedPage() {
  const params = useParams();
  const router = useRouter();

  const id = Number(params.id);

  const [item, setItem] = useState<BusinessNeed | null>(null);
  const [types, setTypes] = useState<
    Awaited<ReturnType<typeof getBusinessNeedTypes>>
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    estimated_value: "",
    currency: "USD",
  });

  useEffect(() => {
    if (!id || Number.isNaN(id)) {
      setError("Invalid Business Need ID.");
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [businessNeed, businessNeedTypes] =
          await Promise.all([
            getBusinessNeed(id),
            getBusinessNeedTypes(),
          ]);

        setItem(businessNeed);
        setTypes(businessNeedTypes);

        setForm({
          business_need_type_id:
            String(businessNeed.business_need_type.id),

          title: businessNeed.title || "",

          description:
            businessNeed.description || "",

          department:
            businessNeed.department || "",

          business_unit:
            businessNeed.business_unit || "",

          project:
            businessNeed.project || "",

          location:
            businessNeed.location || "",

          cost_center:
            businessNeed.cost_center || "",

          required_by_date:
            businessNeed.required_by_date || "",

          estimated_value:
            String(businessNeed.estimated_value ?? ""),

          currency:
            businessNeed.currency || "USD",
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load Business Need."
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  function handleChange(
    field: keyof typeof form,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!item) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload: BusinessNeedPayload = {
        business_need_type_id: Number(
          form.business_need_type_id
        ),

        title: form.title.trim(),

        description:
          form.description.trim() || undefined,

        department:
          form.department.trim() || undefined,

        business_unit:
          form.business_unit.trim() || undefined,

        project:
          form.project.trim() || undefined,

        location:
          form.location.trim() || undefined,

        cost_center:
          form.cost_center.trim() || undefined,

        required_by_date:
          form.required_by_date || undefined,

        estimated_value: Number(
          form.estimated_value
        ),

        currency: form.currency,
      };

      await updateBusinessNeed(id, payload);

      router.push(
        `/dashboard/business-needs/${id}`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update Business Need."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="p-6">
        <p>Loading Business Need...</p>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="p-6">
        <div className="rounded-lg bg-red-50 p-4 text-red-700">
          {error || "Business Need not found."}
        </div>
      </main>
    );
  }

  return (
    <main className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Edit Business Need
        </h1>

        <p className="mt-1 text-gray-500">
          {item.need_number}
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-6 text-lg font-semibold">
            Business Need Information
          </h2>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Business Need Type */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Business Need Type
              </label>

              <select
                value={form.business_need_type_id}
                onChange={(event) =>
                  handleChange(
                    "business_need_type_id",
                    event.target.value
                  )
                }
                required
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="">
                  Select Type
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

            {/* Title */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Title
              </label>

              <input
                type="text"
                value={form.title}
                onChange={(event) =>
                  handleChange(
                    "title",
                    event.target.value
                  )
                }
                required
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium">
                Description
              </label>

              <textarea
                value={form.description}
                onChange={(event) =>
                  handleChange(
                    "description",
                    event.target.value
                  )
                }
                rows={4}
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>

            {/* Department */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Department
              </label>

              <input
                type="text"
                value={form.department}
                onChange={(event) =>
                  handleChange(
                    "department",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>

            {/* Business Unit */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Business Unit
              </label>

              <input
                type="text"
                value={form.business_unit}
                onChange={(event) =>
                  handleChange(
                    "business_unit",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>

            {/* Project */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Project
              </label>

              <input
                type="text"
                value={form.project}
                onChange={(event) =>
                  handleChange(
                    "project",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>

            {/* Location */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Location
              </label>

              <input
                type="text"
                value={form.location}
                onChange={(event) =>
                  handleChange(
                    "location",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>

            {/* Cost Center */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Cost Center
              </label>

              <input
                type="text"
                value={form.cost_center}
                onChange={(event) =>
                  handleChange(
                    "cost_center",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>

            {/* Required By Date */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Required By Date
              </label>

              <input
                type="date"
                value={form.required_by_date}
                onChange={(event) =>
                  handleChange(
                    "required_by_date",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>

            {/* Estimated Value */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Estimated Value
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={form.estimated_value}
                onChange={(event) =>
                  handleChange(
                    "estimated_value",
                    event.target.value
                  )
                }
                required
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>

            {/* Currency */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Currency
              </label>

              <select
                value={form.currency}
                onChange={(event) =>
                  handleChange(
                    "currency",
                    event.target.value
                  )
                }
                required
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="USD">USD</option>
                <option value="INR">INR</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() =>
              router.push(
                `/dashboard/business-needs/${id}`
              )
            }
            className="rounded-lg border px-4 py-2"
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-5 py-2 text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </main>
  );
}