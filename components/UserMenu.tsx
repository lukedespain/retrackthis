"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function UserMenu({
  name,
  hasStripeAccount = false,
  onSignOut,
}: {
  name: string;
  hasStripeAccount?: boolean;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [openingExpress, setOpeningExpress] = useState(false);
  const [expressError, setExpressError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent | TouchEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function openExpressDashboard() {
    setOpeningExpress(true);
    setExpressError(null);
    try {
      const res = await fetch("/api/stripe/connect/dashboard", { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not open Stripe Express");
      if (!body?.url) throw new Error("Stripe did not return a dashboard link");
      const opened = window.open(body.url, "_blank", "noopener,noreferrer");
      if (!opened) {
        // Popup blocked: fall back to same-tab navigation.
        window.location.href = body.url;
        return;
      }
      setOpen(false);
      setOpeningExpress(false);
    } catch (err) {
      setExpressError(err instanceof Error ? err.message : "Could not open Stripe Express");
      setOpeningExpress(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-all duration-150 ease-out hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 active:scale-[0.97]"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 origin-top-right rounded-xl border border-gray-100 bg-white p-1.5 shadow-card-hover"
        >
          <p className="truncate px-3 py-2 text-sm font-medium text-gray-900" role="presentation">
            {name}
          </p>
          <div className="my-1 h-px bg-gray-100" />

          {hasStripeAccount ? (
            <button
              type="button"
              role="menuitem"
              disabled={openingExpress}
              onClick={openExpressDashboard}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:opacity-60"
            >
              {openingExpress ? "Opening Stripe…" : "Stripe Express"}
            </button>
          ) : (
            <Link
              href="/dashboard?tab=submissions"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
            >
              Set up payouts
            </Link>
          )}

          {expressError && (
            <p className="px-3 pb-2 text-xs text-red-600" role="alert">
              {expressError}
            </p>
          )}

          <Link
            href="/dashboard/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          >
            Settings
          </Link>

          <div className="my-1 h-px bg-gray-100" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
