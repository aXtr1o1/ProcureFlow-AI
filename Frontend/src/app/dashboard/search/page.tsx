"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fmtDate } from "@/lib/invoices";
import {
  getInvoices,
  searchInvoice,
} from "@/services/api";
import { formatUsd } from "@/lib/currency";

interface LineItem {
  id?: number;
  description?: string;
  quantity?: number;
  unit_price?: number;
  amount?: number;
}

interface Invoice {
  id: number | null;
  invoice_number: string;
  vendor_name: string;
  vendor_address?: string;
  customer_name?: string;
  invoice_date: string;
  due_date?: string;
  purchase_order_number?: string;
  currency?: string;
  subtotal?: number;
  tax?: number;
  total_amount: number;
  processing_status: string;
  blob_name?: string;
  blob_url?: string;
  line_items?: LineItem[];
  source?: string;
  created_at?: string;
}

const STATUS_LABEL: Record<string, string> = {
  Uploaded: "Uploaded",
  "OCR Completed": "OCR Completed",
  "Validation Completed": "Validation Completed",
  "Pending Validation": "Pending Validation",
  "Approval Pending": "Pending Approval",
  Approved: "Approved",
  Rejected: "Rejected",
  Duplicate: "Duplicate",
  Failed: "Failed",
  "PO Generated": "PO Generated",
  "PO Completed": "PO Completed",
};

const STATUS_STYLE: Record<string, string> = {
  Uploaded: "bg-surface-container-highest text-on-surface-variant",
  "OCR Completed": "bg-blue-50 text-blue-700",
  "Validation Completed": "bg-green-50 text-green-700",
  "Pending Validation": "bg-primary/10 text-primary",
  "Approval Pending": "bg-secondary-container text-on-secondary-container",
  Approved: "bg-green-50 text-green-700",
  Rejected: "bg-error-container text-on-error-container",
  Duplicate: "bg-yellow-50 text-yellow-700",
  Failed: "bg-error-container text-on-error-container",
  "PO Generated": "bg-blue-50 text-blue-700",
  "PO Completed": "bg-indigo-50 text-indigo-700",
};

type ChipFilter = "all" | "pending_approval" | "last_30" | "high_value";

const CHIPS: { key: ChipFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending_approval", label: "Pending Approval" },
  { key: "last_30", label: "Last 30 Days" },
  { key: "high_value", label: "High Value" },
];

const DEFAULT_RECENT = [
  "Redefine",
  "Approval Pending",
  "RP-LSE",
];

function money(amount?: number | string | null, currency?: string) {
  if (amount === null || amount === undefined || amount === "") {
    return "—";
  }
  return formatUsd(amount, currency || "USD");
}

