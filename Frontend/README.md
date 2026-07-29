# AI Invoice to PO Automation — Next.js

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
