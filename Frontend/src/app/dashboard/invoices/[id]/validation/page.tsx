"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    getInvoice,
    updateInvoiceStatus,
} from "@/services/api";
import { fmtDate } from "@/lib/invoices";
import { formatRand } from "@/lib/currency";

interface LineItem {
  id: number;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface Invoice {
  id: number;
  invoice_number: string;
  vendor_name: string;
  vendor_address: string;
  customer_name: string;
  invoice_date: string;
  due_date: string;
  purchase_order_number: string | null;
  currency: string;
  subtotal: number;
  tax: number;
  total_amount: number;
  processing_status: string;
  blob_name: string;
  blob_url: string;
  line_items: LineItem[];
}

export default function InvoiceValidationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null | undefined>(undefined);
  const [sending, setSending] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [showFlagMessage, setShowFlagMessage] = useState(false);

  useEffect(() => {
      const loadInvoice = async () => {
          try {
              const response = await getInvoice(params.id);
              setInvoice(response.data);
          } catch {
              setInvoice(null);
          }
      };

      loadInvoice();
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

  const handleGoToApproval = async () => {

    setSending(true);

    try {

        await updateInvoiceStatus(invoice.id);

        router.push(
            `/dashboard/invoices/${invoice.id}/approval`
        );

    } catch (error) {

        console.error(error);

    } finally {

        setSending(false);

    }
};

  return (

    <main className="relative w-full bg-surface min-h-[calc(100vh-80px)] px-lg">
      <div className="max-w-7xl mx-auto pt-6">
        <button
          type="button"
          onClick={() => router.push(`/dashboard/invoices/${params.id}`)}
          className="flex items-center gap-2 text-primary hover:underline font-label-md"
        >
          <span className="material-symbols-outlined text-[18px]">
            arrow_back
          </span>
          Back to Invoice
        </button>
      </div>
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start pb-32 pt-4">
        <div>
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
                {invoice.vendor_name}
              </h2>
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
                {invoice.invoice_number}
              </span>
            </div>
            <div className="flex flex-col text-right">
              <span className="font-label-sm text-label-sm text-on-surface-variant mb-xs">
                Date
              </span>
              <span className="font-body-md text-body-md text-on-surface">
                {fmtDate(invoice.invoice_date)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant mb-xs">
                Amount Due
              </span>
              <span className="font-title-md text-title-md text-on-surface">
                {formatRand(invoice.total_amount, invoice.currency)}
              </span>
            </div>
            <div className="flex flex-col text-right">
              <span className="font-label-sm text-label-sm text-on-surface-variant mb-xs">
                Currency
              </span>
              <span className="font-body-md text-body-md text-on-surface">
                ZAR
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
              Line Items ({invoice.line_items.length})
            </span>
          </div>
          
          <div className="bg-surface-container-low rounded-xl overflow-hidden shadow-sm">
            {invoice.line_items.map((item, i) => (
              <div
                key={item.id}
                className={`p-md flex justify-between items-center bg-surface-container-lowest ${
                  i < invoice.line_items.length - 1 ? "mb-[1px]" : ""
                }`}
              >
                <div className="flex flex-col gap-xs">
                  <span className="font-body-md text-body-md text-on-surface font-semibold">
                    {item.description}
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-body-md text-body-md text-on-surface font-semibold">
                    {formatRand(item.amount, invoice.currency)}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    Qty: {item.quantity}
                  </span>
                </div>
              </div>
            ))}
            </div>
          </div>
        </div>
        {/* Right Column */}
        <div className="sticky top-6 h-[calc(100vh-120px)]">

          <div className="bg-white rounded-xl shadow h-full overflow-hidden">

            <div className="px-4 py-3 border-b font-semibold">
              Original Invoice
            </div>

            <iframe
              src={`${process.env.NEXT_PUBLIC_API_URL}/invoices/${invoice.blob_name}`}
              title="Original Invoice"
              className="w-full h-[800px] border-0"
            />

          </div>

        </div>
      </div>

      {/* Fixed Bottom Bar */}
<div className="fixed bottom-0 left-0 right-0 p-lg bg-surface/90 backdrop-blur-md border-t border-surface-variant/20 z-40">

  {/* Center everything */}
  <div className="max-w-md mx-auto">

    {/* Buttons */}
    <div className="flex gap-md">

      

      {/* Approval */}
      <button
        type="button"
        onClick={handleGoToApproval}
        disabled={sending}
        className="flex-[2] h-12 rounded-xl bg-primary text-on-primary font-title-md flex items-center justify-center gap-sm"
      >
        {sending ? (
          <span className="material-symbols-outlined animate-spin">
            sync
          </span>
        ) : (
          <>
            Go to Approval
            <span className="material-symbols-outlined">
              chevron_right
            </span>
          </>
        )}
      </button>

    </div>

    {/* Success Message */}
    {showFlagMessage && (
      <div className="mt-3 rounded-lg bg-green-50 border border-green-300 px-4 py-3 text-green-700 text-sm flex items-center justify-center gap-2">
        <span className="material-symbols-outlined">
          check_circle
        </span>

        Invoice marked for manual review.
      </div>
    )}

  </div>

</div>
    </main>
  );
}
