"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getInvoices } from "@/services/api";
import {
  STEPS,
  STATUS_BG_COLOR,
  STATUS_COLOR,
  STATUS_ICON_COLOR,
  STATUS_LABEL,
  useInvoiceProcessing,
} from "@/context/InvoiceProcessingContext";
import { fmtDate, type Invoice } from "@/lib/invoices";
import { formatUsd } from "@/lib/currency";

import {
  getDashboardOverview,
  getDashboardFunnel,
  getDashboardSpend,
  type DashboardOverview,
  type DashboardFunnel,
  type DashboardSpend,
} from "@/lib/procurement";

export default function DashboardPage() {
  const router = useRouter();
  const {
    fileName,
    stepStates,
    currentStatus,
    currentStatusRaw,
    currentStepIndex,
    running,
    completed,
    notice,
    clearNotice,
    startProcessing,
  } = useInvoiceProcessing();

  const [dragging, setDragging] = useState(false);
  const [recent, setRecent] = useState<Invoice[]>([]);

  const [dashboard, setDashboard] =
    useState<DashboardOverview | null>(null);

  const [dashboardLoading, setDashboardLoading] =
    useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshRecent = useCallback(async () => {
    try {
      const response = await getInvoices();
      const list = Array.isArray(response?.data) ? response.data : [];
      setRecent(list.slice(0, 6));
    } catch (error) {
      console.error(error);
      setRecent([]);
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    try {
      setDashboardLoading(true);

      const overview = await getDashboardOverview();

      setDashboard(overview);
    } catch (error) {
      console.error(
        "Failed to load dashboard data:",
        error
      );

      setDashboard(null);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshRecent();
    void refreshDashboard();

    const onUpdate = () => {
      void refreshRecent();
      void refreshDashboard();
    };

    window.addEventListener("invoices:updated", onUpdate);

    return () => {
      window.removeEventListener("invoices:updated", onUpdate);
    };
  }, [refreshRecent, refreshDashboard]);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (running || !files || files.length === 0) {
        return;
      }

      const pdfFiles = Array.from(files).filter((file) => {
        return (
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf")
        );
      });

      if (pdfFiles.length === 0) {
        return;
      }

      for (const file of pdfFiles) {
        await startProcessing(file);
      }
    },
    [running, startProcessing],
  );

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    setDragging(false);

    if (running) {
      return;
    }

    /*
     * Pass the actual dropped FileList.
     * The previous implementation created an empty DataTransfer object,
     * so the dropped PDF was not passed into handleFiles.
     */
    void handleFiles(event.dataTransfer.files);
  };

  return (
    <div className="flex w-full flex-col">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-[5%] -top-[10%] h-[40%] w-[40%] rounded-full bg-primary/5 blur-[120px]" />

        <div className="absolute -right-[10%] top-[20%] h-[30%] w-[30%] rounded-full bg-secondary/5 blur-[100px]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-container-max px-margin-desktop py-12">
        {notice && (
          <div
            role="alert"
            className={`mb-6 flex items-start gap-4 rounded-xl border p-4 shadow-md ${
              notice.type === "duplicate"
                ? "border-yellow-300 bg-yellow-50 text-yellow-900"
                : notice.type === "error"
                  ? "border-red-300 bg-red-50 text-red-900"
                  : "border-blue-300 bg-blue-50 text-blue-900"
            }`}
          >
            <span className="material-symbols-outlined mt-0.5 shrink-0 text-[22px]">
              {notice.type === "duplicate"
                ? "content_copy"
                : notice.type === "error"
                  ? "error"
                  : "info"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-title-lg text-title-lg font-semibold">
                {notice.title}
              </p>
              <p className="mt-1 font-body-md text-body-md whitespace-pre-wrap">
                {notice.message}
              </p>
            </div>
            <button
              type="button"
              onClick={clearNotice}
              className="shrink-0 rounded-md px-2 py-1 font-label-md text-label-md opacity-70 hover:opacity-100"
              aria-label="Dismiss message"
            >
              Close
            </button>
          </div>
        )}

        {/*
         * Desktop layout:
         *
         * Row 1:
         * Upload heading | Summary statistics
         *
         * Row 2:
         * Upload card    | System Status
         *
         * Row 3:
         * Recent invoices
         *
         * Because the upload card and System Status are in the same grid row,
         * they begin at exactly the same vertical position.
         */}
        <div className="grid grid-cols-1 items-stretch gap-x-8 gap-y-8 lg:grid-cols-2">
          {/* Upload page heading */}
          <div
            className="
              order-1
              flex
              flex-col
              gap-2
              lg:col-start-1
              lg:row-start-1
            "
          >
            <h1 className="font-display-lg text-display-lg text-on-surface">
              Upload Invoice
            </h1>
          </div>

          {/* Dashboard KPIs */}
          <section className="order-2 mx-auto w-full lg:col-span-2 lg:row-start-1">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">

              <div className="rounded-xl border border-outline-variant/10 bg-surface-container-high/50 p-5 shadow-sm">
                <p className="font-label-md text-label-md text-on-surface-variant">
                  Business Needs
                </p>

                <h2 className="mt-2 text-3xl font-bold text-primary">
                  {dashboardLoading
                    ? "..."
                    : dashboard?.total_business_needs ?? 0}
                </h2>
              </div>

              <div className="rounded-xl border border-outline-variant/10 bg-surface-container-high/50 p-5 shadow-sm">
                <p className="font-label-md text-label-md text-on-surface-variant">
                  Purchase Requisitions
                </p>

                <h2 className="mt-2 text-3xl font-bold text-primary">
                  {dashboardLoading
                    ? "..."
                    : dashboard?.total_purchase_requisitions ?? 0}
                </h2>
              </div>

              <div className="rounded-xl border border-outline-variant/10 bg-surface-container-high/50 p-5 shadow-sm">
                <p className="font-label-md text-label-md text-on-surface-variant">
                  Purchase Orders
                </p>

                <h2 className="mt-2 text-3xl font-bold text-primary">
                  {dashboardLoading
                    ? "..."
                    : dashboard?.total_purchase_orders ?? 0}
                </h2>
              </div>

              <div className="rounded-xl border border-outline-variant/10 bg-surface-container-high/50 p-5 shadow-sm">
                <p className="font-label-md text-label-md text-on-surface-variant">
                  Invoices
                </p>

                <h2 className="mt-2 text-3xl font-bold text-primary">
                  {dashboardLoading
                    ? "..."
                    : dashboard?.total_invoices ?? 0}
                </h2>
              </div>

              <div className="rounded-xl border border-outline-variant/10 bg-surface-container-high/50 p-5 shadow-sm">
                <p className="font-label-md text-label-md text-on-surface-variant">
                  Goods Receipts
                </p>

                <h2 className="mt-2 text-3xl font-bold text-primary">
                  {dashboardLoading
                    ? "..."
                    : dashboard?.total_goods_receipts ?? 0}
                </h2>
              </div>

            </div>
          </section>

          {/* Procurement Workflow */}
          <section className="order-3 w-full lg:col-span-2">
            <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-md">

              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="font-title-lg text-title-lg text-on-surface">
                    Procurement Workflow
                  </h3>

                  <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                    Business Need → PR → PO → Goods Receipt → Invoice
                  </p>
                </div>

                <span className="material-symbols-outlined text-primary">
                  account_tree
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">

                <div className="rounded-lg bg-surface-container-high/50 p-4">
                  <p className="font-label-md text-label-md text-on-surface-variant">
                    Business Needs
                  </p>

                  <p className="mt-2 text-2xl font-bold text-primary">
                    {dashboard?.total_business_needs ?? 0}
                  </p>
                </div>

                <div className="rounded-lg bg-surface-container-high/50 p-4">
                  <p className="font-label-md text-label-md text-on-surface-variant">
                    Purchase Requisitions
                  </p>

                  <p className="mt-2 text-2xl font-bold text-primary">
                    {dashboard?.total_purchase_requisitions ?? 0}
                  </p>
                </div>

                <div className="rounded-lg bg-surface-container-high/50 p-4">
                  <p className="font-label-md text-label-md text-on-surface-variant">
                    Purchase Orders
                  </p>

                  <p className="mt-2 text-2xl font-bold text-primary">
                    {dashboard?.total_purchase_orders ?? 0}
                  </p>
                </div>

                <div className="rounded-lg bg-surface-container-high/50 p-4">
                  <p className="font-label-md text-label-md text-on-surface-variant">
                    Goods Receipts
                  </p>

                  <p className="mt-2 text-2xl font-bold text-primary">
                    {dashboard?.total_goods_receipts ?? 0}
                  </p>
                </div>

                <div className="rounded-lg bg-surface-container-high/50 p-4">
                  <p className="font-label-md text-label-md text-on-surface-variant">
                    Invoices
                  </p>

                  <p className="mt-2 text-2xl font-bold text-primary">
                    {dashboard?.total_invoices ?? 0}
                  </p>
                </div>

              </div>
            </div>
          </section>

          {/* Spend Summary */}
          <section className="order-4 w-full lg:col-span-2">
            <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-md">

              <div className="mb-6">
                <h3 className="font-title-lg text-title-lg text-on-surface">
                  Spend Summary
                </h3>

                <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                  Procurement and payment financial overview
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

                <div className="rounded-lg bg-surface-container-high/50 p-4">
                  <p className="text-sm text-on-surface-variant">
                    PO Value
                  </p>

                  <p className="mt-2 text-xl font-bold text-primary">
                    {formatUsd(
                      dashboard?.spend.total_po_value ?? 0,
                      "USD"
                    )}
                  </p>
                </div>

                <div className="rounded-lg bg-surface-container-high/50 p-4">
                  <p className="text-sm text-on-surface-variant">
                    Invoice Value
                  </p>

                  <p className="mt-2 text-xl font-bold text-primary">
                    {formatUsd(
                      dashboard?.spend.total_invoice_value ?? 0,
                      "USD"
                    )}
                  </p>
                </div>

                <div className="rounded-lg bg-surface-container-high/50 p-4">
                  <p className="text-sm text-on-surface-variant">
                    Paid Amount
                  </p>

                  <p className="mt-2 text-xl font-bold text-primary">
                    {formatUsd(
                      dashboard?.spend.total_paid_amount ?? 0,
                      "USD"
                    )}
                  </p>
                </div>

                <div className="rounded-lg bg-surface-container-high/50 p-4">
                  <p className="text-sm text-on-surface-variant">
                    Pending Payment
                  </p>

                  <p className="mt-2 text-xl font-bold text-primary">
                    {formatUsd(
                      dashboard?.spend.total_pending_payment ?? 0,
                      "USD"
                    )}
                  </p>
                </div>

              </div>
            </div>
          </section>

          {/* Upload card */}
          <section
            className="
              order-3
              h-full
              w-full
              lg:col-start-1
              lg:row-start-2
            "
          >
            <div className="h-full rounded-xl bg-surface-container-lowest p-1 shadow-xl">
              <div
                onDragEnter={(event) => {
                  event.preventDefault();

                  if (!running) {
                    setDragging(true);
                  }
                }}
                onDragOver={(event) => {
                  event.preventDefault();

                  if (!running) {
                    setDragging(true);
                  }
                }}
                onDragLeave={(event) => {
                  event.preventDefault();

                  /*
                   * Prevent child elements inside the upload card from
                   * incorrectly triggering drag leave.
                   */
                  if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                    setDragging(false);
                  }
                }}
                onDrop={handleDrop}
                onClick={() => {
                  if (!running) {
                    fileInputRef.current?.click();
                  }
                }}
                className={`group relative flex h-full min-h-[490px] flex-col items-center justify-center rounded-lg border-2 border-dashed bg-surface p-12 text-center transition-all duration-300 ${
                  running
                    ? "cursor-not-allowed opacity-70"
                    : "cursor-pointer"
                } ${
                  dragging
                    ? "border-primary bg-primary/5"
                    : "border-outline-variant/50 hover:border-primary/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  className="hidden"
                  accept=".pdf,application/pdf"
                  type="file"
                  multiple
                  disabled={running}
                  onChange={(event) => {
                    const selectedFiles = event.target.files;

                    void handleFiles(selectedFiles);

                    /*
                     * Reset the input so the same PDF can be selected again.
                     */
                    event.target.value = "";
                  }}
                />

                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-container/30 text-primary transition-transform duration-500 group-hover:scale-110">
                  <span
                    className="material-symbols-outlined text-[40px]"
                    style={{
                      fontVariationSettings: '"wght" 300',
                    }}
                  >
                    cloud_upload
                  </span>
                </div>

                <h3 className="mb-2 font-headline-md text-headline-md text-on-surface">
                  {running
                    ? "Processing PDFs..."
                    : "Drag & Drop Invoice Here"}
                </h3>

                <p className="mb-8 font-body-md text-body-md text-on-surface-variant">
                  {running
                    ? "Please wait until the current processing is completed."
                    : "Select one or more PDF files to start the extraction process."}
                </p>

                <div className="mb-8 flex w-full max-w-xs items-center gap-4">
                  <div className="h-px flex-1 bg-outline-variant/30" />

                  <span className="font-label-md text-label-md text-outline">
                    OR
                  </span>

                  <div className="h-px flex-1 bg-outline-variant/30" />
                </div>

                <button
                  type="button"
                  disabled={running}
                  onClick={(event) => {
                    event.stopPropagation();

                    if (!running) {
                      fileInputRef.current?.click();
                    }
                  }}
                  className="rounded-lg bg-primary px-8 py-3 font-title-lg text-title-lg text-on-primary shadow-md transition-all hover:bg-primary/90 hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {running ? "Processing..." : "Browse Files"}
                </button>

                {fileName && (
                  <p className="mt-4 max-w-full break-all font-label-md text-label-md text-on-surface-variant">
                    Selected: {fileName}
                  </p>
                )}

                <div className="mt-8 flex items-center gap-6 text-on-surface-variant/60">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">
                      picture_as_pdf
                    </span>

                    <span className="font-label-md text-label-md">PDF</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* System Status card */}
          <section
            className="
              order-5
              h-full
              w-full
              lg:col-start-2
              lg:row-start-2
            "
          >
            <div
              className={`h-full min-h-[490px] rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-8 shadow-md transition-all duration-500 ${
                !fileName ? "pointer-events-none opacity-60 grayscale" : ""
              }`}
            >
              <div className="mb-8 flex items-center justify-between gap-4">
                <h3 className="flex items-center gap-3 font-title-lg text-title-lg text-on-surface">
                  <span className="material-symbols-outlined text-primary">
                    settings_backup_restore
                  </span>

                  System Status
                </h3>

                {notice?.type === "duplicate" ? (
                  <span className="whitespace-nowrap font-label-md text-yellow-700">
                    Duplicate
                  </span>
                ) : completed ? (
                  <span className="whitespace-nowrap font-label-md text-success">
                    Completed
                  </span>
                ) : running ? (
                  <span className="whitespace-nowrap font-label-md text-primary">
                    Processing…
                  </span>
                ) : (
                  <span className="whitespace-nowrap font-label-md text-on-surface-variant/60">
                    Waiting for file
                  </span>
                )}
              </div>

              <div
                className={`mb-6 rounded-lg border-2 border-outline-variant/30 p-4 transition-all duration-500 ${
                  running
                    ? STATUS_BG_COLOR[currentStatusRaw] ||
                      "bg-surface-container-high/40"
                    : "bg-surface-container-high/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      running && currentStepIndex >= 0
                        ? STATUS_ICON_COLOR[currentStatusRaw] || "text-primary"
                        : "text-on-surface-variant/40"
                    }`}
                  >
                    {running && currentStepIndex >= 0 ? (
                      <span className="material-symbols-outlined text-[18px]">
                        {currentStepIndex === 0
                          ? "cloud_upload"
                          : currentStepIndex === 1
                            ? "description"
                            : currentStepIndex === 2
                              ? "verified_user"
                              : currentStepIndex === 3
                                ? "pending_actions"
                                : "check_circle"}
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-[18px]">
                        schedule
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-label-md text-label-md text-on-surface-variant">
                      Current stage
                    </p>
                    <p
                      className={`mt-1 font-title-lg text-title-lg transition-colors duration-300 ${
                        running && currentStepIndex >= 0
                          ? STATUS_ICON_COLOR[currentStatusRaw] ||
                            "text-on-surface"
                          : "text-on-surface"
                      }`}
                    >
                      {currentStatus}
                    </p>
                  </div>
                </div>
              </div>

              {running && (
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-outline-variant/20">
                      <div
                        className="h-full transition-all duration-500 ease-out"
                        style={{
                          width: `${((currentStepIndex + 1) / STEPS.length) * 100}%`,
                          backgroundColor:
                            currentStepIndex === 0
                              ? "rgb(99, 102, 241)"
                              : currentStepIndex === 1
                                ? "rgb(59, 130, 246)"
                                : currentStepIndex === 2
                                  ? "rgb(34, 197, 94)"
                                  : currentStepIndex === 3
                                    ? "rgb(168, 85, 247)"
                                    : "rgb(34, 197, 94)",
                        }}
                      />
                    </div>
                  </div>
                  <span className="whitespace-nowrap font-label-md text-label-md text-on-surface-variant">
                    {currentStepIndex + 1} of {STEPS.length}
                  </span>
                </div>
              )}

              <div className="relative space-y-8">
                <div className="absolute bottom-2 left-3 top-2 w-[2px] bg-outline-variant/20" />

                {STEPS.map((step, index) => {
                  const state = stepStates[index];
                  const isCompleted = state === "done";
                  const isActive = state === "active";

                  return (
                    <div
                      key={step.id}
                      className={`relative flex items-center gap-6 transition-opacity duration-300 ${
                        isCompleted || isActive ? "opacity-100" : "opacity-60"
                      }`}
                    >
                      <div
                        className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-semibold transition-all duration-300 ${
                          isCompleted
                            ? "scale-100 bg-success shadow-lg shadow-success/30"
                            : isActive
                              ? "scale-110 animate-pulse bg-primary shadow-lg shadow-primary/40"
                              : "scale-95 bg-outline-variant/20"
                        }`}
                      >
                        {isCompleted && (
                          <span className="material-symbols-outlined text-[16px] text-white">
                            check
                          </span>
                        )}

                        {isActive && (
                          <div className="h-2.5 w-2.5 rounded-full bg-white" />
                        )}

                        {!isCompleted && !isActive && (
                          <span className="text-xs text-on-surface-variant">
                            {index + 1}
                          </span>
                        )}
                      </div>

                      <div className="flex-1">
                        <p
                          className={`mb-1 font-title-lg text-title-lg leading-none transition-colors duration-300 ${
                            isCompleted
                              ? "text-success"
                              : isActive
                                ? "text-primary font-semibold"
                                : "text-on-surface-variant"
                          }`}
                        >
                          {step.title}
                        </p>

                        <p
                          className={`font-label-md transition-colors duration-300 ${
                            isCompleted || isActive
                              ? "text-on-surface-variant"
                              : "text-on-surface-variant/50"
                          }`}
                        >
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Recent invoices */}
          {recent.length > 0 && (
            <section
              className="
                order-6
                mx-auto
                flex
                w-full
                flex-col
                gap-3
                lg:col-span-2
                lg:row-start-3
              "
            >
              <div className="flex items-center justify-between px-1">
                <h3 className="font-title-lg text-title-lg text-on-surface">
                  Recent Invoices
                </h3>

                <button
                  type="button"
                  onClick={() => {
                    router.push("/dashboard/invoices");
                  }}
                  className="font-label-md text-label-md text-primary hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {recent.map((invoice) => (
                  <button
                    key={invoice.id}
                    type="button"
                    onClick={() => {
                      const destination =
                        invoice.processing_status === "Approval Pending" ||
                        invoice.processing_status === "Approved" ||
                        invoice.processing_status === "Rejected" ||
                        invoice.processing_status === "PO Completed" ||
                        invoice.processing_status === "PO Generated"
                            ? `/dashboard/invoices/${invoice.id}/approval`
                            : `/dashboard/invoices/${invoice.id}/validation`;

                      router.push(destination);
                    }}
                    className="flex w-full items-center justify-between rounded-lg bg-surface-container-lowest p-4 text-left shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-body-md text-body-md font-semibold text-on-surface">
                        {invoice.vendor_name}
                      </span>

                      <span className="font-label-md text-label-md text-on-surface-variant">
                        {invoice.invoice_number} · {fmtDate(invoice.invoice_date)}
                      </span>
                    </div>

                    <div className="ml-4 flex shrink-0 items-center gap-4">
                      <span className="font-body-md text-body-md text-on-surface">
                        {formatUsd(invoice.total_amount, invoice.currency)}
                      </span>

                      <span
                        className={`font-label-md text-label-md ${
                            STATUS_COLOR[invoice.processing_status]
                        }`}
                      >
                        {STATUS_LABEL[invoice.processing_status]}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
