"use client";

import { useEffect, useState } from "react";
import { POST_DEADLINE_MAX_DAYS } from "@/lib/jobPricing";

const PRESETS: Array<[number, string]> = [
  [3, "3 days"],
  [7, "1 week"],
  [14, "2 weeks"],
  [30, "30 days"],
];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysFromToday(days: number) {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() + days);
  return d;
}

function dateLabel(days: number) {
  return daysFromToday(days).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Prototype due-date calendar. New posts can be at most 30 days out. */
export function DueDatePicker({
  days,
  onChange,
  disabled,
}: {
  days: number;
  onChange: (days: number) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = daysFromToday(days);
  const [cursor, setCursor] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = startOfDay(new Date());
  const min = daysFromToday(1);
  const max = daysFromToday(POST_DEADLINE_MAX_DAYS);

  const cells: Array<{ n: number; date: Date } | null> = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push({ n: d, date: new Date(year, month, d) });

  function pickDate(date: Date) {
    const diff = Math.round((startOfDay(date).getTime() - today.getTime()) / 86400000);
    onChange(Math.min(POST_DEADLINE_MAX_DAYS, Math.max(1, diff)));
    setOpen(false);
  }

  const canPrev = new Date(year, month, 1) > new Date(min.getFullYear(), min.getMonth(), 1);
  const canNext = new Date(year, month + 1, 1) <= new Date(max.getFullYear(), max.getMonth(), 1);

  return (
    <div className={`dp${open ? " on" : ""}`}>
      <button
        type="button"
        className="in dp-btn"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M4 10h16" />
        </svg>
        <span>{dateLabel(days)}</span>
      </button>
      {open ? (
        <div className="dp-pop" role="dialog" aria-label="Choose a due date">
          <div className="dp-head">
            <strong>
              {cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </strong>
            <button
              type="button"
              className="icon"
              aria-label="Previous month"
              disabled={!canPrev}
              onClick={() => setCursor(new Date(year, month - 1, 1))}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
            <button
              type="button"
              className="icon"
              aria-label="Next month"
              disabled={!canNext}
              onClick={() => setCursor(new Date(year, month + 1, 1))}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>
          <div className="dp-grid dp-wk">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <span key={`${d}${i}`}>{d}</span>
            ))}
          </div>
          <div className="dp-grid">
            {cells.map((cell, i) => {
              if (!cell) return <span key={`e${i}`} />;
              const off = cell.date < min || cell.date > max;
              const pressed = cell.date.getTime() === selected.getTime();
              const isToday = cell.date.getTime() === today.getTime();
              return (
                <button
                  key={cell.date.toISOString()}
                  type="button"
                  className={`dp-day${isToday ? " today" : ""}`}
                  disabled={off}
                  aria-pressed={pressed}
                  onClick={() => pickDate(cell.date)}
                >
                  {cell.n}
                </button>
              );
            })}
          </div>
          <div className="dp-pre">
            {PRESETS.map(([n, label]) => (
              <button
                key={n}
                type="button"
                aria-pressed={days === n}
                onClick={() => {
                  onChange(n);
                  setCursor(new Date(daysFromToday(n).getFullYear(), daysFromToday(n).getMonth(), 1));
                  setOpen(false);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
