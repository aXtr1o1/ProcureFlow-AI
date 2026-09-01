const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface DashboardOverview {
  funnel: {
    business_needs: {
      count: number;
      value: number;
      average_time: number;
      pending: number;
      sla_breaches: number;
    };
    purchase_requisitions: {
      count: number;
      value: number;
      average_time: number;
      pending: number;
      sla_breaches: number;
    };
    purchase_orders: {
      count: number;
      value: number;
      average_time: number;
      pending: number;
      sla_breaches: number;
    };
    goods_receipts: {
      count: number;
      value: number;
      average_time: number;
      pending: number;
      sla_breaches: number;
    };
    invoices: {
      count: number;
      value: number;
      average_time: number;
      pending: number;
      sla_breaches: number;
    };
    payments: {
      count: number;
      value: number;
      average_time: number;
      pending: number;
      sla_breaches: number;
    };
  };

  spend: {
    total_po_value: number;
    total_invoice_value: number;
    total_paid_amount: number;
    total_pending_payment: number;
    total_exception_value: number;
  };

  vendor_intelligence?: {
    vendors?: Array<{
      vendor_name: string;
      overall_score?: number | null;
      on_time_delivery?: number | null;
      invoice_accuracy?: number | null;
      po_compliance?: number | null;
      price_variance?: number | null;
      exception_rate?: number | null;
      payment_dispute?: number | null;
      total_spend?: number;
      number_of_pos?: number;
      number_of_invoices?: number;
      average_invoice_value?: number;
      payment_terms?: string | null;
      average_payment_time?: number | null;
    }>;

    total_vendor_spend?: number;
    total_vendors?: number;
  };

  spend_analytics?: {
    total_spend?: number;
    by_department?: Record<string, number>;
    by_business_unit?: Record<string, number>;
    by_category?: Record<string, number>;
    by_vendor?: Record<string, number>;
    by_location?: Record<string, number>;
    by_month?: Record<string, number>;
    by_quarter?: Record<string, number>;
    by_project?: Record<string, number>;
    by_cost_center?: Record<string, number>;
  };

  po_trends?: {
    trends?: Array<{
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
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("access_token");

  if (!token) {
    throw new Error("Authentication required. Please login again.");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function login(username: string, password: string) {

  console.log("API URL:", API_URL);
  console.log("Sending:", {
    username,
    password,
  });

  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      password,
    }),
  });

  console.log("Response Status:", response.status);

  const data = await response.json();

  console.log("Response Data:", data);
  console.log("LOGIN RESPONSE:", data);

  if (!response.ok) {
    throw new Error(data.detail);
  }

  return data;
}

export async function getCurrentUser() {
    const token = localStorage.getItem("access_token");

    console.log("TOKEN USED:", token);
    console.log("API URL:", API_URL);

    const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    console.log("Token sent to /auth/me:", token);

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detail);
    }

    return data;
}

export async function register(
  username: string,
  email: string,
  password: string
) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      email,
      password,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail);
  }

  return data;
}

export async function analyzeInvoice(file: File) {
  const token = localStorage.getItem("access_token");

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/invoices/analyze`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();

  // Duplicate is returned as 409 with a structured body — surface it to the UI
  if (data?.duplicate === true || data?.processing_status === "Duplicate") {
    return data;
  }

  if (!response.ok) {
    const detail = data.detail;
    const message = Array.isArray(detail)
      ? detail.map((item: { msg?: string }) => item.msg || String(item)).join(", ")
      : detail || "Invoice analysis failed.";
    throw new Error(message);
  }

  return data;
}

// ==========================================================
// Dashboard Overview
// ==========================================================

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const response = await fetch(
    `${API_URL}/dashboard/overview`,
    {
      method: "GET",
      headers: getAuthHeaders(),
      cache: "no-store",
    }
  );

  const data = await response.json();

  console.log("Dashboard Overview Status:", response.status);
  console.log("Dashboard Overview Response:", data);

  if (response.status === 401) {
    localStorage.removeItem("access_token");
    throw new Error("Session expired. Please login again.");
  }

  if (!response.ok) {
    const detail = data?.detail;

    const message = Array.isArray(detail)
      ? detail
          .map(
            (item: { msg?: string }) =>
              item.msg || String(item)
          )
          .join(", ")
      : detail || "Failed to load dashboard overview.";

    throw new Error(message);
  }

  return data;
}

export async function getInvoices() {
  const response = await fetch(`${API_URL}/invoices/`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  const data = await response.json();

  console.log("getInvoices Status:", response.status);
  console.log("getInvoices Response:", data);

  if (response.status === 401) {
    localStorage.removeItem("access_token");
    throw new Error("Session expired. Please login again.");
  }

  if (!response.ok) {
    const detail = data.detail;

    const message = Array.isArray(detail)
      ? detail
          .map((item: { msg?: string }) => item.msg || String(item))
          .join(", ")
      : detail || "Failed to fetch invoices";

    throw new Error(message);
  }

  if (Array.isArray(data)) {
    return {
      success: true,
      count: data.length,
      data,
    };
  }

  return {
    success: Boolean(data?.success ?? true),
    count:
      data?.count ??
      (Array.isArray(data?.data) ? data.data.length : 0),
    data: Array.isArray(data?.data) ? data.data : [],
  };
}

export async function getInvoice(id: number | string) {

    if (!id) {
        throw new Error("Invoice ID is missing");
    }

    const token = localStorage.getItem("access_token");

    try {

        const response = await fetch(
            `${API_URL}/invoices/details/${id}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        const data = await response.json();

        console.log("Invoice Response:", response.status);
        console.log(data);

        if (!response.ok) {
            throw new Error(data.detail || "Failed to fetch invoice");
        }

        return data;

    } catch (err) {

        console.error("getInvoice Error:", err);

        throw err;
    }
}

