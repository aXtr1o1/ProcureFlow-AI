"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createInvoiceFromFile,
  fmtDate,
  listInvoices,
  type Invoice,
} from "@/lib/invoices";

type StepState = "pending" | "active" | "done";

type Step = {
  id: number;
  title: string;
  description: string;
};

const STEPS: Step[] = [
  {
    id: 1,
    title: "Invoice Uploaded",
    description: "File ready for analysis",
  },
  {
    id: 2,
    title: "AI Processing",
    description: "Identifying document structure",
  },
  {
    id: 3,
    title: "OCR Extraction",
    description: "Converting pixels to financial data",
  },
  {
    id: 4,
    title: "Validation & PO Match",
    description: "Ensuring policy compliance",
  },
];

const STATUS_LABEL: Record<Invoice["status"], string> = {
  processing: "Processing",
  pending_validation: "Pending Validation",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
};

const STATUS_COLOR: Record<Invoice["status"], string> = {
  processing: "text-on-surface-variant",
  pending_validation: "text-primary",
  pending_approval: "text-secondary",
  approved: "text-success",
  rejected: "text-error",
};

export default function DashboardPage() {
  const router = useRouter();

  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const [stepStates, setStepStates] = useState<StepState[]>(
    STEPS.map(() => "pending"),
  );

  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [newInvoiceId, setNewInvoiceId] = useState<string | null>(null);
  const [recent, setRecent] = useState<Invoice[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshRecent = useCallback(() => {
    setRecent(listInvoices().slice(0, 6));
  }, []);

  useEffect(() => {
    refreshRecent();

    const onUpdate = () => {
      refreshRecent();
    };

    window.addEventListener("invoices:updated", onUpdate);

    return () => {
      window.removeEventListener("invoices:updated", onUpdate);
    };
  }, [refreshRecent]);

  /*
   * Clear the processing timer when the user leaves this page.
   * This prevents state updates after the component is unmounted.
   */
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const stats = {
    total: recent.length,
    avgTime: "1.4s",
  };

  const runProcessing = useCallback(
    (file: File) => {
      return new Promise<void>((resolve) => {
        setFileName(file.name);
        setCompleted(false);
        setRunning(true);
        setNewInvoiceId(null);
        setStepStates(STEPS.map(() => "pending"));

        if (timerRef.current) {
          clearInterval(timerRef.current);
        }

        let stepIndex = 0;

        timerRef.current = setInterval(() => {
          setStepStates((previousStates) => {
            const nextStates = [...previousStates];

            if (stepIndex > 0) {
              nextStates[stepIndex - 1] = "done";
            }

            if (stepIndex < STEPS.length) {
              nextStates[stepIndex] = "active";
            }

            return nextStates;
          });

          stepIndex += 1;

          if (stepIndex > STEPS.length) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }

            setStepStates(STEPS.map(() => "done"));
            setRunning(false);
            setCompleted(true);

            const invoice = createInvoiceFromFile(file.name);

            setNewInvoiceId(invoice.id);
            refreshRecent();

            resolve();
          }
        }, 900);
      });
    },
    [refreshRecent],
  );

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
        await runProcessing(file);
      }
    },
    [running, runProcessing],
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
          <div className="order-1 mx-auto flex w-full max-w-3xl flex-col justify-end gap-2 lg:col-start-1 lg:row-start-1">
            <h1 className="font-display-lg text-display-lg text-on-surface">
              Upload Invoice
            </h1>
          </div>

          {/* Summary statistics - above System Status */}
          <section className="order-2 mx-auto w-full max-w-3xl lg:col-start-2 lg:row-start-1">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-outline-variant/10 bg-surface-container-high/50 p-5 shadow-sm">
                <p className="font-label-md text-label-md text-on-surface-variant">
                  Today&apos;s Total
                </p>

                <h2 className="mt-2 text-3xl font-bold text-primary">
                  {stats.total}
                </h2>
              </div>

              <div className="rounded-xl border border-outline-variant/10 bg-surface-container-high/50 p-5 shadow-sm">
                <p className="font-label-md text-label-md text-on-surface-variant">
                  Avg. Time
                </p>

                <h2 className="mt-2 text-3xl font-bold text-primary">
                  {stats.avgTime}
                </h2>
              </div>
            </div>
          </section>

          {/* Upload card */}
          <section className="order-3 mx-auto h-full w-full max-w-3xl lg:col-start-1 lg:row-start-2">
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
          <section className="order-4 mx-auto h-full w-full max-w-3xl lg:col-start-2 lg:row-start-2">
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

                {completed ? (
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

              <div className="relative space-y-8">
                <div className="absolute bottom-2 left-3 top-2 w-[2px] bg-outline-variant/20" />

                {STEPS.map((step, index) => {
                  const state = stepStates[index];

                  return (
                    <div
                      key={step.id}
                      className="relative flex items-center gap-6"
                    >
                      <div
                        className={`z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
                          state === "done"
                            ? "bg-success"
                            : state === "active"
                              ? "animate-pulse bg-primary"
                              : "bg-outline-variant/30"
                        }`}
                      >
                        {state === "done" && (
                          <span className="material-symbols-outlined text-[14px] text-white">
                            check
                          </span>
                        )}

                        {state === "active" && (
                          <div className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </div>

                      <div>
                        <p className="mb-1 font-title-lg text-title-lg leading-none text-on-surface">
                          {step.title}
                        </p>

                        <p className="font-label-md text-label-md text-on-surface-variant">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {completed && newInvoiceId && (
                <button
                  type="button"
                  onClick={() => {
                    router.push(
                      `/dashboard/invoices/${newInvoiceId}/validation`,
                    );
                  }}
                  className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3.5 font-title-lg text-title-lg text-on-primary shadow-md transition-all hover:bg-primary/90 hover:shadow-lg"
                >
                  Review Extracted Invoice

                  <span className="material-symbols-outlined text-[20px]">
                    arrow_forward
                  </span>
                </button>
              )}
            </div>
          </section>

          {/* Recent invoices */}
          {recent.length > 0 && (
            <section className="order-5 mx-auto flex w-full max-w-3xl flex-col gap-3 lg:col-start-1 lg:row-start-3">
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
                        invoice.status === "pending_approval"
                          ? `/dashboard/invoices/${invoice.id}/approval`
                          : `/dashboard/invoices/${invoice.id}/validation`;

                      router.push(destination);
                    }}
                    className="flex w-full items-center justify-between rounded-lg bg-surface-container-lowest p-4 text-left shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-body-md text-body-md font-semibold text-on-surface">
                        {invoice.vendor}
                      </span>

                      <span className="font-label-md text-label-md text-on-surface-variant">
                        {invoice.invoiceNumber} · {fmtDate(invoice.date)}
                      </span>
                    </div>

                    <div className="ml-4 flex shrink-0 items-center gap-4">
                      <span className="font-body-md text-body-md text-on-surface">
                        ${invoice.amount.toFixed(2)}
                      </span>

                      <span
                        className={`font-label-md text-label-md ${
                          STATUS_COLOR[invoice.status]
                        }`}
                      >
                        {STATUS_LABEL[invoice.status]}
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