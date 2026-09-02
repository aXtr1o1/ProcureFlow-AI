"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { analyzeInvoice } from "@/services/api";

export default function InvoiceUploadPage() {
  const router = useRouter();
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes} bytes`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }

    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =====================================================
  // File Selection
  // =====================================================
  const handleFileSelect = (file: File | null) => {
    setError("");
    setSuccess("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Check both MIME type and file extension
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setSelectedFile(null);

      setError(
        "Invalid file type. Please select an Invoice PDF.",
      );

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    setSelectedFile(file);
  };

  // =====================================================
  // File Input
  // =====================================================
  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0] ?? null;
    handleFileSelect(file);
  };

  // =====================================================
  // Drag & Drop
  // =====================================================
  const handleDragOver = (
    event: DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();

    if (!uploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (
    event: DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (
    event: DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    setIsDragging(false);

    if (uploading) {
      return;
    }

    const file = event.dataTransfer.files?.[0] ?? null;
    handleFileSelect(file);
  };

  // =====================================================
  // Remove Selected File
  // =====================================================
  const handleRemoveFile = () => {
    if (uploading) {
      return;
    }

    setSelectedFile(null);
    setError("");
    setSuccess("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // =====================================================
  // Upload Invoice
  // =====================================================
  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select an Invoice PDF first.");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const result = await analyzeInvoice(selectedFile);

      // =====================================================
      // Duplicate Invoice
      // =====================================================
      if (
        result?.duplicate === true ||
        result?.processing_status === "Duplicate"
      ) {
        setError(
          result.message ||
            "Duplicate invoice detected. The invoice was not uploaded.",
        );

        return;
      }

      // =====================================================
      // Successful Invoice Processing
      // =====================================================
      if (result?.success && result?.invoice_id) {
        setSuccess(
          result.message ||
            "Invoice uploaded and validated successfully.",
        );

        window.dispatchEvent(
          new Event("invoices:updated"),
        );

        setTimeout(() => {
          router.push(
            `/dashboard/invoices/${result.invoice_id}`,
          );
        }, 800);

        return;
      }

      // =====================================================
      // Unexpected API Response
      // =====================================================
      setError(
        result?.message ||
          "Invoice upload could not be completed. Please try again.",
      );
    } catch (err) {
      // =====================================================
      // Expected Validation Errors
      // =====================================================

      const errorMessage =
        err instanceof Error
          ? err.message
          : "Invoice upload failed. Please try again.";

      const normalizedMessage =
        errorMessage.toLowerCase();

      // Purchase Order uploaded
      if (
        normalizedMessage.includes("purchase order") ||
        normalizedMessage.includes("only invoice pdfs")
      ) {
        setError(
          "This document appears to be a Purchase Order. " +
            "Please upload an Invoice. Purchase Orders must be " +
            "created through the Purchase Order workflow.",
        );

        return;
      }

      // Generic invalid document
      if (
        normalizedMessage.includes("invalid document") ||
        normalizedMessage.includes("not a valid invoice")
      ) {
        setError(
          "This document is not recognized as a valid Invoice. " +
            "Please upload a valid Invoice PDF.",
        );

        return;
      }

      // Duplicate invoice returned as an exception
      if (
        normalizedMessage.includes("duplicate invoice")
      ) {
        setError(errorMessage);
        return;
      }

      // =====================================================
      // Unexpected Technical Error
      // =====================================================
      console.error(
        "Unexpected invoice upload error:",
        err,
      );

      setError(
        "Unable to process the invoice right now. " +
          "Please try again.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-80px)] bg-surface-container-low px-6 py-12">
      <div className="mx-auto w-full max-w-3xl">

        {/* ================================================= */}
        {/* Header */}
        {/* ================================================= */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() =>
              router.push("/dashboard/invoices")
            }
            className="mb-5 flex items-center gap-2 text-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
          >
            <span className="material-symbols-outlined text-[20px]">
              arrow_back
            </span>

            Back to Invoices
          </button>

          <h1 className="font-display-lg text-display-lg text-on-surface">
            Upload Invoice
          </h1>

          <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
            Upload a PDF invoice to extract, validate and
            process invoice information automatically.
          </p>
        </div>

        {/* ================================================= */}
        {/* Upload Card */}
        {/* ================================================= */}
        <div className="rounded-2xl bg-surface-container-lowest p-8 shadow-sm">

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-outline-variant hover:border-primary/50"
            }`}
          >
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              id="invoice-file"
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleInputChange}
              disabled={uploading}
              className="hidden"
            />

            {/* Upload Icon */}
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[34px]">
                cloud_upload
              </span>
            </div>

            <h2 className="font-title-lg text-title-lg text-on-surface">
              {isDragging
                ? "Drop your invoice here"
                : "Upload your invoice"}
            </h2>

            <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
              Drag and drop your PDF invoice here
            </p>

            <p className="my-4 text-sm text-on-surface-variant">
              or
            </p>

            <label
              htmlFor="invoice-file"
              className={`inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-title-md text-title-md text-on-primary shadow-sm transition-all hover:shadow-md ${
                uploading
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                folder_open
              </span>

              Choose PDF
            </label>

            <p className="mt-5 text-xs text-on-surface-variant">
              Supported format: PDF Invoice only
            </p>
          </div>

          {/* ================================================= */}
          {/* Selected File */}
          {/* ================================================= */}
          {selectedFile && (
            <div className="mt-6 rounded-xl border border-outline-variant bg-surface-container p-4">
              <div className="flex items-center justify-between gap-4">

                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                    <span className="material-symbols-outlined">
                      picture_as_pdf
                    </span>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-title-md text-title-md text-on-surface">
                      {selectedFile.name}
                    </p>

                    <p className="mt-1 text-xs text-on-surface-variant">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  disabled={uploading}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-highest hover:text-error disabled:cursor-not-allowed disabled:opacity-50"
                  title="Remove file"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    close
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ================================================= */}
          {/* Error */}
          {/* ================================================= */}
          {error && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-red-300 bg-red-50 p-5 text-red-900"
            >
              <div className="flex items-start gap-3">

                <span className="material-symbols-outlined mt-0.5 text-red-600">
                  error
                </span>

                <div>
                  <p className="font-semibold">
                    Upload Failed
                  </p>

                  <p className="mt-1 text-sm">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ================================================= */}
          {/* Success */}
          {/* ================================================= */}
          {success && (
            <div
              role="status"
              className="mt-6 rounded-xl border border-green-300 bg-green-50 p-5 text-green-900"
            >
              <div className="flex items-start gap-3">

                <span className="material-symbols-outlined mt-0.5 text-green-600">
                  check_circle
                </span>

                <div>
                  <p className="font-semibold">
                    Invoice Processed Successfully
                  </p>

                  <p className="mt-1 text-sm">
                    {success}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ================================================= */}
          {/* Upload Button */}
          {/* ================================================= */}
          <div className="mt-8 flex justify-end gap-3">

            <button
              type="button"
              onClick={() =>
                router.push("/dashboard/invoices")
              }
              disabled={uploading}
              className="rounded-lg border border-outline-variant px-6 py-3 font-title-md text-title-md text-on-surface hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="flex min-w-[170px] items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-title-md text-title-md text-on-primary shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                  Processing...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">
                    upload_file
                  </span>

                  Upload Invoice
                </>
              )}
            </button>
          </div>
        </div>

        {/* ================================================= */}
        {/* Processing Information */}
        {/* ================================================= */}
        <div className="mt-6 rounded-xl bg-surface-container-lowest p-6 shadow-sm">
          <h3 className="font-title-md text-title-md text-on-surface">
            What happens next?
          </h3>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">

            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[18px]">
                  document_scanner
                </span>
              </div>

              <div>
                <p className="text-sm font-semibold text-on-surface">
                  Extract
                </p>

                <p className="mt-1 text-xs text-on-surface-variant">
                  Invoice data is extracted using OCR.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[18px]">
                  verified
                </span>
              </div>

              <div>
                <p className="text-sm font-semibold text-on-surface">
                  Validate
                </p>

                <p className="mt-1 text-xs text-on-surface-variant">
                  Invoice information is validated.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[18px]">
                  account_tree
                </span>
              </div>

              <div>
                <p className="text-sm font-semibold text-on-surface">
                  Process
                </p>

                <p className="mt-1 text-xs text-on-surface-variant">
                  Continue through the procurement workflow.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}