export async function getApprovalDetails(id: number | string) {
    const token = localStorage.getItem("access_token");

    const response = await fetch(
        `${API_URL}/approval/${id}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error("Failed to fetch approval details");
    }

    return await response.json();
}

export async function approveInvoice(
    id: number | string,
    approved_by: string,
    invoiceEdits?: {
        invoice_number?: string;
        vendor_name?: string;
        vendor_address?: string;
        customer_name?: string;
        invoice_date?: string;
        due_date?: string;
        purchase_order_number?: string;
        currency?: string;
        subtotal?: number;
        tax?: number;
        total_amount?: number;
        line_items?: Array<{
            id: number;
            description?: string;
            quantity?: number;
            unit_price?: number;
            amount?: number;
        }>;
    }
) {
    const token = localStorage.getItem("access_token");

    const response = await fetch(
        `${API_URL}/approval/${id}/approve`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                approved_by,
                invoice_edits: invoiceEdits ?? null,
            }),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detail);
    }

    return data;
}

export async function rejectInvoice(
    id: number | string,
    rejected_by: string,
    reason: string
) {
    const token = localStorage.getItem("access_token");

    const response = await fetch(
        `${API_URL}/approval/${id}/reject`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                rejected_by,
                reason,
            }),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detail);
    }

    return data;
}

export async function getApprovalHistory(id: number | string) {
    const token = localStorage.getItem("access_token");

    const response = await fetch(
        `${API_URL}/approval/history/${id}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error("Failed to fetch approval history");
    }

    return await response.json();
}

export async function searchInvoice(query: string) {

    const token = localStorage.getItem("access_token");

    const response = await fetch(
        `${API_URL}/search/?query=${encodeURIComponent(query)}`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detail || "Search failed");
    }

    return data;
}

export async function searchInvoiceByNumber(invoiceNumber: string) {

    const token = localStorage.getItem("access_token");

    const response = await fetch(
        `${API_URL}/search/invoice/${encodeURIComponent(invoiceNumber)}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detail);
    }

    return data;
}

export async function updateInvoiceStatus(
    id: number | string
) {
    const token = localStorage.getItem("access_token");

    const response = await fetch(
        `${API_URL}/invoices/${id}/status`,
        {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detail);
    }

    return data;
}

export async function generateSummary(invoiceId: number) {
  const token = localStorage.getItem("access_token");

  const response = await fetch(
    `${API_URL}/summary/generate/${invoiceId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail);
  }

  return data;
}

// ==========================================================
// Invoice 2-Way Matching
// ==========================================================

export interface MatchingMismatch {
  field_name: string;
  po_value: string | null;
  invoice_value: string | null;
}

export interface MatchingResult {
  success: boolean;
  invoice_id: number;
  po_number: string;
  is_match: boolean;
  match_score: number;
  mismatches: MatchingMismatch[];
  status: string;
  message: string;
  match_run_id: number;
  exception_id?: number | null;
}

