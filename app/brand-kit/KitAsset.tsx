"use client";

import { useEffect, useId, useRef, useState } from "react";

type FileLink = {
  href: string;
  label: string;
  detail: string;
};

export function KitAsset({
  title,
  preview,
  files,
}: {
  title: string;
  preview: string;
  files: FileLink[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`kit-card${open ? " open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="kit-hit"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <img src={preview} alt={title} />
        <span className="kit-dl" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4v11" />
            <path d="M7 11l5 5 5-5" />
            <path d="M5 19h14" />
          </svg>
        </span>
      </button>
      {open ? (
        <div className="kit-menu" id={menuId} role="menu">
          {files.map((file) => (
            <a key={file.href} role="menuitem" href={file.href} download>
              <strong>{file.label}</strong>
              <small>{file.detail}</small>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
