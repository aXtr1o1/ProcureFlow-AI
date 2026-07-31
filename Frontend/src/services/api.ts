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

  if (!response.ok) {
    throw new Error(data.detail);
  }

  return data;
}

export async function getCurrentUser() {
    const token = localStorage.getItem("access_token");

    const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

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

  if (!response.ok) {
    throw new Error(data.detail);
  }

  return data;
}

export async function getInvoices() {
  const token = localStorage.getItem("access_token");

  const response = await fetch(`${API_URL}/invoices`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch invoices");
  }

  return await response.json();
}

export async function getInvoice(id: number | string) {

    const token = localStorage.getItem("access_token");

    const response = await fetch(
        `${API_URL}/invoices/details/${id}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error("Failed to fetch invoice");
    }

    return await response.json();
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
    approved_by: string
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
        `${API_URL}/search?query=${encodeURIComponent(query)}`,
        {
            method: "GET",
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