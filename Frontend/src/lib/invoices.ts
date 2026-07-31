// "use client";

// export type InvoiceStatus =
//   | "processing"
//   | "pending_validation"
//   | "pending_approval"
//   | "approved"
//   | "rejected";

// export type LineItem = {
//   id: string;
//   name: string;
//   sku: string;
//   amount: number;
//   qty: number;
// };

// export type AuditEvent = {
//   id: string;
//   label: string;
//   detail: string;
//   at: string; // ISO timestamp
// };

// export type Comment = {
//   id: string;
//   author: string;
//   initials: string;
//   text: string;
//   at: string;
// };

// export type Invoice = {
//   id: string;
//   fileName: string;
//   vendor: string;
//   vendorId: string;
//   invoiceNumber: string;
//   date: string;
//   dueDate: string;
//   amount: number;
//   currency: string;
//   terms: string;
//   ocrConfidence: number;
//   status: InvoiceStatus;
//   priority: "Low" | "Medium" | "High";
//   lineItems: LineItem[];
//   auditTrail: AuditEvent[];
//   comments: Comment[];
//   createdAt: string;
// };

// const STORAGE_KEY = "aiInvoicePo.invoices";

// const VENDORS = [
//   { vendor: "TechCorp Solutions", vendorId: "V-900281" },
//   { vendor: "Global Logistics Partners", vendorId: "V-772104" },
//   { vendor: "Meridian Office Supply", vendorId: "V-341992" },
//   { vendor: "Northwind Cloud Services", vendorId: "V-108475" },
// ];

// function randomOf<T>(arr: T[]): T {
//   return arr[Math.floor(Math.random() * arr.length)];
// }

// function pad(n: number, len = 4) {
//   return n.toString().padStart(len, "0");
// }

// function nowIso() {
//   return new Date().toISOString();
// }

// function fmtDate(iso: string) {
//   return new Date(iso).toLocaleDateString("en-US", {
//     month: "short",
//     day: "numeric",
//     year: "numeric",
//   });
// }

// export { fmtDate };

// function readAll(): Invoice[] {
//   if (typeof window === "undefined") return [];
//   try {
//     const raw = window.localStorage.getItem(STORAGE_KEY);
//     return raw ? (JSON.parse(raw) as Invoice[]) : [];
//   } catch {
//     return [];
//   }
// }

// function writeAll(invoices: Invoice[]) {
//   window.localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
//   // Notify same-tab listeners (storage event only fires cross-tab).
//   window.dispatchEvent(new CustomEvent("invoices:updated"));
// }

// export function listInvoices(): Invoice[] {
//   return readAll().sort(
//     (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
//   );
// }

// export function getInvoice(id: string): Invoice | undefined {
//   return readAll().find((inv) => inv.id === id);
// }

// /**
//  * Creates a new invoice record from an uploaded file, simulating the data an
//  * OCR / extraction pipeline would return. Amounts and vendor are randomized
//  * so repeated demo uploads don't look identical.
//  */
// export function createInvoiceFromFile(fileName: string): Invoice {
//   const { vendor, vendorId } = randomOf(VENDORS);
//   const existing = readAll();
//   const invoiceNumber = `INV-${new Date().getFullYear()}-${pad(
//     existing.length + 1
//   )}`;

//   const items: LineItem[] = [
//     {
//       id: crypto.randomUUID(),
//       name: "Cloud Subscription",
//       sku: "SaaS-Monthly-2024",
//       amount: 950 + Math.round(Math.random() * 200),
//       qty: 1,
//     },
//     {
//       id: crypto.randomUUID(),
//       name: "Priority Support",
//       sku: "Support-Add-On",
//       amount: 300,
//       qty: 1,
//     },
//   ];

//   const amount = items.reduce((sum, i) => sum + i.amount * i.qty, 0);
//   const created = nowIso();

//   const invoice: Invoice = {
//     id: crypto.randomUUID(),
//     fileName,
//     vendor,
//     vendorId,
//     invoiceNumber,
//     date: created,
//     dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
//     amount,
//     currency: "USD",
//     terms: "Net 30",
//     ocrConfidence: 96 + Math.round(Math.random() * 3),
//     status: "pending_validation",
//     priority: amount > 1000 ? "High" : "Medium",
//     lineItems: items,
//     auditTrail: [
//       {
//         id: crypto.randomUUID(),
//         label: "Invoice Uploaded",
//         detail: `${fileName} received`,
//         at: created,
//       },
//       {
//         id: crypto.randomUUID(),
//         label: "AI Validation Passed",
//         detail: `${96 + Math.round(Math.random() * 3)}% confidence score`,
//         at: created,
//       },
//     ],
//     comments: [],
//     createdAt: created,
//   };

//   writeAll([...existing, invoice]);
//   return invoice;
// }

// export function updateInvoice(id: string, patch: Partial<Invoice>): Invoice | undefined {
//   const all = readAll();
//   const idx = all.findIndex((inv) => inv.id === id);
//   if (idx === -1) return undefined;
//   all[idx] = { ...all[idx], ...patch };
//   writeAll(all);
//   return all[idx];
// }

// export function sendToApproval(id: string): Invoice | undefined {
//   return updateInvoice(id, {
//     status: "pending_approval",
//     auditTrail: [
//       ...(getInvoice(id)?.auditTrail ?? []),
//       {
//         id: crypto.randomUUID(),
//         label: "Sent for Approval",
//         detail: "Internal review complete",
//         at: nowIso(),
//       },
//     ],
//   });
// }

// export function decideInvoice(
//   id: string,
//   decision: "approved" | "rejected"
// ): Invoice | undefined {
//   const inv = getInvoice(id);
//   return updateInvoice(id, {
//     status: decision,
//     auditTrail: [
//       ...(inv?.auditTrail ?? []),
//       {
//         id: crypto.randomUUID(),
//         label: decision === "approved" ? "Invoice Approved" : "Invoice Rejected",
//         detail: decision === "approved" ? "Purchase order generated" : "Returned to vendor",
//         at: nowIso(),
//       },
//     ],
//   });
// }

// export function addComment(id: string, text: string, author = "You"): Invoice | undefined {
//   const inv = getInvoice(id);
//   if (!inv) return undefined;
//   const initials = author
//     .split(" ")
//     .map((p) => p[0])
//     .slice(0, 2)
//     .join("")
//     .toUpperCase();
//   return updateInvoice(id, {
//     comments: [
//       ...inv.comments,
//       { id: crypto.randomUUID(), author, initials, text, at: nowIso() },
//     ],
//   });
// }

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
  const response = await fetch(`${API_URL}/invoices`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("access_token")}`,
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
