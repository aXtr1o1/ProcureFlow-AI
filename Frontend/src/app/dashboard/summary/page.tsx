"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fmtDate, listInvoices, type Invoice } from "@/lib/invoices";

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatCompact(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(2)}`;
}

export default function SummaryPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [startDate, setStartDate] = useState(startOfMonth());
  const [endDate, setEndDate] = useState(today());
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  useEffect(() => {
    const all = listInvoices();
    setInvoices(all);
    setSelected(new Set(all.map((i) => i.id)));
  }, []);

  const inRange = useMemo(() => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime() + 1000 * 60 * 60 * 24 - 1;
    return invoices.filter((inv) => {
      const t = new Date(inv.createdAt).getTime();
      return t >= start && t <= end;
    });
  }, [invoices, startDate, endDate]);

  const stats = useMemo(() => {
    const total = inRange.length;
    const totalAmount = inRange.reduce((s, i) => s + i.amount, 0);
    const approved = inRange.filter((i) => i.status === "approved").length;
    const pending = total - approved;
    const pctComplete = total === 0 ? 0 : Math.round((approved / total) * 100);

    const vendorTotals = new Map<string, number>();
    inRange.forEach((inv) => {
      vendorTotals.set(inv.vendor, (vendorTotals.get(inv.vendor) ?? 0) + inv.amount);
    });
    const topVendors = Array.from(vendorTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return { total, totalAmount, approved, pending, pctComplete, topVendors };
  }, [inRange]);

  const insightText = `During this period, ${stats.total} invoice${
    stats.total === 1 ? "" : "s"
  } were processed with a total volume of $${stats.totalAmount.toFixed(2)}. ${
    stats.approved
  } have been approved and ${stats.pending} are still moving through review. ${
    stats.topVendors.length > 0
      ? `The top vendor by spend is ${stats.topVendors[0][0]} at $${stats.topVendors[0][1].toFixed(
          2
        )}.`
      : ""
  }`;

  const handleGenerate = () => {
    setGenerating(true);
    setGenerated(false);
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
    }, 1000);
  };

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(insightText);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      // Clipboard may be unavailable (e.g. insecure context); fail silently.
    }
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  return (
    <div className="max-w-container-max mx-auto px-margin-desktop w-full py-12">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-display-lg text-display-lg text-on-surface">
            Executive Summary
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Financial analysis &amp; AI-powered insights
          </p>
        </div>
        <div className="bg-primary/10 p-3 rounded-full">
          <span className="material-symbols-outlined text-primary text-[28px]">
            analytics
          </span>
        </div>
      </div>

      {/* Date range + generate */}
      <div className="bg-surface-container-low rounded-xl p-6 mb-8 flex flex-col sm:flex-row items-end gap-4">
        <div className="flex flex-col gap-1 flex-1 w-full">
          <label className="font-label-sm text-label-sm text-on-surface-variant">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-white rounded-lg px-4 py-2.5 shadow-sm font-body-md text-body-md text-on-surface border-none focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1 w-full">
          <label className="font-label-sm text-label-sm text-on-surface-variant">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-white rounded-lg px-4 py-2.5 shadow-sm font-body-md text-body-md text-on-surface border-none focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="w-full sm:w-auto bg-primary text-on-primary font-title-md text-title-md px-8 py-3 rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform disabled:opacity-70"
        >
          <span
            className={`material-symbols-outlined text-[20px] ${
              generating ? "animate-spin" : ""
            }`}
          >
            {generating ? "sync" : generated ? "check_circle" : "auto_awesome"}
          </span>
          {generating
            ? "Analyzing Data..."
            : generated
            ? "Summary Updated"
            : "Generate Summary"}
        </button>
      </div>

      {inRange.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl p-16 text-center shadow-sm">
          <p className="font-title-lg text-title-lg text-on-surface mb-2">
            No invoices found
          </p>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Try adjusting your date range to generate a new executive summary.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 flex flex-col gap-8">
            {/* Period overview */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1 h-6 bg-primary rounded-full" />
                <h2 className="font-title-lg text-title-lg text-on-surface">
                  Period Overview
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-surface-container-lowest p-4 rounded-lg shadow-sm">
                  <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Total Invoices
                  </p>
                  <p className="font-headline-lg text-headline-lg text-primary">
                    {stats.total}
                  </p>
                </div>
                <div className="bg-surface-container-lowest p-4 rounded-lg shadow-sm">
                  <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Total Amount
                  </p>
                  <p className="font-headline-lg text-headline-lg text-on-surface">
                    {formatCompact(stats.totalAmount)}
                  </p>
                </div>
              </div>

              <div className="mb-8">
                <div className="flex justify-between items-end mb-1">
                  <span className="font-label-md text-label-md text-on-surface-variant">
                    Approval Flow
                  </span>
                  <span className="font-label-md text-label-md text-on-surface font-bold">
                    {stats.pctComplete}% Complete
                  </span>
                </div>
                <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${stats.pctComplete}%` }}
                  />
                  <div
                    className="h-full bg-secondary-container"
                    style={{ width: `${100 - stats.pctComplete}%` }}
                  />
                </div>
                <div className="flex gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      Approved ({stats.approved})
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-secondary-container" />
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      Pending ({stats.pending})
                    </span>
                  </div>
                </div>
              </div>

              {stats.topVendors.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">
                    Top Vendors
                  </h3>
                  <div className="flex flex-col gap-2">
                    {stats.topVendors.map(([vendor, amount]) => (
                      <div
                        key={vendor}
                        className="flex items-center justify-between p-2 bg-surface-container-low rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-label-md">
                            {vendor
                              .split(" ")
                              .map((w) => w[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </div>
                          <span className="font-body-md text-body-md text-on-surface">
                            {vendor}
                          </span>
                        </div>
                        <span className="font-title-md text-title-md text-on-surface">
                          ${amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* AI insight */}
            <div className="bg-primary-container/20 rounded-xl p-6 border-l-4 border-primary">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary">
                  smart_toy
                </span>
                <div className="flex flex-col gap-2">
                  <h3 className="font-title-md text-title-md text-primary">
                    AI-Generated Insights
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    {insightText}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex-1 bg-white text-on-surface-variant font-label-md text-label-md py-2 rounded-lg flex items-center justify-center gap-1 shadow-sm hover:bg-surface-container-low transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {copyState === "copied" ? "check" : "content_copy"}
                  </span>
                  {copyState === "copied" ? "Copied!" : "Copy Summary"}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="flex-1 bg-white text-on-surface-variant font-label-md text-label-md py-2 rounded-lg flex items-center justify-center gap-1 shadow-sm hover:bg-surface-container-low transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    download
                  </span>
                  Download PDF
                </button>
              </div>
            </div>
          </div>

          {/* Included invoices */}
          <div className="lg:col-span-1">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-title-lg text-title-lg text-on-surface">
                Included Invoices
              </h2>
              <span className="font-label-sm text-label-sm text-primary bg-primary-fixed px-2 py-0.5 rounded-full">
                {selected.size} Selected
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {inRange.slice(0, 8).map((inv) => {
                const isSelected = selected.has(inv.id);
                return (
                  <div
                    key={inv.id}
                    onClick={() => toggleSelected(inv.id)}
                    className={`bg-white p-3 rounded-lg shadow-sm flex items-center gap-3 cursor-pointer transition-opacity ${
                      isSelected ? "" : "opacity-60"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary shrink-0">
                      <span className="material-symbols-outlined">
                        description
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className="font-title-md text-title-md text-on-surface truncate">
                          {inv.invoiceNumber}
                        </p>
                        <p className="font-title-md text-title-md text-on-surface shrink-0">
                          ${inv.amount.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                          {inv.vendor}
                        </p>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          {fmtDate(inv.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-outline-variant bg-transparent"
                      }`}
                    >
                      {isSelected && (
                        <span className="material-symbols-outlined text-white text-[16px]">
                          check
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {inRange.length > 0 && (
              <button
                onClick={() => router.push("/dashboard/invoices")}
                className="w-full mt-4 py-3 text-primary font-title-md text-title-md flex items-center justify-center gap-1 hover:underline"
              >
                View All {inRange.length} Invoices
                <span className="material-symbols-outlined">expand_more</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
