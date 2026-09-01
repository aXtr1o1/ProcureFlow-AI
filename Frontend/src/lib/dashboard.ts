import type {
  DashboardOverview,
  ProcurementFunnelAnalytics,
  POIntelligence,
  InvoiceIntelligence,
  VendorIntelligence,
  SpendAnalytics,
  POTrendAnalytics,
} from "@/types/dashboard";

/* ==========================================================
   API Base URL
========================================================== */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL;

/* ==========================================================
   Authentication
========================================================== */

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

/* ==========================================================
   Generic Dashboard Request
========================================================== */

async function dashboardRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not configured."
    );
  }

  const token = getToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    (
      headers as Record<string, string>
    ).Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers,
      cache: "no-store",
    }
  );

  const contentType =
    response.headers.get("content-type");

  let data: unknown;

  if (
    contentType?.includes(
      "application/json"
    )
  ) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    let message =
      `Dashboard request failed with status ${response.status}`;

    if (
      typeof data === "object" &&
      data !== null &&
      "detail" in data
    ) {
      message = String(
        (
          data as {
            detail: unknown;
          }
        ).detail
      );
    } else if (
      typeof data === "string" &&
      data.trim()
    ) {
      message = data;
    }

    throw new Error(message);
  }

  return data as T;
}

/* ==========================================================
   Screen 1
   Executive Dashboard
========================================================== */

export async function getDashboardOverview() {
  return dashboardRequest<DashboardOverview>(
    "/dashboard/overview"
  );
}

/* ==========================================================
   Screen 2
   Procurement Funnel
========================================================== */

export async function getProcurementFunnel() {
  return dashboardRequest<ProcurementFunnelAnalytics>(
    "/dashboard/procurement-funnel"
  );
}

/* ==========================================================
   Screen 3
   PO Intelligence
========================================================== */

export async function getPOIntelligence() {
  return dashboardRequest<POIntelligence>(
    "/dashboard/po-intelligence"
  );
}

/* ==========================================================
   Screen 4
   Invoice Intelligence
========================================================== */

export async function getInvoiceIntelligence() {
  return dashboardRequest<InvoiceIntelligence>(
    "/dashboard/invoice-intelligence"
  );
}

/* ==========================================================
   Screen 5A
   Vendor Intelligence
========================================================== */

export async function getVendorIntelligence() {
  return dashboardRequest<VendorIntelligence>(
    "/dashboard/vendor-intelligence"
  );
}

/* ==========================================================
   Screen 5B
   Spend Analytics
========================================================== */

export async function getSpendAnalytics(
  params?: {
    department?: string;
    business_unit?: string;
    category?: string;
    vendor?: string;
    location?: string;
    project?: string;
    cost_center?: string;
    start_date?: string;
    end_date?: string;
  }
) {
  const searchParams =
    new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(
      ([key, value]) => {
        if (
          value !== undefined &&
          value !== null &&
          value !== ""
        ) {
          searchParams.set(
            key,
            value
          );
        }
      }
    );
  }

  const query =
    searchParams.toString();

  return dashboardRequest<SpendAnalytics>(
    `/dashboard/spend-analytics${
      query ? `?${query}` : ""
    }`
  );
}

/* ==========================================================
   Screen 6
   PO Trend Analytics
========================================================== */

export async function getPOTrends(
  params?: {
    start_date?: string;
    end_date?: string;
    period?: "monthly" | "quarterly";
  }
) {
  const searchParams =
    new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(
      ([key, value]) => {
        if (
          value !== undefined &&
          value !== null &&
          value !== ""
        ) {
          searchParams.set(
            key,
            String(value)
          );
        }
      }
    );
  }

  const query =
    searchParams.toString();

  return dashboardRequest<POTrendAnalytics>(
    `/dashboard/po-trends${
      query ? `?${query}` : ""
    }`
  );
}