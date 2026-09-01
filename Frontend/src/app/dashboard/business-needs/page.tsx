"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  BusinessNeed,
  getBusinessNeeds,
} from "@/lib/procurement";

import StatusBadge from "@/components/procurement/StatusBadge";

export default function BusinessNeedsPage() {
  const [items, setItems] = useState<BusinessNeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getBusinessNeeds()
      .then(setItems)
      .catch((err) =>
        setError(err.message)
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Business Needs
          </h1>

          <p className="text-sm text-gray-500">
            Manage procurement business requirements.
          </p>
        </div>

        <Link
          href="/dashboard/business-needs/create"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          Create Business Need
        </Link>
      </div>

      {loading && (
        <p>Loading business needs...</p>
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
                  Need Number
                </th>
                <th className="px-4 py-3 text-left">
                  Title
                </th>
                <th className="px-4 py-3 text-left">
                  Type
                </th>
                <th className="px-4 py-3 text-right">
                  Estimated Value
                </th>
                <th className="px-4 py-3 text-left">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-t hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/business-needs/${item.id}`}
                      className="font-medium text-blue-600"
                    >
                      {item.need_number}
                    </Link>
                  </td>

                  <td className="px-4 py-3">
                    {item.title}
                  </td>

                  <td className="px-4 py-3">
                    {item.business_need_type?.name}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {item.currency}{" "}
                    {item.estimated_value.toLocaleString()}
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge
                      status={item.status}
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