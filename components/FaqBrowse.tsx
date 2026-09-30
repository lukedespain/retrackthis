"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

export type FaqItem = {
  id: string;
  question: string;
  answer: ReactNode;
};

function hashFaqId() {
  if (typeof window === "undefined") return "";
  return window.location.hash.replace(/^#/, "");
}

/** Accordion of questions; one open at a time, synced to #hash for shareable links. */
export function FaqBrowse({ items, footer }: { items: FaqItem[]; footer?: ReactNode }) {
  const baseId = useId();
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  function toggle(id: string) {
    const next = openId === id ? null : id;
    setOpenId(next);
    if (typeof window !== "undefined") {
      const url = next ? `#${next}` : window.location.pathname + window.location.search;
      window.history.replaceState(null, "", url);
    }
  }

  useEffect(() => {
    function applyHash() {
      const id = hashFaqId();
      if (!id || !items.some((item) => item.id === id)) return;
      setOpenId(id);
      requestAnimationFrame(() => {
        document.getElementById(`${baseId}-button-${id}`)?.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      });
    }

    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [items, baseId]);

  return (
    <div className="faq">
      {items.map((item, index) => {
        const open = item.id === openId;
        const panelId = `${baseId}-panel-${item.id}`;
        const buttonId = `${baseId}-button-${item.id}`;
        return (
          <div key={item.id} className={`q${open ? " on" : ""}`}>
            <button
              id={buttonId}
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => toggle(item.id)}
            >
              <span className="n">{String(index + 1).padStart(2, "0")}</span>
              {item.question}
              <span className="chev">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </button>
            <div id={panelId} className="a" role="region" aria-labelledby={buttonId} {...(open ? {} : { inert: true })}>
              <div>
                <div className="faq-answer">{item.answer}</div>
              </div>
            </div>
          </div>
        );
      })}
      {footer}
    </div>
  );
}
