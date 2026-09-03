"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PaymentCenterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/invoices/5/payment");
  }, [router]);

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center">
      <p className="text-on-surface-variant">
        Loading payment details...
      </p>
    </main>
  );
}