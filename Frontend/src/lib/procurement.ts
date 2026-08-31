const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL;

function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken")
  );
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers,
    }
  );

  const contentType = response.headers.get("content-type");

  let data: unknown = null;

  if (contentType?.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "detail" in data
        ? String((data as { detail: unknown }).detail)
        : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data as T;
}

/* ==========================================================
   Types
========================================================== */

export interface BusinessNeedType {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  sort_order: number;
}

export interface BusinessNeed {
  id: number;
  need_number: string;
  business_need_type: BusinessNeedType;
  title: string;
  description?: string | null;
  department?: string | null;
  business_unit?: string | null;
  project?: string | null;
  location?: string | null;
  cost_center?: string | null;
  required_by_date?: string | null;
  estimated_value: number;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessNeedPayload {
  business_need_type_id: number;
  title: string;
  description?: string;
  department?: string;
  business_unit?: string;
  project?: string;
  location?: string;
  cost_center?: string;
  required_by_date?: string;
  estimated_value: number;
  currency: string;
}

export interface PurchaseRequisitionLine {
  id: number;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface PurchaseRequisitionApproval {
  id: number;
  reviewer_id: number;
  decision: string;
  remarks?: string | null;
  decided_at: string;
}

export interface PurchaseRequisition {
  id: number;
  pr_number: string;
  business_need_id: number;
  requester_id: number;
  title: string;
  justification?: string | null;
  department?: string | null;
  business_unit?: string | null;
  project?: string | null;
  location?: string | null;
  cost_center?: string | null;
  currency: string;
  total_amount: number;
  selected_vendor_name?: string | null;
  negotiated_amount?: number | null;
  price_variance?: number | null;
  price_variance_percentage?: number | null;
  negotiation_remarks?: string | null;
  negotiated_at?: string | null;
  negotiated_by_id?: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  line_items: PurchaseRequisitionLine[];
  approvals: PurchaseRequisitionApproval[];
}

export interface PurchaseRequisitionLinePayload {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface PurchaseRequisitionPayload {
  business_need_id: number;
  title: string;
  justification?: string;
  line_items: PurchaseRequisitionLinePayload[];
}

export interface PurchaseOrderLine {
  id: number;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  purchase_requisition_id: number;
  vendor_name: string;
  currency: string;
  subtotal: number;
  tax: number;
  total_amount: number;
  status: string;
  created_by_id: number;
  created_at: string;
  updated_at: string;
  line_items: PurchaseOrderLine[];
}

export interface GoodsReceiptLine {
  id: number;
  goods_receipt_id: number;
  purchase_order_line_id?: number | null;
  description: string;
  ordered_quantity: number;
  received_quantity: number;
  accepted_quantity: number;
  rejected_quantity: number;
  remarks?: string | null;
}

export interface GoodsReceipt {
  id: number;
  receipt_number: string;
  purchase_order_id: number;
  receipt_type: string;
  status: string;
  received_by_id: number;
  received_date: string;
  remarks?: string | null;
  created_at: string;
  updated_at: string;
  line_items: GoodsReceiptLine[];
}

/* ==========================================================
   Business Need API
========================================================== */

export function getBusinessNeedTypes() {
  return request<BusinessNeedType[]>(
    "/business-needs/types"
  );
}

export function getBusinessNeeds() {
  return request<BusinessNeed[]>(
    "/business-needs/"
  );
}

export function getBusinessNeed(id: number) {
  return request<BusinessNeed>(
    `/business-needs/${id}`
  );
}

export function createBusinessNeed(
  payload: BusinessNeedPayload
) {
  return request<BusinessNeed>(
    "/business-needs/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export function updateBusinessNeed(
  id: number,
  payload: BusinessNeedPayload
) {
  return request<BusinessNeed>(
    `/business-needs/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
}

export function submitBusinessNeed(id: number) {
  return request<BusinessNeed>(
    `/business-needs/${id}/submit`,
    {
      method: "POST",
    }
  );
}

/* ==========================================================
   Purchase Requisition API
========================================================== */

export function getPurchaseRequisitions() {
  return request<PurchaseRequisition[]>(
    "/purchase-requisitions/"
  );
}

export function getPurchaseRequisition(id: number) {
  return request<PurchaseRequisition>(
    `/purchase-requisitions/${id}`
  );
}

export function createPurchaseRequisition(
  payload: PurchaseRequisitionPayload
) {
  return request<PurchaseRequisition>(
    "/purchase-requisitions/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export function submitPurchaseRequisition(id: number) {
  return request<PurchaseRequisition>(
    `/purchase-requisitions/${id}/submit`,
    {
      method: "POST",
    }
  );
}

export function approvePurchaseRequisition(
  id: number,
  remarks: string
) {
  return request<PurchaseRequisition>(
    `/purchase-requisitions/${id}/approve`,
    {
      method: "POST",
      body: JSON.stringify({ remarks }),
    }
  );
}

export function rejectPurchaseRequisition(
  id: number,
  remarks: string
) {
  return request<PurchaseRequisition>(
    `/purchase-requisitions/${id}/reject`,
    {
      method: "POST",
      body: JSON.stringify({ remarks }),
    }
  );
}

export function selectVendor(
  id: number,
  vendorName: string
) {
  return request<PurchaseRequisition>(
    `/purchase-requisitions/${id}/select-vendor`,
    {
      method: "POST",
      body: JSON.stringify({
        vendor_name: vendorName,
      }),
    }
  );
}

export function recordNegotiation(
  id: number,
  negotiatedAmount: number,
  remarks: string
) {
  return request<PurchaseRequisition>(
    `/purchase-requisitions/${id}/negotiation`,
    {
      method: "POST",
      body: JSON.stringify({
        negotiated_amount: negotiatedAmount,
        remarks,
      }),
    }
  );
}

/* ==========================================================
   Purchase Order API
========================================================== */

export type PurchaseOrderStatus =
  | "Created"
  | "Approval Pending"
  | "Approved"
  | "Rejected"
  | "Sent"
  | "Vendor Accepted"
  | "Vendor Rejected"
  | "Closed"
  | "Cancelled";

export interface PurchaseOrderDecisionPayload {
  remarks?: string | null;
}

export interface PurchaseOrderVendorResponsePayload {
  remarks?: string | null;
}

/* ----------------------------------------------------------
   Get all Purchase Orders
---------------------------------------------------------- */

export function getPurchaseOrders() {
  return request<PurchaseOrder[]>(
    "/purchase-orders/"
  );
}

/* ----------------------------------------------------------
   Get Purchase Order by PO Number
---------------------------------------------------------- */

export function getPurchaseOrder(
  poNumber: string
) {
  return request<PurchaseOrder>(
    `/purchase-orders/${encodeURIComponent(poNumber)}`
  );
}

/* ----------------------------------------------------------
   Create Purchase Order from Approved PR
---------------------------------------------------------- */

export function createPurchaseOrderFromPR(
  prId: number
) {
  return request<PurchaseOrder>(
    `/purchase-orders/from-pr/${prId}`,
    {
      method: "POST",
    }
  );
}

/* ----------------------------------------------------------
   Submit Purchase Order for Approval
---------------------------------------------------------- */

export function submitPurchaseOrder(
  poId: number
) {
  return request<PurchaseOrder>(
    `/purchase-orders/${poId}/submit`,
    {
      method: "POST",
    }
  );
}

/* ----------------------------------------------------------
   Approve Purchase Order
---------------------------------------------------------- */

export function approvePurchaseOrder(
  poId: number,
  remarks?: string
) {
  return request<PurchaseOrder>(
    `/purchase-orders/${poId}/approve`,
    {
      method: "POST",
      body: JSON.stringify({
        remarks: remarks || null,
      }),
    }
  );
}

/* ----------------------------------------------------------
   Reject Purchase Order
---------------------------------------------------------- */

export function rejectPurchaseOrder(
  poId: number,
  remarks?: string
) {
  return request<PurchaseOrder>(
    `/purchase-orders/${poId}/reject`,
    {
      method: "POST",
      body: JSON.stringify({
        remarks: remarks || null,
      }),
    }
  );
}

/* ----------------------------------------------------------
   Send Purchase Order to Vendor
---------------------------------------------------------- */

export function sendPurchaseOrderToVendor(
  poId: number
) {
  return request<PurchaseOrder>(
    `/purchase-orders/${poId}/send-to-vendor`,
    {
      method: "POST",
    }
  );
}

/* ----------------------------------------------------------
   Vendor Accept
---------------------------------------------------------- */

export function vendorAcceptPurchaseOrder(
  poId: number,
  remarks?: string
) {
  return request<PurchaseOrder>(
    `/purchase-orders/${poId}/vendor-accept`,
    {
      method: "POST",
      body: JSON.stringify({
        remarks: remarks || null,
      }),
    }
  );
}

/* ----------------------------------------------------------
   Vendor Reject
---------------------------------------------------------- */

export function vendorRejectPurchaseOrder(
  poId: number,
  remarks?: string
) {
  return request<PurchaseOrder>(
    `/purchase-orders/${poId}/vendor-reject`,
    {
      method: "POST",
      body: JSON.stringify({
        remarks: remarks || null,
      }),
    }
  );
}

/* ----------------------------------------------------------
   Update Purchase Order Status
---------------------------------------------------------- */

export function updatePurchaseOrderStatus(
  poId: number,
  status: PurchaseOrderStatus
) {
  return request<PurchaseOrder>(
    `/purchase-orders/${poId}/status`,
    {
      method: "PUT",
      body: JSON.stringify({
        status,
      }),
    }
  );
}

/* ----------------------------------------------------------
   Close Purchase Order
---------------------------------------------------------- */

export function closePurchaseOrder(
  poId: number
) {
  return updatePurchaseOrderStatus(
    poId,
    "Closed"
  );
}

/* ----------------------------------------------------------
   Cancel Purchase Order
---------------------------------------------------------- */

export function cancelPurchaseOrder(
  poId: number
) {
  return updatePurchaseOrderStatus(
    poId,
    "Cancelled"
  );
}

/* ==========================================================
   Goods Receipt API
========================================================== */

export function getGoodsReceipts() {
  return request<GoodsReceipt[]>(
    "/goods-receipts/"
  );
}

export function getGoodsReceipt(id: number) {
  return request<GoodsReceipt>(
    `/goods-receipts/${id}`
  );
}

export function createGoodsReceipt(payload: unknown) {
  return request<GoodsReceipt>(
    "/goods-receipts/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}
