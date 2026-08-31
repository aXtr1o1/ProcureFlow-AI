"use client";

import Link from "next/link";

export default function VendorIntelligencePage() {
  return (
    <main className="min-h-screen bg-surface pt-24 pb-12">
      <div className="max-w-container-max mx-auto px-margin-desktop">

        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm text-primary hover:underline"
          >
            ← Dashboard
          </Link>

          <h1 className="mt-4 text-3xl font-bold text-on-surface">
            Vendor Intelligence
          </h1>

          <p className="mt-2 text-on-surface-variant">
            Vendor performance, spend and procurement compliance analytics.
          </p>
        </div>

        <section className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6">

          <h2 className="text-xl font-semibold text-on-surface">
            Vendor Performance
          </h2>

          <div className="mt-5 overflow-x-auto">

            <table className="w-full text-left">

              <thead>
                <tr className="border-b border-outline-variant/20">

                  <th className="p-3 text-sm text-on-surface-variant">
                    Vendor Name
                  </th>

                  <th className="p-3 text-sm text-on-surface-variant">
                    Overall Score
                  </th>

                  <th className="p-3 text-sm text-on-surface-variant">
                    On-Time Delivery
                  </th>

                  <th className="p-3 text-sm text-on-surface-variant">
                    Invoice Accuracy
                  </th>

                  <th className="p-3 text-sm text-on-surface-variant">
                    PO Compliance
                  </th>

                  <th className="p-3 text-sm text-on-surface-variant">
                    Price Variance
                  </th>

                  <th className="p-3 text-sm text-on-surface-variant">
                    Exception Rate
                  </th>

                  <th className="p-3 text-sm text-on-surface-variant">
                    Payment Dispute
                  </th>

                </tr>
              </thead>

              <tbody>
                <tr>
                  <td
                    colSpan={8}
                    className="p-8 text-center text-on-surface-variant"
                  >
                    Vendor-level analytics require vendor
                    aggregation data from the backend.
                  </td>
                </tr>
              </tbody>

            </table>

          </div>

        </section>

        <section className="mt-6 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6">

          <h2 className="text-xl font-semibold text-on-surface">
            Vendor Analytics
          </h2>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">

            <Metric title="Total Spend" />
            <Metric title="Number of POs" />
            <Metric title="Number of Invoices" />
            <Metric title="Average Invoice Value" />
            <Metric title="On-Time Delivery %" />
            <Metric title="Invoice Accuracy %" />
            <Metric title="Exception %" />
            <Metric title="Price Variance" />
            <Metric title="Payment Terms" />
            <Metric title="Average Payment Time" />

          </div>

        </section>

      </div>
    </main>
  );
}

function Metric({
  title,
}: {
  title: string;
}) {
  return (
    <div className="rounded-lg bg-surface-container p-4">

      <p className="text-sm text-on-surface-variant">
        {title}
      </p>

      <p className="mt-2 font-semibold text-on-surface">
        API data required
      </p>

    </div>
  );
}