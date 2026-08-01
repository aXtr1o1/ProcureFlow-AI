"use client";

export interface Invoice {
  id: number;

  invoice_number: string;
  vendor_name: string;
  vendor_address: string;
  customer_name: string;

  invoice_date: string;
  due_date: string;

  purchase_order_number: string | null;

  currency: string;

  subtotal: number;
  tax: number;
  total_amount: number;

  processing_status: string;

  blob_name: string;
  blob_url: string;

  created_at: string;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function listInvoices(): Promise<Invoice[]> {

  const token = localStorage.getItem("access_token");

  console.log("TOKEN:", token);

  const response = await fetch(`${API_URL}/invoices`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });


  if (!response.ok) {
    throw new Error("Failed to fetch invoices");
  }

  const result = await response.json();

  console.log("Invoices Response:", result);

  // If backend returns { data: [...] }
  if (Array.isArray(result.data)) {
    return result.data;
  }

  // If backend returns [...]
  if (Array.isArray(result)) {
    return result;
  }

  return [];
}
export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