export default function InvoiceSearchPage() {
  const router = useRouter();
  const [results, setResults] = useState<Invoice[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeChip, setActiveChip] = useState<ChipFilter>("all");
  const [recent, setRecent] = useState<string[]>(DEFAULT_RECENT);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadInvoices = useCallback(async () => {
    try {
      const response = await getInvoices();
      setResults(Array.isArray(response?.data) ? response.data : []);
    } catch (err) {
      console.error(err);
      setResults([]);
      setError(err instanceof Error ? err.message : "Failed to load invoices.");
    }
  }, []);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  const filteredResults = useMemo(() => {
    return results.filter((inv) => {
      if (activeChip === "pending_approval") {
        return inv.processing_status === "Validation Completed";
      }
      if (activeChip === "high_value") {
        return Number(inv.total_amount ?? 0) >= 2000;
      }
      if (activeChip === "last_30") {
        if (!inv.invoice_date) return false;
        const date = new Date(inv.invoice_date);
        if (Number.isNaN(date.getTime())) return true;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        return date >= cutoff;
      }
      return true;
    });
  }, [results, activeChip]);

  const searchInvoices = async (term: string) => {
    if (loading) return;

    setLoading(true);
    setError(null);
    setSelectedId(null);
    setActiveChip("all");

    try {
      const trimmed = term.trim();
      if (!trimmed) {
        await loadInvoices();
        if (recent.length === 0) {
          setRecent(DEFAULT_RECENT);
        }
        return;
      }

      const response = await searchInvoice(trimmed);
      setResults(Array.isArray(response?.results) ? response.results : []);

      if (!recent.includes(trimmed)) {
        setRecent((prev) => [trimmed, ...prev].slice(0, 5));
      }
    } catch (err) {
      console.error(err);
      setResults([]);
      setError(
        err instanceof Error ? err.message : "Search failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const resultKey = (inv: Invoice, index: number) =>
    String(inv.id ?? inv.invoice_number ?? index);

  const openInvoice = (inv: Invoice) => {
    if (inv.id != null) {
      router.push(`/dashboard/invoices/${inv.id}`);
      return;
    }
    setSelectedId(resultKey(inv, 0));
  };

  const handleDownload = (inv: Invoice) => {
    const blob = new Blob([JSON.stringify(inv, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${inv.invoice_number || "invoice"}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-container-max mx-auto px-margin-desktop w-full py-12">
      <div className="flex flex-col gap-xs mb-6">
        <h1 className="font-display-lg text-display-lg text-on-surface">
          Invoice Search
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Search invoices stored in the database by vendor, number, customer,
          status, or amount.
        </p>
      </div>

      <form
        className="flex gap-3 mb-4 max-w-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          void searchInvoices(query);
        }}
      >
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-primary text-[24px]">
              drive_file_rename_outline
            </span>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-14 pl-12 pr-4 rounded-xl bg-surface-container-lowest shadow-sm font-body-md text-on-surface"
            placeholder="Search by vendor, invoice number, customer, status..."
            type="text"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

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

      {error && (
        <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-red-900">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                  void searchInvoices(term);
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

        <div className="lg:col-span-2 order-1 lg:order-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-title-lg text-title-lg text-on-surface">
              Search Results{" "}
              <span className="text-on-surface-variant font-body-sm ml-1">
                ({filteredResults.length})
              </span>
            </h2>
          </div>

          {filteredResults.length === 0 ? (
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
              {filteredResults.map((inv, index) => {
                const key = resultKey(inv, index);
                const expanded = selectedId === key;
                const lineItems = Array.isArray(inv.line_items)
                  ? inv.line_items
                  : [];

                return (
                  <div
                    key={key}
                    className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col gap-4"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedId((prev) => (prev === key ? null : key))
                      }
                      className="flex justify-between items-start text-left gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-primary">
                            corporate_fare
                          </span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-title-md text-title-md text-on-surface truncate">
                            {inv.vendor_name || "Unknown vendor"}
                          </span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                            {inv.invoice_number || "—"} ·{" "}
                            {fmtDate(inv.invoice_date)}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded font-label-sm text-label-sm uppercase tracking-wider shrink-0 ${
                          STATUS_STYLE[inv.processing_status] ??
                          "bg-surface-container-highest text-on-surface-variant"
                        }`}
                      >
                        {STATUS_LABEL[inv.processing_status] ??
                          inv.processing_status}
                      </span>
                    </button>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div>
                        <p className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                          Amount
                        </p>
                        <p className="font-title-md text-title-md text-on-surface">
                          {money(inv.total_amount, inv.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                          Due Date
                        </p>
                        <p className="font-body-md text-body-md text-on-surface">
                          {inv.due_date ? fmtDate(inv.due_date) : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                          Customer
                        </p>
                        <p className="font-body-md text-body-md text-on-surface truncate">
                          {inv.customer_name || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                          PO #
                        </p>
                        <p className="font-body-md text-body-md text-on-surface truncate">
                          {inv.purchase_order_number || "—"}
                        </p>
                      </div>
                    </div>

                    {expanded && (
                      <div className="rounded-lg border border-outline-variant/20 bg-surface p-4 flex flex-col gap-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-sm text-on-surface-variant">
                              Vendor Address
                            </p>
                            <p className="text-on-surface">
                              {inv.vendor_address || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-on-surface-variant">
                              Invoice Date
                            </p>
                            <p className="text-on-surface">
                              {fmtDate(inv.invoice_date)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-on-surface-variant">
                              Subtotal
                            </p>
                            <p className="text-on-surface">
                              {money(inv.subtotal, inv.currency)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-on-surface-variant">Tax</p>
                            <p className="text-on-surface">
                              {money(inv.tax, inv.currency)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-on-surface-variant">
                              Currency
                            </p>
                            <p className="text-on-surface">
                              USD
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-on-surface-variant">
                              Status
                            </p>
                            <p className="text-on-surface">
                              {inv.processing_status || "—"}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="font-label-md text-label-md text-on-surface mb-2">
                            Line Items ({lineItems.length})
                          </p>
                          {lineItems.length === 0 ? (
                            <p className="text-sm text-on-surface-variant">
                              No line items available.
                            </p>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {lineItems.map((item, itemIndex) => (
                                <div
                                  key={item.id ?? itemIndex}
                                  className="rounded-md border border-outline-variant/15 p-3"
                                >
                                  <p className="font-body-md text-body-md text-on-surface">
                                    {item.description || "Untitled item"}
                                  </p>
                                  <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
                                    Qty {item.quantity ?? 0} · Unit{" "}
                                    {money(item.unit_price, inv.currency)} ·
                                    Amount {money(item.amount, inv.currency)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedId((prev) => (prev === key ? null : key))
                        }
                        className="font-label-md text-label-md text-primary hover:underline"
                      >
                        {expanded ? "Hide details" : "Show details"}
                      </button>
                      <div className="flex gap-sm">
                        <button
                          type="button"
                          onClick={() => openInvoice(inv)}
                          disabled={inv.id == null}
                          title={
                            inv.id == null
                              ? "Invoice is not linked to the database yet"
                              : "Open invoice"
                          }
                          className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-40"
                        >
                          <span className="material-symbols-outlined">
                            visibility
                          </span>
                        </button>
                        <button
                          type="button"
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
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
