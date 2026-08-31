"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getInvoices } from "@/services/api";
import { fmtDate, type Invoice } from "@/lib/invoices";
import { formatUsd } from "@/lib/currency";

/* ==========================================================
   Dashboard Types
========================================================== */

type FunnelStage = {
  count: number;
  value: number;
  average_time: number | null;
  pending: number;
  sla_breaches: number;
};

type DashboardOverview = {
  kpis: {
    total_procurement_value: number;
    active_pos: number;
    invoices_processed: number;
    pending_invoices: number;
    matched_invoices: number;
    exception_rate: number;
    pending_approval_value: number;
    average_processing_time: number | null;
    potential_savings: number;
    overdue_payments: number;

    total_business_needs: number;
    total_purchase_requisitions: number;
    total_purchase_orders: number;
    total_goods_receipts: number;
    total_invoices: number;
    total_payments: number;
    total_exceptions: number;

    total_po_value: number;
    total_invoice_value: number;
    total_paid_amount: number;
    total_pending_payment: number;
  };

  funnel: {
    business_needs: FunnelStage;
    purchase_requisitions: FunnelStage;
    purchase_orders: FunnelStage;
    goods_receipts: FunnelStage;
    invoices: FunnelStage;
    payments: FunnelStage;
  };

  business_need_status: Record<string, number>;
  purchase_requisition_status: Record<string, number>;
  purchase_order_status: Record<string, number>;
  goods_receipt_status: Record<string, number>;
  invoice_status: Record<string, number>;
  payment_status: Record<string, number>;

  po_intelligence: {
    total_pos: number;
    po_value: number;
    open_pos: number;
    closed_pos: number;
    cancelled_pos: number;
    pending_approvals: number;
    average_po_creation_time: number | null;
    average_po_approval_time: number | null;
    po_to_invoice_conversion_ratio: number;
    average_po_aging: number | null;
    po_value_by_department: Record<string, number>;
    po_value_by_vendor: Record<string, number>;
  };

  invoice_intelligence: {
    total_invoices_received: number;
    successfully_extracted: number;
    extraction_failed: number;
    extraction_confidence: number | null;
    duplicate_invoices: number;
    missing_fields: number;
    po_linked_invoices: number;
    non_po_invoices: number;
    processing_time: number | null;
    manual_review_time: number | null;
    matched_invoices: number;
    unmatched_invoices: number;
    exception_count: number;
    exception_rate: number;
  };

  vendor_intelligence: {
    vendors: Array<{
      vendor_name: string;
      overall_score: number | null;
      on_time_delivery: number | null;
      invoice_accuracy: number | null;
      po_compliance: number | null;
      price_variance: number;
      exception_rate: number;
      payment_dispute: number | null;
      total_spend: number;
      number_of_pos: number;
      number_of_invoices: number;
      average_invoice_value: number;
      payment_terms: string | null;
      average_payment_time: number | null;
    }>;
    total_vendor_spend: number;
    total_vendors: number;
  };

  spend_analytics: {
    total_spend: number;
    by_department: Record<string, number>;
    by_business_unit: Record<string, number>;
    by_category: Record<string, number>;
    by_vendor: Record<string, number>;
    by_location: Record<string, number>;
    by_month: Record<string, number>;
    by_quarter: Record<string, number>;
    by_project: Record<string, number>;
    by_cost_center: Record<string, number>;
    total_po_value: number;
    total_invoice_value: number;
    total_paid_amount: number;
    total_pending_payment: number;
    total_exception_value: number;
    potential_savings: number;
  };

  po_trends: {
    trends: Array<{
      period: string;
      po_value: number;
      invoice_value: number;
      payment_value: number;
      number_of_pos: number;
      number_of_invoices: number;
      exceptions: number;
      savings: number;
    }>;
  };

  spend: {
    total_po_value: number;
    total_invoice_value: number;
    total_paid_amount: number;
    total_pending_payment: number;
    total_exception_value: number;
    potential_savings: number;
    overdue_payment_value: number;
  };
};

