"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getInvoice, sendToApproval, fmtDate, type Invoice } from "@/lib/invoices";

export default function InvoiceValidationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null | undefined>(undefined);
  const [sending, setSending] = useState(false);
  const [flagged, setFlagged] = useState(false);

  useEffect(() => {
    setInvoice(getInvoice(params.id) ?? null);
  }, [params.id]);

  if (invoice === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </main>
    );
  }

  if (invoice === null) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
        <p className="font-title-lg text-title-lg text-on-surface">
          Invoice not found
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="text-primary font-label-md hover:underline"
        >
          Back to Upload
        </button>
      </main>
    );
  }

  const handleGoToApproval = () => {
    setSending(true);
    sendToApproval(invoice.id);
    setTimeout(() => {
      router.push(`/dashboard/invoices/${invoice.id}/approval`);
    }, 600);
  };

  return (
    <main className="relative w-full bg-surface min-h-[calc(100vh-80px)] px-lg">
      <div className="max-w-2xl mx-auto flex flex-col w-full pb-32 pt-8">
        {/* Status Header Section */}
        <div className="flex items-center justify-between py-md">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Invoice Status
            </span>
            <div className="flex items-center gap-xs mt-xs">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="font-title-md text-title-md text-primary">
                Pending Validation
              </span>
            </div>
          </div>
          <div className="flex -space-x-2">
            <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                person
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-sm font-label-md text-label-md">
              AI
            </div>
          </div>
        </div>

        {/* Primary Info Card */}
        <div className="bg-surface-container-lowest rounded-xl p-lg shadow-sm mb-lg">
          <div className="flex justify-between items-start mb-md">
            <div className="flex flex-col">
              <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mb-xs">
                {invoice.vendor}
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Vendor ID: {invoice.vendorId}
              </p>
            </div>
            <div className="bg-surface-container p-sm rounded-lg">
              <span className="material-symbols-outlined text-primary">
                receipt_long
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-y-md gap-x-lg py-md border-y border-surface-variant/30">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant mb-xs">
                Invoice #
              </span>
              <span className="font-body-md text-body-md text-on-surface font-semibold">
                {invoice.invoiceNumber}
              </span>
            </div>
            <div className="flex flex-col text-right">
              <span className="font-label-sm text-label-sm text-on-surface-variant mb-xs">
                Date
              </span>
              <span className="font-body-md text-body-md text-on-surface">
                {fmtDate(invoice.date)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant mb-xs">
                Amount Due
              </span>
              <span className="font-title-md text-title-md text-on-surface">
                ${invoice.amount.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col text-right">
              <span className="font-label-sm text-label-sm text-on-surface-variant mb-xs">
                Terms
              </span>
              <span className="font-body-md text-body-md text-on-surface">
                {invoice.terms}
              </span>
            </div>
          </div>
          <div className="mt-md flex items-center gap-sm text-primary">
            <span className="material-symbols-outlined text-[16px]">
              verified
            </span>
            <span className="font-label-md text-label-md">
              Standard digital invoice format detected
            </span>
          </div>
        </div>

        {/* AI Intelligence Section */}
        <div className="mb-lg">
          <div className="flex items-center gap-sm mb-md px-xs">
            <span className="material-symbols-outlined text-primary text-[20px]">
              psychology
            </span>
            <h3 className="font-title-md text-title-md text-on-surface">
              Validation Intelligence
            </h3>
          </div>
          <div className="flex flex-wrap gap-sm">
            <div className="flex items-center gap-xs px-sm py-1.5 bg-green-50 rounded-full text-green-700">
              <span className="material-symbols-outlined text-[14px]">
                check_circle
              </span>
              <span className="font-label-md text-label-md">Vendor Verified</span>
            </div>
            <div className="flex items-center gap-xs px-sm py-1.5 bg-green-50 rounded-full text-green-700">
              <span className="material-symbols-outlined text-[14px]">
                check_circle
              </span>
              <span className="font-label-md text-label-md">PO Match</span>
            </div>
            <div className="flex items-center gap-xs px-sm py-1.5 bg-primary/10 rounded-full text-primary">
              <span className="material-symbols-outlined text-[14px]">
                auto_awesome
              </span>
              <span className="font-label-md text-label-md">
                OCR Confidence: {invoice.ocrConfidence}%
              </span>
            </div>
            <div className="flex items-center gap-xs px-sm py-1.5 bg-green-50 rounded-full text-green-700">
              <span className="material-symbols-outlined text-[14px]">
                check_circle
              </span>
              <span className="font-label-md text-label-md">Duplicate Check</span>
            </div>
          </div>
        </div>

        {/* Line Items List */}
        <div className="flex flex-col gap-sm">
          <div className="flex items-center justify-between px-xs">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Line Items ({invoice.lineItems.length})
            </span>
          </div>
          <div className="bg-surface-container-low rounded-xl overflow-hidden shadow-sm">
            {invoice.lineItems.map((item, i) => (
              <div
                key={item.id}
                className={`p-md flex justify-between items-center bg-surface-container-lowest ${
                  i < invoice.lineItems.length - 1 ? "mb-[1px]" : ""
                }`}
              >
                <div className="flex flex-col gap-xs">
                  <span className="font-body-md text-body-md text-on-surface font-semibold">
                    {item.name}
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {item.sku}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-body-md text-body-md text-on-surface font-semibold">
                    ${item.amount.toFixed(2)}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    Qty: {item.qty}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-lg bg-surface/90 backdrop-blur-md border-t border-surface-variant/20 z-40">
        <div className="max-w-md mx-auto flex gap-md">
          <button
            type="button"
            onClick={() => setFlagged(true)}
            disabled={flagged}
            className="flex-1 h-12 rounded-xl bg-surface-container-highest text-on-surface-variant font-title-md text-title-md flex items-center justify-center gap-sm transition-all active:scale-95 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[20px]">flag</span>
            {flagged ? "Flagged" : "Flag"}
          </button>
          <button
            type="button"
            onClick={handleGoToApproval}
            disabled={sending}
            className="flex-[2] h-12 rounded-xl bg-primary text-on-primary font-title-md text-title-md flex items-center justify-center gap-sm shadow-md shadow-primary/20 transition-all active:scale-95 disabled:opacity-70"
          >
            {sending ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">
                sync
              </span>
            ) : (
              <>
                Go to Approval
                <span className="material-symbols-outlined text-[20px]">
                  chevron_right
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