export async function matchInvoice(
  invoiceId: number | string
): Promise<MatchingResult> {
  const token = localStorage.getItem("access_token");

  if (!token) {
    throw new Error(
      "Authentication token is missing. Please login again."
    );
  }

  const response = await fetch(
    `${API_URL}/matching/${invoiceId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  const data = await response.json();

  console.log("Matching Response:", response.status);
  console.log("Matching Data:", data);

  if (!response.ok) {
    const detail = data?.detail;

    const message = Array.isArray(detail)
      ? detail
          .map(
            (item: { msg?: string }) =>
              item.msg || String(item)
          )
          .join(", ")
      : detail || "Invoice matching failed.";

    throw new Error(message);
  }

  return data;
}

// ==========================================================
// Link Invoice to Purchase Order
// ==========================================================

export async function linkInvoiceToPurchaseOrder(
  invoiceId: number | string,
  purchaseOrderId: number | string
) {
  if (!invoiceId) {
    throw new Error("Invoice ID is missing.");
  }

  if (!purchaseOrderId) {
    throw new Error("Purchase Order ID is required.");
  }

  const response = await fetch(
    `${API_URL}/invoices/${invoiceId}/purchase-order`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        purchase_order_id: Number(purchaseOrderId),
      }),
      cache: "no-store",
    }
  );

  const data = await response.json();

  console.log("Link PO Response:", response.status);
  console.log("Link PO Data:", data);

  if (response.status === 401) {
    localStorage.removeItem("access_token");
    throw new Error("Session expired. Please login again.");
  }

  if (!response.ok) {
    const detail = data?.detail;

    const message = Array.isArray(detail)
      ? detail
          .map((item: { msg?: string }) => item.msg || String(item))
          .join(", ")
      : detail || "Failed to link Purchase Order.";

    throw new Error(message);
  }

  return data;
}

// ==========================================================
// Approve Matching Exception
// ==========================================================

export async function approveMatchOverride(
  invoiceId: number | string,
  remarks?: string
) {
  const token = localStorage.getItem("access_token");

  const response = await fetch(
    `${API_URL}/matching/${invoiceId}/approve`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        remarks: remarks ?? null,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const detail = data?.detail;

    const message = Array.isArray(detail)
      ? detail
          .map((item: { msg?: string }) => item.msg || String(item))
          .join(", ")
      : detail || "Failed to approve matching exception.";

    throw new Error(message);
  }

  return data;
}


// ==========================================================
// Reject Invoice During Matching Review
// ==========================================================

export async function rejectInvoiceMatch(
  invoiceId: number | string,
  remarks?: string
) {
  const token = localStorage.getItem("access_token");

  const response = await fetch(
    `${API_URL}/matching/${invoiceId}/reject`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        remarks: remarks ?? null,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const detail = data?.detail;

    const message = Array.isArray(detail)
      ? detail
          .map((item: { msg?: string }) => item.msg || String(item))
          .join(", ")
      : detail || "Failed to reject invoice.";

    throw new Error(message);
  }

  return data;
}

// ==========================================================
// Payment APIs
// ==========================================================

export interface Payment {
  id: number;
  invoice_id: number;
  payment_reference: string;
  payment_method: string | null;
  amount: number;
  currency: string;
  status: string;
  payment_date: string | null;
  due_date: string | null;
  remarks: string | null;
  created_by_id: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentSummary {
  invoice_id: number;
  invoice_total: number;
  total_paid: number;
  total_pending: number;
  total_failed: number;
  total_cancelled: number;
  remaining_amount: number;
  payment_status: string;
  currency: string;
}

// ==========================================================
// Create Payment
// ==========================================================

export async function createPayment(payment: {
  invoice_id: number;
  payment_reference: string;
  payment_method?: string;
  amount: number;
  currency?: string;
  payment_date?: string;
  due_date?: string;
  remarks?: string;
}): Promise<Payment> {
  const response = await fetch(`${API_URL}/payments/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payment),
  });

  const data = await response.json();

  if (response.status === 401) {
    localStorage.removeItem("access_token");
    throw new Error("Session expired. Please login again.");
  }

  if (!response.ok) {
    throw new Error(
      data?.detail || "Failed to create payment."
    );
  }

  return data;
}

// ==========================================================
// Get Payments for Invoice
// ==========================================================

export async function getInvoicePayments(
  invoiceId: number | string
): Promise<Payment[]> {
  const response = await fetch(
    `${API_URL}/payments/invoice/${invoiceId}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (response.status === 401) {
    localStorage.removeItem("access_token");
    throw new Error("Session expired. Please login again.");
  }

  if (!response.ok) {
    throw new Error(
      data?.detail || "Failed to fetch invoice payments."
    );
  }

  return data;
}

// ==========================================================
// Get Payment Summary
// ==========================================================

export async function getInvoicePaymentSummary(
  invoiceId: number | string
): Promise<PaymentSummary> {
  const response = await fetch(
    `${API_URL}/payments/invoice/${invoiceId}/summary`,
    {
      method: "GET",
      headers: getAuthHeaders(),
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (response.status === 401) {
    localStorage.removeItem("access_token");
    throw new Error("Session expired. Please login again.");
  }

  if (!response.ok) {
    throw new Error(
      data?.detail || "Failed to fetch payment summary."
    );
  }

  return data;
}

// ==========================================================
// Mark Payment as Paid
// ==========================================================

export async function markPaymentPaid(
  paymentId: number | string,
  remarks?: string,
  paymentDate?: string
): Promise<Payment> {
  const response = await fetch(
    `${API_URL}/payments/${paymentId}/paid`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        status: "Paid",
        remarks: remarks ?? null,
        payment_date: paymentDate ?? null,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.detail || "Failed to mark payment as paid."
    );
  }

  return data;
}

// ==========================================================
// Mark Payment as Failed
// ==========================================================

export async function markPaymentFailed(
  paymentId: number | string,
  remarks?: string
): Promise<Payment> {
  const response = await fetch(
    `${API_URL}/payments/${paymentId}/failed`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        status: "Failed",
        remarks: remarks ?? null,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.detail || "Failed to mark payment as failed."
    );
  }

  return data;
}

// ==========================================================
// Cancel Payment
// ==========================================================

export async function cancelPayment(
  paymentId: number | string,
  remarks?: string
): Promise<Payment> {
  const response = await fetch(
    `${API_URL}/payments/${paymentId}/cancel`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        status: "Cancelled",
        remarks: remarks ?? null,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.detail || "Failed to cancel payment."
    );
  }

  return data;
}
