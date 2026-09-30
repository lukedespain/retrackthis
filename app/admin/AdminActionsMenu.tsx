"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type AdminAction =
  | {
      label: string;
      href: string;
      danger?: boolean;
      hint?: string;
    }
  | {
      label: string;
      onClick: () => void;
      disabled?: boolean;
      danger?: boolean;
      hint?: string;
    };

const MENU_WIDTH = 224;

/**
 * Dropdown for row actions inside scrollable tables. Rendered in a portal with
 * fixed positioning so the table's overflow container can't clip it.
 */
export function AdminActionsMenu({
  actions,
  label = "Admin actions",
}: {
  actions: AdminAction[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? 0;
    const fitsBelow = rect.bottom + 6 + menuHeight <= window.innerHeight - 8;
    setPos({
      top: fitsBelow ? rect.bottom + 6 : Math.max(8, rect.top - 6 - menuHeight),
      left: Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)),
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onScroll() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  const itemClass = (danger?: boolean) =>
    `flex w-full flex-col items-start rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
      danger
        ? "text-red-600 hover:bg-red-50"
        : "text-gray-700 hover:bg-gray-50"
    }`;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setPos(null);
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        {label}
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5 text-gray-400">
          <path
            fill="currentColor"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
          />
        </svg>
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: "fixed",
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
              width: MENU_WIDTH,
            }}
            className="z-50 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg"
          >
            {actions.map((action) =>
              "href" in action ? (
                <Link
                  key={action.label}
                  href={action.href}
                  role="menuitem"
                  className={itemClass(action.danger)}
                  onClick={() => setOpen(false)}
                >
                  {action.label}
                  {action.hint ? (
                    <span className="text-[11px] text-gray-400">{action.hint}</span>
                  ) : null}
                </Link>
              ) : (
                <button
                  key={action.label}
                  type="button"
                  role="menuitem"
                  disabled={action.disabled}
                  className={itemClass(action.danger)}
                  onClick={() => {
                    setOpen(false);
                    action.onClick();
                  }}
                >
                  {action.label}
                  {action.hint ? (
                    <span className="text-[11px] text-gray-400">{action.hint}</span>
                  ) : null}
                </button>
              )
            )}
          </div>,
          document.body
        )}
    </>
  );
}
