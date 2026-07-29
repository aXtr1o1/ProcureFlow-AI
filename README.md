# ProcureFlow-AI
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
- Track invoice processing status and exception handling. :contentReference[oaicite:9]{index=9}

---

# License

This project is developed as an internal Proof of Concept (POC) for demonstrating AI-powered invoice processing using Microsoft Azure AI Services.