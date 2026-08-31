"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import {
  BusinessNeed,
  getBusinessNeed,
  submitBusinessNeed,
} from "@/lib/procurement";

import StatusBadge from "@/components/procurement/StatusBadge";
import WorkflowStepper from "@/components/procurement/WorkflowStepper";

export default function BusinessNeedDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const id = Number(params.id);

  const [item, setItem] =
    useState<BusinessNeed | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] =
    useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      setItem(await getBusinessNeed(id));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load business need."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleSubmit() {
    setSubmitting(true);

    try {
      await submitBusinessNeed(id);
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit business need."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <main className="p-6">Loading...</main>;
  }

  if (!item) {
    return (
      <main className="p-6">
        {error || "Business Need not found."}
      </main>
    );
  }

  return (
    <main className="p-6">
      <WorkflowStepper
        currentStep="Business Need"
      />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {item.need_number}
          </h1>

          <p className="text-gray-500">
            {item.title}
          </p>
        </div>

        <StatusBadge status={item.status} />
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">
            Business Need Information
          </h2>

          <div className="space-y-3 text-sm">
            <p>
              <strong>Type:</strong>{" "}
              {item.business_need_type.name}
            </p>

            <p>
              <strong>Description:</strong>{" "}
              {item.description || "-"}
            </p>

            <p>
              <strong>Department:</strong>{" "}
              {item.department || "-"}
            </p>

            <p>
              <strong>Business Unit:</strong>{" "}
              {item.business_unit || "-"}
            </p>

            <p>
              <strong>Project:</strong>{" "}
              {item.project || "-"}
            </p>

            <p>
              <strong>Location:</strong>{" "}
              {item.location || "-"}
            </p>

            <p>
              <strong>Cost Center:</strong>{" "}
              {item.cost_center || "-"}
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">
            Financial Information
          </h2>

          <p className="text-2xl font-bold">
            {item.currency}{" "}
            {item.estimated_value.toLocaleString()}
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Required by:{" "}
            {item.required_by_date || "-"}
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        {item.status === "Draft" && (
          <>
            <Link
              href={`/dashboard/business-needs/${item.id}/edit`}
              className="rounded-lg border px-4 py-2"
            >
              Edit
            </Link>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white"
            >
              {submitting
                ? "Submitting..."
                : "Submit"}
            </button>
          </>
        )}

        {item.status === "Submitted" && (
          <Link
            href={`/dashboard/purchase-requisitions/create?businessNeedId=${item.id}`}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white"
          >
            Create Purchase Requisition
          </Link>
        )}
      </div>
    </main>
  );
}