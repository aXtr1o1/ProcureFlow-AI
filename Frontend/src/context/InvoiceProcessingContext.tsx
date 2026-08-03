"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { analyzeInvoice } from "@/services/api";

export type StepState = "pending" | "active" | "done";

export type Step = {
  id: number;
  title: string;
  description: string;
  statuses: string[];
};

export type Notice = {
  type: "duplicate" | "error" | "info";
  title: string;
  message: string;
} | null;

export const STEPS: Step[] = [
  {
    id: 1,
    title: "Invoice Uploaded",
    description: "File received and stored for processing",
    statuses: ["Uploaded"],
  },
  {
    id: 2,
    title: "OCR Extraction",
    description: "Invoice details are being extracted from the PDF",
    statuses: ["OCR Completed"],
  },
  {
    id: 3,
    title: "Validation",
    description: "Invoice data is checked for completeness and validity",
    statuses: ["Validation Completed"],
  },
];

export const STATUS_LABEL: Record<string, string> = {
  Uploaded: "Uploaded",
  "OCR Completed": "OCR Completed",
  "Validation Completed": "Validation Completed",
  Duplicate: "Duplicate",
  Failed: "Failed",
  Matched: "Matched",
  "Review Required": "Review Required",
  "PO Completed": "PO Completed",
  Rejected: "Rejected",
};

export const STATUS_COLOR: Record<string, string> = {
  Uploaded: "text-primary",
  "OCR Completed": "text-blue-600",
  "Validation Completed": "text-green-700",
  Duplicate: "text-yellow-700",
  Failed: "text-error",
  Matched: "text-green-700",
  "Review Required": "text-yellow-700",
  "PO Completed": "text-indigo-700",
  Rejected: "text-error",
};

export const STATUS_BG_COLOR: Record<string, string> = {
  Uploaded: "bg-primary/10",
  "OCR Completed": "bg-blue-50",
  "Validation Completed": "bg-green-50",
  Duplicate: "bg-yellow-50",
  Failed: "bg-red-50",
  Matched: "bg-green-50",
  "Review Required": "bg-yellow-50",
  "Approval Pending": "bg-secondary-container/10",
  Approved: "bg-green-50",
  Rejected: "bg-red-50",
  "PO Completed": "bg-indigo-50",
};

export const STATUS_ICON_COLOR: Record<string, string> = {
  Uploaded: "text-primary",
  "OCR Completed": "text-blue-600",
  "Validation Completed": "text-green-600",
  Duplicate: "text-yellow-600",
  Failed: "text-error",
  Matched: "text-green-600",
  "Review Required": "text-yellow-600",
  "Approval Pending": "text-secondary-container",
  Approved: "text-green-600",
  Rejected: "text-red-600",
  "PO Completed": "text-indigo-600",
};

const TERMINAL_UPLOAD_STATUSES = new Set([
  "Validation Completed",
  "Duplicate",
  "Failed",
]);

type InvoiceProcessingContextType = {
  fileName: string | null;
  stepStates: StepState[];
  currentStatus: string;
  currentStatusRaw: string;
  currentStepIndex: number;
  running: boolean;
  completed: boolean;
  newInvoiceId: string | null;
  notice: Notice;
  clearNotice: () => void;
  startProcessing: (file: File) => Promise<void>;
};

const InvoiceProcessingContext =
  createContext<InvoiceProcessingContextType | undefined>(undefined);

function computeStepUi(status: string) {
  const normalizedStatus = status?.trim() ?? "";
  const completedStep = STEPS.findIndex((step) =>
    step.statuses.includes(normalizedStatus),
  );
  const isFailed = normalizedStatus === "Failed";
  const isDuplicate = normalizedStatus === "Duplicate";
  const isTerminal = TERMINAL_UPLOAD_STATUSES.has(normalizedStatus);
  const label = STATUS_LABEL[normalizedStatus] ?? normalizedStatus;

  if ((isFailed || isDuplicate) && completedStep < 0) {
    return {
      currentStatus: isDuplicate ? "Duplicate" : "Failed",
      currentStatusRaw: normalizedStatus,
      currentStepIndex: 1,
      stepStates: STEPS.map((_, index) =>
        index <= 1 ? ("done" as StepState) : ("pending" as StepState),
      ),
    };
  }

  return {
    currentStatus:
      !isTerminal && completedStep >= 0 && completedStep < STEPS.length - 1
        ? STEPS[completedStep + 1].title
        : label || "Waiting for file",
    currentStatusRaw: normalizedStatus,
    currentStepIndex: isTerminal
      ? completedStep
      : Math.min(completedStep + 1, STEPS.length - 1),
    stepStates: STEPS.map((_, index): StepState => {
      if (completedStep < 0) return "pending";
      if (index <= completedStep) return "done";
      if (index === completedStep + 1 && !isTerminal) return "active";
      return "pending";
    }),
  };
}

