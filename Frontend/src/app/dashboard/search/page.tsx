"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fmtDate } from "@/lib/invoices";
import {
    getInvoices,
    searchInvoice,
    searchInvoiceByNumber
} from "@/services/api";

interface Invoice {
  id: number;
  invoice_number: string;
  vendor_name: string;
  invoice_date: string;
  total_amount: number;
  processing_status: string;
  blob_name: string;
  blob_url: string;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  Uploaded: "Uploaded",
  "Pending Validation": "Pending Validation",
  "Approval Pending": "Pending Approval",
  Approved: "Approved",
  Rejected: "Rejected",
  "PO Generated": "PO Generated",
};

const STATUS_STYLE: Record<string, string> = {
  Uploaded: "bg-surface-container-highest text-on-surface-variant",
  "Pending Validation": "bg-primary/10 text-primary",
  "Approval Pending": "bg-secondary-container text-on-secondary-container",
  Approved: "bg-green-50 text-green-700",
  Rejected: "bg-error-container text-on-error-container",
  "PO Generated": "bg-blue-50 text-blue-700",
};

type ChipFilter = "all" | "pending_approval" | "last_30" | "high_value";

const CHIPS: { key: ChipFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending_approval", label: "Pending Approval" },
  { key: "last_30", label: "Last 30 Days" },
  { key: "high_value", label: "High Value" },
];

const DEFAULT_RECENT = [
  "Invoices from Northwind last quarter",
  "Unpaid balances > $2,000",
];

export default function InvoiceSearchPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [results, setResults] = useState<Invoice[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeChip, setActiveChip] = useState<ChipFilter>("all");
  const [recent, setRecent] = useState<string[]>(DEFAULT_RECENT);

  useEffect(() => {
    const loadInvoices = async () => {
        try {
            const response = await getInvoices();
            setInvoices(response.data);
            setResults(response.data);
            console.log("Invoices:", response.data);
        } catch (err) {
            console.error(err);
        }
    };

    loadInvoices();
}, []);
  const searchInvoices = async (term: string) => {

    if (!term.trim() || loading) return;

    setLoading(true);

    try {

        let response;

        if (/^RP-INV/i.test(term.trim())) {
            response = await searchInvoiceByNumber(term);
        } else {
            response = await searchInvoice(term);
        }

        setResults(response.results ?? []);

        if (!recent.includes(term.trim())) {
            setRecent((prev) => [term.trim(), ...prev].slice(0, 5));
        }

    } catch (err) {
        console.error(err);
        setResults([]);
    } finally {
        setLoading(false);
    }
};

  const handleDownload = (inv: Invoice) => {
    const blob = new Blob([JSON.stringify(inv, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${inv.invoice_number}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-container-max mx-auto px-margin-desktop w-full py-12">
      {/* Hero */}
      <div className="flex flex-col gap-xs mb-6">
        <h1 className="font-display-lg text-display-lg text-on-surface">
          Intelligence Search
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Ask anything about your invoices in plain English.
        </p>
      </div>

      <div className="flex gap-3 mb-4 max-w-2xl">

            <div className="relative flex-1">

                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-primary text-[24px]">
                        drive_file_rename_outline
                    </span>
                </div>

                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !loading) {
                          e.preventDefault();
                          searchInvoices(query);
                      }
                  }}
                    className="w-full h-14 pl-12 pr-4 rounded-xl bg-surface-container-lowest shadow-sm font-body-md text-on-surface"
                    placeholder="Try 'Invoices from Northwind over $1k'..."
                    type="text"
                />

            </div>

            <button
                disabled={loading}
                onClick={() => searchInvoices(query)}
                className="px-6 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? "Searching..." : "Search"}
            </button>

        </div>

      {/* Quick filter chips */}
      <div className="flex gap-sm overflow-x-auto pb-2 mb-8">
        {CHIPS.map((chip) => (
          <button
            key={chip.key}
            onClick={() => setActiveChip(chip.key)}
            className={`flex items-center gap-xs px-4 py-1.5 rounded-full font-label-md text-label-md whitespace-nowrap transition-colors ${
              activeChip === chip.key
                ? "bg-primary text-on-primary"
                : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
            }`}
          >
            {chip.key === "all" && (
              <span className="material-symbols-outlined text-[18px]">
                filter_list
              </span>
            )}
            {chip.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent searches */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-title-lg text-title-lg text-on-surface">
              Recent
            </h2>
            <button
              onClick={() => setRecent([])}
              className="font-label-md text-label-md text-primary hover:underline"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-col gap-xs">
            {recent.length === 0 && (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                No recent searches yet.
              </p>
            )}
            {recent.map((term) => (
              <button
                key={term}
                onClick={() => {
                  setQuery(term);
                  searchInvoices(term);
              }}
                className="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors text-left"
              >
                <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                  history
                </span>
                <span className="font-body-md text-body-md text-on-surface flex-1">
                  {term}
                </span>
                <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                  north_west
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 order-1 lg:order-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-title-lg text-title-lg text-on-surface">
              Search Results{" "}
              <span className="text-on-surface-variant font-body-sm ml-1">
                ({results.length})
              </span>
            </h2>
          </div>

          {results.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-xl p-16 text-center shadow-sm">
              <p className="font-title-lg text-title-lg text-on-surface mb-2">
                No invoices found
              </p>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Try adjusting your search or filters.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {results.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col gap-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary">
                          corporate_fare
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-title-md text-title-md text-on-surface">
                          {inv.vendor_name}
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          {inv.invoice_number} · {fmtDate(inv.invoice_date)}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded font-label-sm text-label-sm uppercase tracking-wider ${STATUS_STYLE[inv.processing_status]}`}
                    >
                      {STATUS_LABEL[inv.processing_status]}
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-tighter">
                        Amount Due
                      </span>
                      <span className="font-headline-lg text-headline-lg text-on-surface">
                        ${Number(inv.total_amount ?? 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex gap-sm">
                      <button
                        onClick={() =>
                          router.push(`/dashboard/invoices/${inv.id}`)
                        }
                        title="View"
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined">
                          visibility
                        </span>
                      </button>
                      <button
                        onClick={() => handleDownload(inv)}
                        title="Download JSON"
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined">
                          download
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
