"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  InvoiceProcessingProvider,
  useInvoiceProcessing,
} from "@/context/InvoiceProcessingContext";
import { AssistantChatProvider, useAssistantChat } from "@/context/AssistantChatContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

function ProcessingBanner() {
  const pathname = usePathname();
  const {
    running,
    completed,
    fileName,
    currentStatus,
    newInvoiceId,
    notice,
    clearNotice,
  } = useInvoiceProcessing();

  // Full System Status lives on the upload page — skip banner there
  if (pathname === "/dashboard") {
    return null;
  }

  if (notice && !running) {
    return (
      <div className="sticky top-16 z-40 border-b border-outline-variant/20 bg-surface-container-lowest px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-container-max items-start gap-3">
          <span className="material-symbols-outlined mt-0.5 text-[20px] text-primary">
            {notice.type === "duplicate"
              ? "content_copy"
              : notice.type === "error"
                ? "error"
                : "info"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-label-md text-label-md font-semibold text-on-surface">
              {notice.title}
            </p>
            <p className="mt-0.5 font-body-md text-body-md text-on-surface-variant">
              {notice.message}
            </p>
            {completed && newInvoiceId && (
              <Link
                href={`/dashboard/invoices/${newInvoiceId}/validation`}
                className="mt-2 inline-flex font-label-md text-label-md text-primary underline"
              >
                Open validation
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={clearNotice}
            className="shrink-0 rounded p-1 text-on-surface-variant hover:bg-surface-container"
            aria-label="Dismiss"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </div>
    );
  }

  if (!running) {
    return null;
  }

  return (
    <div className="sticky top-16 z-40 border-b border-primary/20 bg-primary/5 px-4 py-3">
      <div className="mx-auto flex max-w-container-max items-center gap-3">
        <span className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-label-md text-label-md text-on-surface">
            Processing {fileName || "invoice"}…
          </p>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {currentStatus} — progress is kept while you navigate
          </p>
        </div>
        <Link
          href="/dashboard"
          className="shrink-0 font-label-md text-label-md text-primary underline"
        >
          View stages
        </Link>
      </div>
    </div>
  );
}

function AssistantBanner() {
  const pathname = usePathname();
  const { typing, status } = useAssistantChat();

  if (!typing || pathname === "/dashboard/assistant") {
    return null;
  }

  return (
    <div className="sticky top-16 z-40 border-b border-primary/20 bg-primary/5 px-4 py-3">
      <div className="mx-auto flex max-w-container-max items-center gap-3">
        <span className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-label-md text-label-md text-on-surface">
            Assistant is generating a response…
          </p>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {status || "Working…"} — kept while you navigate
          </p>
        </div>
        <Link
          href="/dashboard/assistant"
          className="shrink-0 font-label-md text-label-md text-primary underline"
        >
          Open chat
        </Link>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <InvoiceProcessingProvider>
      <AssistantChatProvider>
        <Header />
        <main className="w-full pt-16 bg-surface min-h-[calc(100vh-80px)]">
          <ProcessingBanner />
          <AssistantBanner />
          {children}
        </main>
        <Footer />
      </AssistantChatProvider>
    </InvoiceProcessingProvider>
  );
}
