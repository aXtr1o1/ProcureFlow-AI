# ProcureFlow-AI

# AI Invoice to PO Automation — Frontend

A working Next.js (App Router + TypeScript + Tailwind CSS) app that combines:

1. The existing app you already had — sign in/up, invoice upload +
   processing, invoice list, validation, and approval flows.
2. The new **Smart Invoice/PO Automator** Stitch mockups you just uploaded —
   AI Assistant chat, Intelligence Search, a rich read-only Invoice Details
   view, and an Executive Summary/insights page.

Everything shares the same design system (colors, type scale, spacing) that
was already defined in `tailwind.config.ts`, so the new screens match the
existing UI exactly — no new theme was introduced.

## Pages

| Route | Description |
|---|---|
| `/login` | Sign in / sign up (mock client-side auth, `localStorage`) |
| `/dashboard` | Upload invoice + animated processing timeline |
| `/dashboard/invoices` | Invoice list |
| `/dashboard/invoices/[id]` | **New** — read-only Invoice Details: validation summary, metadata, line items, approval-history timeline (from the `invoice_details` mockup) |
| `/dashboard/invoices/[id]/validation` | Validation / OCR review flow |
| `/dashboard/invoices/[id]/approval` | Approval / rejection flow |
| `/dashboard/search` | **New** — Intelligence Search: natural-language style search box, quick filter chips, recent searches, live-filtered results (from the `ai_invoice_search` mockup) |
| `/dashboard/assistant` | **New** — AI Assistant chat. Answers are generated live from your actual invoice data (pending counts, vendor lookups, upcoming due dates, totals) — no canned screenshots (from the `ai_assistant` mockup) |
| `/dashboard/summary` | **New** — Executive Summary: date-range stats, approval-flow progress, top vendors, an AI-style insight paragraph, and a selectable invoice list, all computed from real data (from the `invoice_summary` mockup) |

All `/dashboard/*` routes are protected by the same auth guard as before
(`src/app/dashboard/layout.tsx`) and share the same `Header`/`Footer`. The
top navigation was extended with **Search**, **Assistant**, and **Summary**
links.

## What's functional (not just decorative)

- Invoice Details → **PDF** button triggers the browser's print dialog;
  **Export JSON** downloads the invoice as a real `.json` file.
- Search → live filters against real invoice data in `localStorage`; results
  link straight into Invoice Details; download button exports JSON per
  invoice.
- Assistant → responses are generated from your actual invoice list (ask
  about a vendor name, "pending", "deadlines", or "summarize").
- Summary → date range filters real invoices; **Copy Summary** copies the
  generated insight text to your clipboard; **Download PDF** opens print.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up with any
username/email/password (or "Sign in with Google" to simulate that), upload
an invoice or two from `/dashboard`, then explore Invoices, Search,
Assistant, and Summary.

> **Note on this build environment:** the sandbox this was assembled in has
> no internet access, so it could not download the native Next.js compiler
> binary (`@next/swc-*`) to run `next build`/`next dev` itself. Every file was
> instead verified with a full TypeScript project type-check
> (`tsc --noEmit`), which catches JSX/type errors the same way the compiler
> would. Once you run `npm install` on a machine with internet access, `npm
> run dev` / `npm run build` will fetch that binary automatically and it will
> run normally.

## Project structure

```
src/
  app/
    layout.tsx
    page.tsx
    globals.css
    login/page.tsx
    dashboard/
      layout.tsx
      page.tsx                          # Upload + processing
      invoices/
        page.tsx                        # List
        [id]/
          page.tsx                      # NEW — Invoice Details
          validation/page.tsx
          approval/page.tsx
      search/page.tsx                   # NEW — Intelligence Search
      assistant/page.tsx                # NEW — AI Assistant chat
      summary/page.tsx                  # NEW — Executive Summary
  components/
    Header.tsx                          # Nav updated: Search/Assistant/Summary
    Footer.tsx
    GoogleIcon.tsx
  context/
    AuthContext.tsx
  lib/
    invoices.ts                         # Shared mock data layer (localStorage)
tailwind.config.ts
```

## Next steps you may want

- Hook up a real backend for auth, invoice OCR/extraction, and PO generation.
- Wire the Assistant page to a real LLM endpoint instead of the rule-based
  responder in `answerQuestion()`.
- Replace the client-side `localStorage` data layer in `src/lib/invoices.ts`
  with real API calls once a backend exists — every page already reads from
  this single module, so that's the only file that needs to change.

# AI Powered Invoice to Purchase Order Automation (Backend)

## Overview

