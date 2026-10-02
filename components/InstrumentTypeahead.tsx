"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { InstrumentIcon } from "@/components/brand/InstrumentIcon";
import {
  displayLabelForInstrumentId,
  labelForInstrumentId,
  presentInstrumentCatalog,
  type InstrumentCategory,
} from "@/lib/instruments";
import { useInstrumentCatalog } from "@/lib/useApprovedInstruments";

type InstrumentTypeaheadProps = {
  selectedId: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
  label?: string;
  hint?: string;
  /** Prototype combobox used on the post-a-job part card. */
  variant?: "field" | "combo";
};

function scoreMatch(item: InstrumentCategory, query: string): number {
  const q = query.toLowerCase();
  const label = item.label.toLowerCase();
  const group = item.groupLabel.toLowerCase();
  if (label === q) return 100;
  if (label.startsWith(q)) return 90;
  if (item.aliases.some((alias) => alias === q)) return 85;
  if (item.aliases.some((alias) => alias.startsWith(q))) return 75;
  if (label.includes(q)) return 60;
  if (item.aliases.some((alias) => alias.includes(q))) return 50;
  if (group.includes(q)) return 30;
  return 0;
}

export function searchInstruments(query: string, limit = 8, catalog: InstrumentCategory[] = presentInstrumentCatalog([])): InstrumentCategory[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return catalog.map((item) => ({ item, score: scoreMatch(item, q) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label))
    .slice(0, limit)
    .map((entry) => entry.item);
}

export function InstrumentTypeahead({
  selectedId,
  onChange,
  disabled = false,
  label = "Instrument needed",
  hint = "Start typing. Pick the exact part you need.",
  variant = "field",
}: InstrumentTypeaheadProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const { catalog } = useInstrumentCatalog();

  const suggestions = useMemo(() => searchInstruments(query, 8, catalog), [query, catalog]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function select(id: string) {
    onChange(id);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function clear() {
    onChange(null);
    setQuery("");
    setOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  if (variant === "combo") {
    const selectedLabel = selectedId ? displayLabelForInstrumentId(selectedId) : "";
    return (
      <div ref={containerRef} className={`combo${open ? " on" : ""}`}>
        <span className="combo-ico">
          {selectedId ? <InstrumentIcon instrument={selectedLabel} /> : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="11" cy="11" r="6" />
              <path d="M16 16l4 4" />
            </svg>
          )}
        </span>
        <input
          ref={inputRef}
          id={listId}
          className="in"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${listId}-list`}
          aria-autocomplete="list"
          disabled={disabled}
          value={open || !selectedId ? query : selectedLabel}
          placeholder="Choose an instrument"
          autoComplete="off"
          onChange={(event) => {
            if (selectedId) onChange(null);
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setQuery("");
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (!open || suggestions.length === 0) {
              if (event.key === "Escape") setOpen(false);
              return;
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((i) => (i + 1) % suggestions.length);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
            } else if (event.key === "Enter") {
              event.preventDefault();
              const pick = suggestions[activeIndex];
              if (pick) select(pick.id);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        <span className="combo-chev">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
        <div className="combo-list" id={`${listId}-list`} role="listbox">
          {query.trim() && suggestions.length === 0 ? (
            <div className="combo-none">No matches. Try bass, keys, sax…</div>
          ) : (
            (query.trim() ? suggestions : catalog.slice(0, 8)).map((item, index) => (
              <div
                key={item.id}
                className={`combo-opt${index === activeIndex ? " on" : ""}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  select(item.id);
                }}
              >
                <span className="e"><InstrumentIcon instrument={item.label} /></span>
                <span>{item.label}</span>
                <span className="combo-sub">{item.groupLabel}</span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (selectedId) {
    return (
      <div className="sm:col-span-2">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
        <div className="mt-1.5 flex min-h-[44px] items-center rounded-xl border border-accent bg-accent-muted/40 px-3 py-2">
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white py-1 pl-3 pr-1.5 text-sm font-medium text-gray-900 ring-1 ring-inset ring-accent/20">
            <span className="truncate">{displayLabelForInstrumentId(selectedId)}</span>
            {!disabled && (
              <button
                type="button"
                aria-label={`Clear ${labelForInstrumentId(selectedId)}`}
                onClick={clear}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            )}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative sm:col-span-2">
      <label htmlFor={listId} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
      <input
        ref={inputRef}
        id={listId}
        type="text"
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={`${listId}-list`}
        aria-autocomplete="list"
        disabled={disabled}
        value={query}
        placeholder="e.g. steel guitar, cello, tenor sax…"
        autoComplete="off"
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (!open || suggestions.length === 0) {
            if (event.key === "Escape") setOpen(false);
            return;
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((i) => (i + 1) % suggestions.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
          } else if (event.key === "Enter") {
            event.preventDefault();
            const pick = suggestions[activeIndex];
            if (pick) select(pick.id);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-150 ease-out hover:border-gray-300 focus:border-accent focus:ring-2 focus:ring-accent/10 disabled:cursor-not-allowed disabled:bg-gray-50"
      />

      {open && query.trim() && (
        <div
          id={`${listId}-list`}
          role="listbox"
          className="absolute z-50 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg shadow-gray-900/10"
        >
          {suggestions.length === 0 ? (
            <p className="px-3.5 py-3 text-sm text-gray-500">
              No matches. Try another name (e.g. “bass”, “keys”, “sax”).
            </p>
          ) : (
            suggestions.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => select(item.id)}
                className={`flex min-h-[44px] w-full flex-col items-start px-3.5 py-2.5 text-left transition-colors ${
                  index === activeIndex
                    ? "bg-accent-muted/50"
                    : "hover:bg-gray-50"
                }`}
              >
                <span className="text-sm font-medium text-gray-900">{item.label}</span>
                <span className="text-xs text-gray-500">{item.groupLabel}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