export function InvoiceProcessingProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const [fileName, setFileName] = useState<string | null>(null);
  const [stepStates, setStepStates] = useState<StepState[]>(
    STEPS.map(() => "pending"),
  );
  const [currentStatus, setCurrentStatus] = useState("Waiting for file");
  const [currentStatusRaw, setCurrentStatusRaw] = useState("");
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [newInvoiceId, setNewInvoiceId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const runningRef = useRef(false);

  const applyStatus = useCallback((status: string) => {
    const ui = computeStepUi(status);
    setCurrentStatus(ui.currentStatus);
    setCurrentStatusRaw(ui.currentStatusRaw);
    setCurrentStepIndex(ui.currentStepIndex);
    setStepStates(ui.stepStates);
  }, []);

  const clearNotice = useCallback(() => setNotice(null), []);

  const startProcessing = useCallback(
    async (file: File) => {
      if (runningRef.current) return;
      runningRef.current = true;

      setFileName(file.name);
      setCompleted(false);
      setRunning(true);
      setNewInvoiceId(null);
      setNotice(null);
      setStepStates(STEPS.map(() => "pending"));
      applyStatus("Uploaded");

      try {
        const result = await analyzeInvoice(file);
        console.log("Analyze result:", result);

        if (
          result?.duplicate === true ||
          String(result?.processing_status ?? "").trim() === "Duplicate"
        ) {
          const message =
            result.message ||
            `Invoice number "${result.invoice_number}" already exists. Invoice was not uploaded.`;
          applyStatus("Duplicate");
          setCompleted(false);
          setRunning(false);
          runningRef.current = false;
          setNewInvoiceId(null);
          setNotice({
            type: "duplicate",
            title: "Duplicate Invoice Detected",
            message,
          });
          return;
        }

        if (!result.success || !result.invoice_id) {
          console.error("Invoice ID not returned:", result);
          setRunning(false);
          runningRef.current = false;
          setNotice({
            type: "error",
            title: "Upload Failed",
            message: result.message || "Invoice upload failed.",
          });
          return;
        }

        const invoiceId = result.invoice_id;
        const status = String(result.processing_status ?? "").trim();
        setNewInvoiceId(String(invoiceId));

        if (status === "Failed") {
          applyStatus("Failed");
          setRunning(false);
          runningRef.current = false;
          setNotice({
            type: "error",
            title: "Processing Failed",
            message:
              result.message ||
              "Invoice processing failed during OCR or validation.",
          });
          return;
        }

        if (status === "Validation Completed") {
          applyStatus("OCR Completed");
          applyStatus("Validation Completed");
          setCompleted(true);
          setRunning(false);
          runningRef.current = false;
          window.dispatchEvent(new Event("invoices:updated"));

          // Redirect only when still on the upload page so other screens aren't interrupted
          if (pathnameRef.current === "/dashboard") {
            router.push(`/dashboard/invoices/${invoiceId}/validation`);
          } else {
            setNotice({
              type: "info",
              title: "Invoice Ready",
              message: `Processing finished for "${file.name}". Open validation to continue.`,
            });
          }
          return;
        }

        applyStatus(status || "Failed");
        setRunning(false);
        runningRef.current = false;
        setNotice({
          type: "info",
          title: "Processing Finished",
          message: `Invoice processing finished with status "${status || "unknown"}".`,
        });
        window.dispatchEvent(new Event("invoices:updated"));
      } catch (error) {
        console.error(error);
        setRunning(false);
        runningRef.current = false;
        setNotice({
          type: "error",
          title: "Upload Failed",
          message:
            error instanceof Error ? error.message : "Invoice upload failed.",
        });
      }
    },
    [applyStatus, router],
  );

  const value = useMemo(
    () => ({
      fileName,
      stepStates,
      currentStatus,
      currentStatusRaw,
      currentStepIndex,
      running,
      completed,
      newInvoiceId,
      notice,
      clearNotice,
      startProcessing,
    }),
    [
      fileName,
      stepStates,
      currentStatus,
      currentStatusRaw,
      currentStepIndex,
      running,
      completed,
      newInvoiceId,
      notice,
      clearNotice,
      startProcessing,
    ],
  );

  return (
    <InvoiceProcessingContext.Provider value={value}>
      {children}
    </InvoiceProcessingContext.Provider>
  );
}

export function useInvoiceProcessing() {
  const ctx = useContext(InvoiceProcessingContext);
  if (!ctx) {
    throw new Error(
      "useInvoiceProcessing must be used within InvoiceProcessingProvider",
    );
  }
  return ctx;
}