AI Powered Invoice to Purchase Order Automation is a Proof of Concept (POC) that automates invoice processing using Azure AI services.

The backend accepts invoice documents, extracts structured information using Azure Document Intelligence, validates invoice data, stores invoices and metadata, supports approval workflows, generates Purchase Orders, enables AI-powered invoice search, and generates invoice summaries using Azure OpenAI.

---

# Objectives

The objective of this POC is to demonstrate an end-to-end invoice processing pipeline capable of:

- Uploading invoices
- Extracting structured invoice information
- Validating invoice data
- Human approval workflow
- Purchase Order generation
- AI-powered invoice search
- Invoice summarization
- Invoice processing dashboard (optional)

---

# Backend Features

The backend currently provides the following services:

- Invoice Upload API
- Azure Blob Storage Integration
- Azure Document Intelligence Integration
- Invoice Data Extraction
- Invoice Validation Engine
- Purchase Order Validation
- Approval Workflow
- Invoice Status Tracking
- OCR Text Storage
- Invoice Metadata Storage
- SQLite Database Integration
- REST APIs using FastAPI

---

# Technology Stack

## Backend

- Python
- FastAPI
- SQLAlchemy
- Pydantic

## Database

- SQLite (POC)

## Azure Services

- Azure Blob Storage
- Azure Document Intelligence
- Azure OpenAI
- Azure AI Search

---
# Backend Modules

The backend consists of the following modules:

- Invoice Service
- Processing Engine
- Validation Engine
- Approval Engine
- AI Search Engine
- Azure Connector
- Scheduler
- Summary Service
- Dashboard Service(Optional)
- Authentication Service

---

# Invoice Processing Workflow

```
Upload Invoice
      │
      ▼
Store Invoice in Azure Blob Storage
      │
      ▼
Azure Document Intelligence
      │
      ▼
Extract Invoice Fields
      │
      ▼
Validate Invoice
      │
      ▼
Duplicate Invoice Check
      │
      ▼
Approval Workflow
      │
      ▼
Generate Purchase Order
      │
      ▼
Store PO Record
      │
      ▼
AI Search & Invoice Summary
```

---

# Supported File Format

## Currently Supported

Only invoice documents in **PDF (.pdf)** format are supported.

| File Type | Extension | Status |
|-----------|-----------|--------|
| Invoice PDF | `.pdf` | ✅ Supported |

---

## Unsupported Formats

The following file formats are **not supported** in this POC.

| File Type | Extension |
|------------|-----------|
| Word Documents | .doc, .docx |
| Excel Files | .xls, .xlsx |
| CSV Files | .csv |
| Text Files | .txt |
| Images | .jpg, .jpeg, .png, .bmp, .tiff |

---

# Invoice Validation

The backend performs two levels of validation.

## File Validation

- Only PDF files are accepted.
- MIME Type must be `application/pdf`.

---

## Invoice Validation

After OCR extraction, the backend verifies the uploaded document is a valid invoice.

Mandatory fields include:

- Invoice Number
- Vendor Name
- Invoice Date
- Total Amount


---

# Validation Engine

The Validation Engine performs:

- Mandatory Field Validation
- Purchase Order Mapping
- Duplicate Invoice Detection
- Currency Validation
- Invoice Validation

Validation states include:

- Uploaded
- Processing
- Validated
- Approval Pending
- Approved
- Rejected
- PO Generated
- Failed 

---

# Database Tables

SQLite database contains:

- Invoices
- Invoice Line Items
- Purchase Order Records
- Approval History
- Users 

---

# Exception Queue

Invoices requiring manual review include:

- OCR Confidence Too Low
- Validation Failure
- Missing Mandatory Fields
- Approval Rejected 

---

# Current POC Scope

This Proof of Concept currently supports:

- Invoice Upload
- Azure Blob Storage
- Azure Document Intelligence
- Invoice Validation
- Approval Workflow
- Purchase Order Processing
- AI Search
- Invoice Summary
- SQLite Storage
- REST APIs 

---

# Success Criteria

The POC is considered successful when it can:

- Upload invoices from the web interface.
- Store invoices in Azure Blob Storage.
- Extract structured invoice fields using Azure Document Intelligence.
- Validate invoice data.
- Detect duplicate invoices.
- Support human approval.
- Generate Purchase Orders.
- Store invoice and PO records.
- Search invoices using Azure AI Search.
- Generate AI-powered invoice summaries.
- Track invoice processing status and exception handling.

---

# License

This project is developed as an internal Proof of Concept (POC) for demonstrating AI-powered invoice processing using Microsoft Azure AI Services.