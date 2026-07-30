"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getApprovalDetails,
  approveInvoice,
  rejectInvoice,
  getApprovalHistory,
} from "@/services/api";

import { fmtDate } from "@/lib/invoices";

interface ApprovalHistory {
    id: number;
    reviewer: string;
    decision: string;
    remarks: string;
    approved_at: string;
}

interface Invoice {
  id: number;
  invoice_number: string;
  vendor_name: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  currency: string;
  processing_status: string;
  status_logs: ApprovalHistory[];
}

export default function InvoiceApprovalPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null | undefined>(undefined);
  const [deciding, setDeciding] = useState<"approved" | "rejected" | null>(null);
  const [history, setHistory] = useState<ApprovalHistory[]>([]);

  useEffect(() => {
      const loadApproval = async () => {
          try {
              const response = await getApprovalDetails(params.id);
              setInvoice(response);
              const historyResponse = await getApprovalHistory(params.id);
              setHistory(historyResponse);
          } catch {
              setInvoice(null);
          }
      };

      loadApproval();
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

  const handleDecision = async (
    decision: "approved" | "rejected"
) => {

    try {

        setDeciding(decision);

        if (decision === "approved") {

            await approveInvoice(
                invoice.id,
                "Manager"
            );

        } else {

            const ok = window.confirm(
                "Are you sure you want to reject this invoice?"
            );

            if (!ok) {
                setDeciding(null);
                return;
            }

            await rejectInvoice(
                invoice.id,
                "Manager",
                "Rejected during approval."
            );

        }

        router.push("/dashboard/invoices");

    } finally {

        setDeciding(null);

    }
};


  const isDecided = invoice.processing_status === "Approved" || invoice.processing_status === "Rejected";

  return (
    <main className="relative w-full bg-surface min-h-[calc(100vh-80px)] px-lg">
      <div className="max-w-2xl mx-auto flex flex-col w-full pb-40 pt-8">
        {/* Status Header */}
        <div className="flex items-center gap-md py-lg mb-md">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
            <span
              className="material-symbols-outlined text-primary text-[28px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified_user
            </span>
            {!isDecided && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-error rounded-full border-2 border-surface animate-pulse" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-primary uppercase tracking-widest">
              {isDecided ? "Resolved" : "Action Required"}
            </span>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
              {invoice.processing_status === "Approved"
                ? "Approved"
                : invoice.processing_status === "Rejected"
                ? "Rejected"
                : "Approval Requested"}
            </h1>
          </div>
        </div>

        {/* Quick Stats Bento */}
        <div className="grid grid-cols-2 gap-md mb-lg">
          <div className="bg-surface-container-low p-md rounded-xl flex flex-col gap-xs shadow-sm">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
              Due Date
            </span>
            <span className="font-title-md text-title-md text-on-surface">
              {fmtDate(invoice.due_date)}
            </span>
          </div>
          <div className="bg-surface-container-low p-md rounded-xl flex flex-col gap-xs shadow-sm">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
              Status
            </span>

            <span className="font-title-md text-title-md text-on-surface">
              {invoice.processing_status}
            </span>
          </div>
        </div>

        {/* Invoice Summary Card */}
        <div className="bg-surface-container-highest p-lg rounded-xl shadow-md mb-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-lg opacity-10">
            <span className="material-symbols-outlined text-[80px]">
              receipt_long
            </span>
          </div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-md">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-xs">
                  Vendor
                </span>
                <h2 className="font-title-md text-title-md text-on-surface">
                  {invoice.vendor_name}
                </h2>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  ID: #{invoice.invoice_number}
                </span>
              </div>
              <div className="bg-primary/10 px-md py-1 rounded-full">
                <span className="font-label-sm text-label-sm text-primary uppercase">
                  {isDecided ? invoice.processing_status : "Pending"}
                </span>
              </div>
            </div>
            <div className="pt-md border-t border-on-surface/5">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                Total Amount
              </span>
              <div className="flex items-baseline gap-xs">
                <span className="font-display-lg text-display-lg text-on-background tracking-tight">
                  ${invoice.total_amount.toFixed(2)}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {invoice.currency}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Trail */}
        <div className="flex flex-col gap-md mb-lg">
          <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase px-xs">
            Audit Trail
          </h3>
          <div className="bg-surface-container-low p-lg rounded-xl shadow-sm">
            <div className="flex flex-col gap-lg relative">
              <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-outline-variant" />
              {history.map((item) => (
                <div key={item.id} className="flex gap-md relative">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center z-10">
                    <span className="material-symbols-outlined text-[14px] text-on-primary">
                      check
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md text-on-surface">
                      {item.decision}
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      {item.remarks}· {fmtDate(item.approved_at)}
                    </span>
                  </div>
                </div>
              ))}
              {!isDecided && (
                <div className="flex gap-md relative">
                  <div className="w-6 h-6 rounded-full bg-surface-container-highest border-2 border-primary flex items-center justify-center z-10">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md text-primary">
                      Awaiting Your Approval
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Assigned to you
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>

      {/* Fixed Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-xl border-t border-outline-variant px-lg py-md z-50">
        <div className="max-w-md mx-auto flex flex-col gap-sm">
          {isDecided ? (
            <div
              className={`h-12 rounded-xl flex items-center justify-center gap-sm font-title-md text-title-md ${
                invoice.processing_status === "Approved"
                  ? "bg-green-600 text-white"
                  : "bg-surface-container-highest text-on-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined">
                {invoice.processing_status === "Approved" ? "check_circle" : "cancel"}
              </span>
              {invoice.processing_status === "Approved" ? "Approved" : "Rejected"}
            </div>
          ) : (
            <div className="flex gap-md">
              <button
                type="button"
                onClick={() => handleDecision("rejected")}
                disabled={!!deciding}
                className="flex-1 h-12 rounded-xl bg-error text-on-error font-title-md flex items-center justify-center gap-sm active:scale-95 transition-transform disabled:opacity-70"
              >
                <span className="material-symbols-outlined">close</span>
                Reject
              </button>
              <button
                type="button"
                onClick={() => handleDecision("approved")}
                disabled={!!deciding}
                className="flex-[2] h-12 rounded-xl bg-primary text-on-primary font-title-md flex items-center justify-center gap-sm active:scale-95 transition-transform shadow-lg shadow-primary/20 disabled:opacity-70"
              >
                {deciding === "approved" ? (
                  <span className="material-symbols-outlined animate-spin">
                    sync
                  </span>
                ) : (
                  <span className="material-symbols-outlined">
                    check_circle
                  </span>
                )}
                {deciding === "approved" ? "Processing..." : "Approve"}
              </button>
            </div>
          )}
          {isDecided && (
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="w-full py-2 text-on-surface-variant font-label-md hover:text-primary transition-colors"
            >
              Back to Dashboard
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
