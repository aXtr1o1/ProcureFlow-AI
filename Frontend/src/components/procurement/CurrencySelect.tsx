"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CURRENCY_OPTIONS } from "@/lib/currencies";

type Props = {
  value: string;
  onChange: (code: string) => void;
  required?: boolean;
  className?: string;
};

export default function CurrencySelect({
  value,
  onChange,
  required,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const options = useMemo(() => {
    const q = query.trim().toUpperCase();
    const list =
      value && !CURRENCY_OPTIONS.includes(value)
        ? [value, ...CURRENCY_OPTIONS]
        : CURRENCY_OPTIONS;
    if (!q) return list;
    return list.filter((code) => code.includes(q));
  }, [query, value]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <input type="hidden" value={value} required={required} readOnly />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-left"
      >
        <span>{value || "Select currency"}</span>
        <span className="text-gray-400">▾</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-white shadow-lg">
          <div className="border-b p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search currency..."
              className="w-full rounded border px-2 py-1.5 text-sm"
            />
          </div>

          <ul className="max-h-48 overflow-y-auto py-1">
            {options.map((code) => (
              <li key={code}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(code);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${
                    code === value
                      ? "bg-blue-600 text-white hover:bg-blue-600"
                      : ""
                  }`}
                >
                  {code}
                </button>
              </li>
            ))}
            {options.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">
                No match
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
