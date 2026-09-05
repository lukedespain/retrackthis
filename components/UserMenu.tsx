"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const menuItemClass =
  "block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white";

const sectionLabelClass =
  "px-3 pb-0.5 pt-2 text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className={sectionLabelClass} role="presentation">
      {children}
    </p>
  );
}

function Divider() {
  return <div className="my-1 h-px bg-gray-100 dark:bg-gray-800" role="separator" />;
}

export function UserMenu({
  name,
  isAdmin = false,
  onSignOut,
}: {
  name: string;
  isAdmin?: boolean;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
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

  function close() {
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-all duration-150 ease-out hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 active:scale-[0.97] dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 dark:focus-visible:ring-offset-gray-950"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 origin-top-right rounded-xl border border-gray-100 bg-white p-1.5 shadow-card-hover dark:border-gray-800 dark:bg-gray-900"
        >
          <p
            className="truncate px-3 py-2 text-sm font-medium text-gray-900 dark:text-white"
            role="presentation"
          >
            {name}
          </p>

          <Divider />

          <SectionLabel>Producers</SectionLabel>
          <Link
            href="/dashboard?tab=jobs&post=1"
            role="menuitem"
            onClick={close}
            className={menuItemClass}
          >
            Post a job
          </Link>
          <Link href="/dashboard" role="menuitem" onClick={close} className={menuItemClass}>
            My jobs
          </Link>

          <Divider />

          <SectionLabel>Musicians</SectionLabel>
          <Link href="/jobs" role="menuitem" onClick={close} className={menuItemClass}>
            Browse jobs
          </Link>
          <Link
            href="/dashboard?tab=submissions"
            role="menuitem"
            onClick={close}
            className={menuItemClass}
          >
            My submissions
          </Link>

          <Divider />

          <Link
            href="/dashboard/settings"
            role="menuitem"
            onClick={close}
            className={menuItemClass}
          >
            Settings
          </Link>
          {isAdmin ? (
            <Link href="/admin" role="menuitem" onClick={close} className={menuItemClass}>
              Admin
            </Link>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              onSignOut();
            }}
            className={menuItemClass}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
