/* ==========================================================
   Executive Dashboard
========================================================== */

export interface ExecutiveDashboard {
  total_procurement_value: number;
  active_pos: number;
  invoices_processed: number;
  pending_invoices: number;
  matched_invoices: number;
  exception_rate: number;
  pending_approval_value: number;
  average_processing_time: number | null;
  potential_savings: number | null;
  overdue_payments: number;
}

/* ==========================================================
   Dashboard KPI
========================================================== */

export interface DashboardKPI {
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
}

/* ==========================================================
   Workflow Status
========================================================== */

export type DashboardStatusMap = Record<string, number>;

/* ==========================================================
   Procurement Funnel
========================================================== */

export interface DashboardFunnel {
  business_needs: number;
  purchase_requisitions: number;
  purchase_orders: number;
  goods_receipts: number;
  invoices: number;
  payments: number;
}

/* ==========================================================
   Spend
========================================================== */

export interface DashboardSpend {
  total_po_value: number;
  total_invoice_value: number;
  total_paid_amount: number;
  total_pending_payment: number;
  total_exception_value: number;
}

/* ==========================================================
   Complete Dashboard Overview
========================================================== */

export interface DashboardOverview {
  executive: ExecutiveDashboard;

  kpis: DashboardKPI;

  business_need_status: DashboardStatusMap;
  purchase_requisition_status: DashboardStatusMap;
  purchase_order_status: DashboardStatusMap;
  goods_receipt_status: DashboardStatusMap;
  invoice_status: DashboardStatusMap;
  payment_status: DashboardStatusMap;

  funnel: DashboardFunnel;

  spend: DashboardSpend;
}

/* ==========================================================
   Procurement Funnel - Detailed
========================================================== */

export interface ProcurementFunnelStage {
  name: string;
  count: number;
  value: number;
  average_time: number | null;
  pending: number;
  sla_breaches: number;
}

export interface ProcurementFunnelAnalytics {
  stages: ProcurementFunnelStage[];
}

/* ==========================================================
   PO Intelligence
========================================================== */

export interface POIntelligence {
  total_pos: number;
  po_value: number;
  open_pos: number;
  closed_pos: number;
  cancelled_pos: number;
  pending_approvals: number;
  pending_approval_value: number;

  average_po_creation_time: number | null;
  po_approval_time: number | null;
  po_to_invoice_conversion_ratio: number | null;
  average_po_aging: number | null;

  po_value_by_department: Record<string, number>;
  po_value_by_vendor: Record<string, number>;
}

/* ==========================================================
   Invoice Intelligence
========================================================== */

export interface InvoiceIntelligence {
  total_invoices_received: number;
  successfully_extracted: number;
  extraction_failed: number;
  extraction_confidence: number | null;

  duplicate_invoices: number;
  missing_fields: number;

  po_linked_invoices: number;
  non_po_invoices: number;

  average_processing_time: number | null;
  average_manual_review_time: number | null;
}

/* ==========================================================
   Vendor Intelligence
========================================================== */

export interface VendorPerformance {
  vendor_name: string;
  overall_score: number | null;
  on_time_delivery: number | null;
  invoice_accuracy: number | null;
  po_compliance: number | null;
  price_variance: number | null;
  exception_rate: number | null;
  payment_disputes: number;
}

export interface VendorAnalytics {
  total_spend: number;
  number_of_pos: number;
  number_of_invoices: number;
  average_invoice_value: number;

  on_time_delivery_percentage: number | null;
  invoice_accuracy_percentage: number | null;
  exception_percentage: number | null;
  price_variance: number | null;

  payment_terms: string | null;
  average_payment_time: number | null;
}

export interface VendorIntelligence {
  vendors: VendorPerformance[];
  analytics: VendorAnalytics;
}

/* ==========================================================
   Spend Analytics
========================================================== */

export interface SpendAnalytics {
  total_spend: number;
  total_po_spend: number;
  total_invoice_spend: number;
  total_paid_spend: number;
  total_pending_spend: number;

  by_department: Record<string, number>;
  by_business_unit: Record<string, number>;
  by_category: Record<string, number>;
  by_vendor: Record<string, number>;
  by_location: Record<string, number>;
  by_month: Record<string, number>;
  by_quarter: Record<string, number>;
  by_project: Record<string, number>;
  by_cost_center: Record<string, number>;
}

/* ==========================================================
   PO Trend Analytics
========================================================== */

export interface POTrendPoint {
  period: string;

  po_value: number;
  invoice_value: number;
  payment_value: number;

  po_count: number;
  invoice_count: number;

  exceptions: number;
  savings: number;
}

export interface POTrendAnalytics {
  trends: POTrendPoint[];
}