/* ==========================================================
   Dashboard API
========================================================== */

async function getDashboardOverview(): Promise<DashboardOverview> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken")
      : null;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  const response = await fetch(
    `${apiUrl}/dashboard/overview`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    let message = `Failed to load dashboard overview: ${response.status}`;

    try {
      const errorData = await response.json();

      if (errorData?.detail) {
        message = String(errorData.detail);
      }
    } catch {
      // Keep default error message.
    }

    throw new Error(message);
  }

  return (await response.json()) as DashboardOverview;
}

/* ==========================================================
   Helpers
========================================================== */

function getStatusCount(
  statuses: Record<string, number>,
  names: string[]
): number {
  return names.reduce(
    (total, name) => total + (statuses[name] ?? 0),
    0
  );
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatStageName(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatMetric(
  value: number | null | undefined,
  suffix = ""
): string {
  if (value === null || value === undefined) {
    return "—";
  }

  return `${value}${suffix}`;
}

/* ==========================================================
   Dashboard Page
========================================================== */

export default function DashboardPage() {
  const router = useRouter();

  const [recent, setRecent] = useState<Invoice[]>([]);

  const [dashboard, setDashboard] =
    useState<DashboardOverview | null>(null);

  const [dashboardLoading, setDashboardLoading] =
    useState(true);

  const [dashboardError, setDashboardError] =
    useState<string | null>(null);

  /* ========================================================
     Recent Invoices
  ======================================================== */

  const refreshRecent = useCallback(async () => {
    try {
      const response = await getInvoices();

      const list = Array.isArray(response?.data)
        ? response.data
        : [];

      setRecent(list.slice(0, 6));
    } catch (error) {
      console.error(
        "Failed to load recent invoices:",
        error
      );

      setRecent([]);
    }
  }, []);

  /* ========================================================
     Dashboard
  ======================================================== */

  const refreshDashboard = useCallback(async () => {
    try {
      setDashboardLoading(true);
      setDashboardError(null);

      const overview =
        await getDashboardOverview();

      setDashboard(overview);
    } catch (error) {
      console.error(
        "Failed to load dashboard data:",
        error
      );

      setDashboard(null);

      setDashboardError(
        error instanceof Error
          ? error.message
          : "Failed to load dashboard data."
      );
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

    window.addEventListener(
      "invoices:updated",
      onUpdate
    );

    return () => {
      window.removeEventListener(
        "invoices:updated",
        onUpdate
      );
    };
  }, [refreshRecent, refreshDashboard]);

  /* ========================================================
     Executive Metrics
  ======================================================== */

  const executiveMetrics = useMemo(() => {
    const kpis = dashboard?.kpis;

    if (!kpis) {
      return {
        totalProcurementValue: 0,
        activePOs: 0,
        invoicesProcessed: 0,
        pendingInvoices: 0,
        matchedInvoices: 0,
        exceptionRate: 0,
        pendingApprovalValue: 0,
        averageProcessingTime: null,
        potentialSavings: 0,
        overduePayments: 0,
      };
    }

    return {
      totalProcurementValue:
        kpis.total_procurement_value ??
        kpis.total_po_value ??
        0,

      activePOs:
        kpis.active_pos ?? 0,

      invoicesProcessed:
        kpis.invoices_processed ??
        kpis.total_invoices ??
        0,

      pendingInvoices:
        kpis.pending_invoices ?? 0,

      matchedInvoices:
        kpis.matched_invoices ?? 0,

      exceptionRate:
        kpis.exception_rate ?? 0,

      pendingApprovalValue:
        kpis.pending_approval_value ?? 0,

      averageProcessingTime:
        kpis.average_processing_time ?? null,

      potentialSavings:
        kpis.potential_savings ?? 0,

      overduePayments:
        kpis.overdue_payments ?? 0,
    };
  }, [dashboard]);

  /* ========================================================
     Workflow Status
  ======================================================== */

  const statusSections = [
    {
      title: "Business Needs",
      data: dashboard?.business_need_status,
    },
    {
      title: "Purchase Requisitions",
      data: dashboard?.purchase_requisition_status,
    },
    {
      title: "Purchase Orders",
      data: dashboard?.purchase_order_status,
    },
    {
      title: "Goods Receipts",
      data: dashboard?.goods_receipt_status,
    },
    {
      title: "Invoices",
      data: dashboard?.invoice_status,
    },
    {
      title: "Payments",
      data: dashboard?.payment_status,
    },
  ];

  /* ========================================================
     Procurement Navigation
  ======================================================== */

  const procurementModules = [
    {
      title: "Business Needs",
      description:
        "Create and manage business requirements.",
      icon: "assignment",
      href: "/dashboard/business-needs",
    },
    {
      title: "Purchase Requisitions",
      description:
        "Create, submit and approve requisitions.",
      icon: "request_quote",
      href: "/dashboard/purchase-requisitions",
    },
    {
      title: "Purchase Orders",
      description:
        "Create and manage purchase orders.",
      icon: "receipt_long",
      href: "/dashboard/purchase-orders",
    },
    {
      title: "Goods Receipts",
      description:
        "Record and manage received goods.",
      icon: "inventory_2",
      href: "/dashboard/goods-receipts",
    },
  ];

  /* ========================================================
     Executive KPI Cards
  ======================================================== */

  const executiveKpis = [
    {
      label: "Total Procurement Value",
      value: dashboardLoading
        ? "..."
        : formatUsd(
            executiveMetrics.totalProcurementValue,
            "USD"
          ),
      description:
        "Total value of purchase orders",
    },
    {
      label: "Active POs",
      value: dashboardLoading
        ? "..."
        : executiveMetrics.activePOs,
      description:
        "Currently open purchase orders",
    },
    {
      label: "Invoices Processed",
      value: dashboardLoading
        ? "..."
        : executiveMetrics.invoicesProcessed,
      description:
        "Total invoices processed",
    },
    {
      label: "Pending Invoices",
      value: dashboardLoading
        ? "..."
        : executiveMetrics.pendingInvoices,
      description:
        "Invoices waiting for action",
    },
    {
      label: "Matched Invoices",
      value: dashboardLoading
        ? "..."
        : executiveMetrics.matchedInvoices,
      description:
        "Successfully matched invoices",
    },
    {
      label: "Exception Rate",
      value: dashboardLoading
        ? "..."
        : formatPercent(
            executiveMetrics.exceptionRate
          ),
      description:
        "Invoices requiring intervention",
    },
    {
      label: "Pending Approval",
      value: dashboardLoading
        ? "..."
        : formatUsd(
            executiveMetrics.pendingApprovalValue,
            "USD"
          ),
      description:
        "Value waiting for approval",
    },
    {
      label: "Average Processing Time",
      value: dashboardLoading
        ? "..."
        : formatMetric(
            executiveMetrics.averageProcessingTime,
            " days"
          ),
      description:
        "End-to-end processing time",
    },
    {
      label: "Potential Savings",
      value: dashboardLoading
        ? "..."
        : formatUsd(
            executiveMetrics.potentialSavings,
            "USD"
          ),
      description:
        "Identified negotiation or price savings",
    },
    {
      label: "Overdue Payments",
      value: dashboardLoading
        ? "..."
        : formatUsd(
            executiveMetrics.overduePayments,
            "USD"
          ),
      description:
        "Payments beyond agreed terms",
    },
  ];

  /* ========================================================
     Procurement Cycle Funnel
  ======================================================== */

  const funnelStages = [
    {
      label: "Business Needs",
      stage: dashboard?.funnel?.business_needs,
      href: "/dashboard/business-needs",
    },
    {
      label: "Purchase Requisitions",
      stage:
        dashboard?.funnel?.purchase_requisitions,
      href: "/dashboard/purchase-requisitions",
    },
    {
      label: "Purchase Orders",
      stage:
        dashboard?.funnel?.purchase_orders,
      href: "/dashboard/purchase-orders",
    },
    {
      label: "Goods Receipts",
      stage:
        dashboard?.funnel?.goods_receipts,
      href: "/dashboard/goods-receipts",
    },
    {
      label: "Invoices",
      stage:
        dashboard?.funnel?.invoices,
      href: "/dashboard/invoices",
    },
    {
      label: "Payments",
      stage:
        dashboard?.funnel?.payments,
      href: "#",
    },
  ];

  /* ========================================================
     Analytics Navigation
  ======================================================== */

  const analyticsModules = [
    {
      title: "Procurement Cycle",
      description:
        "Count, value, average time, pending items and SLA breaches.",
      icon: "account_tree",
      href: "/dashboard/procurement-funnel",
    },
    {
      title: "PO Intelligence",
      description:
        "PO value, approvals, aging, department and vendor analysis.",
      icon: "analytics",
      href: "/dashboard/po-intelligence",
    },
    {
      title: "Invoice Intelligence",
      description:
        "Extraction, matching, duplicates, exceptions and processing analytics.",
      icon: "receipt_long",
      href: "/dashboard/invoice-intelligence",
    },
    {
      title: "Vendor Intelligence",
      description:
        "Vendor performance, compliance, spend and price variance.",
      icon: "storefront",
      href: "/dashboard/vendor-intelligence",
    },
    {
      title: "Spend Analytics",
      description:
        "Analyze spend by department, business unit, category, vendor and location.",
      icon: "payments",
      href: "/dashboard/spend-analytics",
    },
    {
      title: "PO Trend Analytics",
      description:
        "Track PO, invoice, payment, exceptions and savings over time.",
      icon: "show_chart",
      href: "/dashboard/po-trends",
    },
  ];

  /* ========================================================
     Render
  ======================================================== */

  return (
    <div className="min-h-screen w-full bg-surface">

      {/* Background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-[5%] -top-[10%] h-[40%] w-[40%] rounded-full bg-primary/5 blur-[120px]" />

        <div className="absolute -right-[10%] top-[20%] h-[30%] w-[30%] rounded-full bg-secondary/5 blur-[100px]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-container-max px-margin-desktop py-12">

        {/* ==================================================
            Header
        ================================================== */}

        <section className="mb-8">
          <h1 className="font-display-lg text-display-lg text-on-surface">
            Procurement Dashboard
          </h1>

          <p className="mt-2 max-w-3xl font-body-md text-body-md text-on-surface-variant">
            Executive view of the complete procurement
            lifecycle from Business Need to Payment.
          </p>
        </section>

        {/* ==================================================
            Error
        ================================================== */}

        {dashboardError && (
          <div className="mb-8 flex items-start justify-between gap-4 rounded-xl border border-red-300 bg-red-50 p-4 text-red-900">
            <div>
              <p className="font-title-lg text-title-lg font-semibold">
                Dashboard data unavailable
              </p>

              <p className="mt-1 font-body-md text-body-md">
                {dashboardError}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void refreshDashboard()
              }
              className="rounded-lg bg-red-600 px-4 py-2 font-label-md text-label-md text-white hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* ==================================================
            Executive Overview
        ================================================== */}

        <section className="mb-8">
          <div className="mb-4">
            <h2 className="font-title-lg text-title-lg text-on-surface">
              Executive Overview
            </h2>

            <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
              Key procurement performance indicators.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {executiveKpis.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-xl border border-outline-variant/10 bg-surface-container-high/50 p-5 shadow-sm"
              >
                <p className="font-label-md text-label-md text-on-surface-variant">
                  {kpi.label}
                </p>

                <p className="mt-2 text-2xl font-bold text-primary">
                  {kpi.value}
                </p>

                <p className="mt-2 text-xs text-on-surface-variant">
                  {kpi.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ==================================================
            Procurement Modules
        ================================================== */}

        <section className="mb-8">
          <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-md">

            <div className="mb-6">
              <h2 className="font-title-lg text-title-lg text-on-surface">
                Procurement
              </h2>

              <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                Access and manage each stage of the procurement workflow.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {procurementModules.map((module) => (
                <button
                  key={module.title}
                  type="button"
                  onClick={() =>
                    router.push(module.href)
                  }
                  className="group rounded-xl border border-outline-variant/20 bg-surface-container-high/40 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <span className="material-symbols-outlined">
                      {module.icon}
                    </span>
                  </div>

                  <h3 className="font-title-lg text-title-lg text-on-surface">
                    {module.title}
                  </h3>

                  <p className="mt-1 font-label-md text-label-md text-on-surface-variant">
                    {module.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ==================================================
            Procurement Intelligence Navigation
        ================================================== */}

        <section className="mb-8">
          <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-md">

            <div className="mb-6">
              <h2 className="font-title-lg text-title-lg text-on-surface">
                Procurement Intelligence
              </h2>

              <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                Detailed analytics and business intelligence.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {analyticsModules.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() =>
                    router.push(item.href)
                  }
                  className="group rounded-xl border border-outline-variant/20 bg-surface-container-high/40 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <span className="material-symbols-outlined">
                      {item.icon}
                    </span>
                  </div>

                  <h3 className="font-title-lg text-title-lg text-on-surface">
                    {item.title}
                  </h3>

                  <p className="mt-1 font-label-md text-label-md text-on-surface-variant">
                    {item.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ==================================================
            Procurement Cycle Funnel
        ================================================== */}

        <section className="mb-8">
          <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-md">

            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-title-lg text-title-lg text-on-surface">
                  Procurement Cycle Funnel
                </h2>

                <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                  Business Need → Purchase Requisition →
                  Purchase Order → Goods Receipt → Invoice →
                  Payment
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/dashboard/procurement-funnel"
                  )
                }
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20"
                title="Open procurement funnel"
              >
                <span className="material-symbols-outlined">
                  open_in_new
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              {funnelStages.map(
                (stage, index) => {
                  const metrics = stage.stage;

                  return (
                    <button
                      key={stage.label}
                      type="button"
                      onClick={() => {
                        if (stage.href !== "#") {
                          router.push(stage.href);
                        }
                      }}
                      disabled={stage.href === "#"}
                      className="relative rounded-xl bg-surface-container-high/50 p-4 text-left transition-all hover:bg-surface-container-high disabled:cursor-default"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {index + 1}
                        </span>

                        {index < 5 && (
                          <span className="material-symbols-outlined hidden text-on-surface-variant/50 lg:block">
                            arrow_forward
                          </span>
                        )}
                      </div>

                      <p className="font-label-md text-label-md text-on-surface-variant">
                        {stage.label}
                      </p>

                      <p className="mt-2 text-2xl font-bold text-primary">
                        {dashboardLoading
                          ? "..."
                          : metrics?.count ?? 0}
                      </p>

                      <div className="mt-4 space-y-1 text-xs text-on-surface-variant">
                        <div className="flex justify-between">
                          <span>Value</span>

                          <span className="font-semibold text-on-surface">
                            {formatUsd(
                              metrics?.value ?? 0,
                              "USD"
                            )}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span>Avg. Time</span>

                          <span className="font-semibold text-on-surface">
                            {metrics?.average_time !== null &&
                            metrics?.average_time !== undefined
                              ? `${metrics.average_time} days`
                              : "—"}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span>Pending</span>

                          <span className="font-semibold text-on-surface">
                            {metrics?.pending ?? 0}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span>SLA Breaches</span>

                          <span className="font-semibold text-on-surface">
                            {metrics?.sla_breaches ?? 0}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          </div>
        </section>

        {/* ==================================================
            Workflow Status
        ================================================== */}

        <section className="mb-8">
          <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-md">

            <div className="mb-6">
              <h2 className="font-title-lg text-title-lg text-on-surface">
                Workflow Status
              </h2>

              <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                Current status distribution across procurement modules.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {statusSections.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl bg-surface-container-high/40 p-5"
                >
                  <h3 className="font-title-lg text-title-lg text-on-surface">
                    {item.title}
                  </h3>

                  <div className="mt-4 space-y-2">
                    {item.data &&
                    Object.keys(item.data).length > 0 ? (
                      Object.entries(item.data).map(
                        ([status, count]) => (
                          <div
                            key={status}
                            className="flex items-center justify-between rounded-lg bg-surface-container-lowest px-3 py-2"
                          >
                            <span className="font-label-md text-label-md text-on-surface-variant">
                              {status}
                            </span>

                            <span className="rounded-full bg-primary/10 px-2.5 py-1 font-label-md text-label-md font-semibold text-primary">
                              {count}
                            </span>
                          </div>
                        )
                      )
                    ) : (
                      <p className="font-label-md text-label-md text-on-surface-variant">
                        No records available.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==================================================
            Spend Summary
        ================================================== */}

        <section className="mb-8">
          <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-md">

            <div className="mb-6">
              <h2 className="font-title-lg text-title-lg text-on-surface">
                Spend Summary
              </h2>

              <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                Procurement and payment financial overview.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">

              <div className="rounded-xl bg-surface-container-high/50 p-5">
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

              <div className="rounded-xl bg-surface-container-high/50 p-5">
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

              <div className="rounded-xl bg-surface-container-high/50 p-5">
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

              <div className="rounded-xl bg-surface-container-high/50 p-5">
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

              <div className="rounded-xl bg-surface-container-high/50 p-5">
                <p className="text-sm text-on-surface-variant">
                  Exception Value
                </p>

                <p className="mt-2 text-xl font-bold text-primary">
                  {formatUsd(
                    dashboard?.spend.total_exception_value ?? 0,
                    "USD"
                  )}
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* ==================================================
            Recent Invoices
        ================================================== */}

        {recent.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between px-1">
              <div>
                <h2 className="font-title-lg text-title-lg text-on-surface">
                  Recent Invoices
                </h2>

                <p className="mt-1 font-label-md text-label-md text-on-surface-variant">
                  Latest invoice activity.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/dashboard/invoices"
                  )
                }
                className="font-label-md text-label-md text-primary hover:underline"
              >
                View All
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {recent.map((invoice) => {
                const destination =
                  invoice.processing_status ===
                    "Approval Pending" ||
                  invoice.processing_status ===
                    "Approved" ||
                  invoice.processing_status ===
                    "Rejected" ||
                  invoice.processing_status ===
                    "PO Completed" ||
                  invoice.processing_status ===
                    "PO Generated"
                    ? `/dashboard/invoices/${invoice.id}/approval`
                    : `/dashboard/invoices/${invoice.id}/validation`;

                return (
                  <button
                    key={invoice.id}
                    type="button"
                    onClick={() =>
                      router.push(destination)
                    }
                    className="flex w-full items-center justify-between gap-4 rounded-xl bg-surface-container-lowest p-4 text-left shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-body-md text-body-md font-semibold text-on-surface">
                        {invoice.vendor_name}
                      </span>

                      <span className="font-label-md text-label-md text-on-surface-variant">
                        {invoice.invoice_number} ·{" "}
                        {fmtDate(
                          invoice.invoice_date
                        )}
                      </span>
                    </div>

                    <div className="ml-4 flex shrink-0 items-center gap-4">
                      <span className="font-body-md text-body-md text-on-surface">
                        {formatUsd(
                          invoice.total_amount,
                          invoice.currency
                        )}
                      </span>

                      <span className="font-label-md text-label-md text-on-surface-variant">
                        {invoice.processing_status}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}