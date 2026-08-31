"use client";

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({
  status,
}: StatusBadgeProps) {
  const normalized = status.toLowerCase();

  let className =
    "bg-gray-100 text-gray-700";

  if (
    normalized.includes("approved") ||
    normalized.includes("accepted") ||
    normalized.includes("paid") ||
    normalized.includes("matched")
  ) {
    className =
      "bg-green-100 text-green-700";
  } else if (
    normalized.includes("rejected") ||
    normalized.includes("failed") ||
    normalized.includes("cancelled")
  ) {
    className =
      "bg-red-100 text-red-700";
  } else if (
    normalized.includes("submitted") ||
    normalized.includes("pending") ||
    normalized.includes("review")
  ) {
    className =
      "bg-yellow-100 text-yellow-700";
  } else if (
    normalized.includes("draft")
  ) {
    className =
      "bg-gray-100 text-gray-700";
  }

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      {status}
    </span>
  );
}