"use client";

import { useId, useState, type ReactNode } from "react";

/** Compact “i” tip for longer field help without always-on paragraphs. */
export function FieldInfo({ children }: { children: ReactNode }) {
  const tipId = useId();
  const [open, setOpen] = useState(false);

  return (
    <span className="group relative ml-1.5 inline-flex align-middle">
      <button
        type="button"
        aria-label="More information"
        aria-expanded={open}
        aria-controls={tipId}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        onBlur={() => setOpen(false)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 text-[10px] font-semibold leading-none text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
      >
        i
      </button>
      <span
        id={tipId}
        role="tooltip"
        className={`absolute left-0 top-full z-20 mt-2 w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-xs font-normal leading-relaxed text-gray-600 shadow-sm sm:w-72 ${
          open ? "block" : "hidden md:group-hover:block"
        }`}
      >
        {children}
      </span>
    </span>
  );
}

export function FieldLabel({
  htmlFor,
  children,
  info,
}: {
  htmlFor?: string;
  children: ReactNode;
  info?: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="inline-flex items-center text-sm font-medium text-gray-700 dark:text-gray-300"
    >
      {children}
      {info ? <FieldInfo>{info}</FieldInfo> : null}
    </label>
  );
}
