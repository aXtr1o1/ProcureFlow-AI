const API_URL = process.env.NEXT_PUBLIC_API_URL;

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

export async function getInvoices() {
  const token = localStorage.getItem("access_token");

  // Trailing slash avoids FastAPI's 307 redirect from /invoices -> /invoices/
  const response = await fetch(`${API_URL}/invoices/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const data = await response.json();

  console.log("Status:", response.status);
  console.log("Response:", data);

  if (!response.ok) {
    const detail = data.detail;
    const message = Array.isArray(detail)
      ? detail.map((item: { msg?: string }) => item.msg || String(item)).join(", ")
      : detail || "Failed to fetch invoices";
    throw new Error(message);
  }

  // Normalize so callers always get an array
  if (Array.isArray(data)) {
    return { success: true, count: data.length, data };
  }

  return {
    success: Boolean(data?.success ?? true),
    count: data?.count ?? (Array.isArray(data?.data) ? data.data.length : 0),
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