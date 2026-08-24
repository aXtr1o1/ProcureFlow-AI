"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const NAV_LINKS = [
  { href: "/dashboard", label: "Upload" },
  { href: "/dashboard/invoices", label: "Invoices" },
  { href: "/dashboard/search", label: "Search" },
  { href: "/dashboard/assistant", label: "Assistant" },
  { href: "/dashboard/summary", label: "Summary" },
];

export default function Header() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = user?.username
    ? user.username
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "";

  const handleSignOut = () => {
    signOut();
    router.replace("/login");
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-outline-variant/30">
      <div className="h-16 w-full max-w-container-max mx-auto px-margin-desktop flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="font-title-lg text-title-lg text-on-surface whitespace-nowrap">
            ProcureFlow AI
          </span>
          <nav className="hidden sm:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active =
                link.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg font-label-md text-label-md transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-4 relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary text-[13px] font-semibold"
            aria-label="Account menu"
          >
            {initials || (
              <span className="material-symbols-outlined text-[18px]">
                person
              </span>
            )}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 w-56 bg-surface-container-lowest rounded-lg shadow-xl border border-outline-variant/20 py-2 z-50">
              {user && (
                <div className="px-4 py-2 border-b border-outline-variant/20">
                  <p className="font-body-md text-body-md text-on-surface truncate">
                    {user.username}
                  </p>
                  <p className="font-label-md text-label-md text-on-surface-variant truncate">
                    {user.email}
                  </p>
                </div>
              )}
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2 font-body-md text-body-md text-on-surface hover:bg-surface-container transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
