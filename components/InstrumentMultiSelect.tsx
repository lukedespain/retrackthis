"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  INSTRUMENT_GROUPS,
  displayLabelForInstrumentId,
  isCustomInstrumentId,
  makeCustomInstrumentId,
} from "@/lib/instruments";

type InstrumentMultiSelectProps = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
  label?: string;
  hint?: string;
  mode?: "multi" | "single";
  /** Catalog instrument ids shown but not selectable (e.g. no musicians in network yet). */
  unavailableIds?: string[];
  triggerLabel?: string;
  chipLabel?: (id: string) => string;
  allowCustom?: boolean;
};

export function InstrumentMultiSelect({
  selectedIds,
  onChange,
  disabled = false,
  loading = false,
  error = null,
  label = "Instruments",
  hint = "Expand a category and check each part you can record live.",
  mode = "multi",
  unavailableIds = [],
  triggerLabel = "Select instrument(s)",
  chipLabel = displayLabelForInstrumentId,
  allowCustom = true,
}: InstrumentMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const unavailable = new Set(unavailableIds);

  const selectedByGroup = useMemo(() => {
    const map = new Map<string, number>();
    for (const id of selectedIds) {
      const group = INSTRUMENT_GROUPS.find(
        (entry) =>
          entry.items.some((item) => item.id === id) ||
          (isCustomInstrumentId(id) && id.startsWith(`custom:${entry.id}:`))
      );
      if (group) map.set(group.id, (map.get(group.id) ?? 0) + 1);
    }
    return map;
  }, [selectedIds]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const next = new Set<string>();
    for (const group of INSTRUMENT_GROUPS) {
      if ((selectedByGroup.get(group.id) ?? 0) > 0) next.add(group.id);
    }
    setExpandedGroups(next);
  }, [open, selectedByGroup]);

  function toggleGroup(groupId: string) {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  function toggle(id: string) {
    if (disabled || unavailable.has(id)) return;
    if (mode === "single") {
      onChange(selectedIds.includes(id) ? [] : [id]);
      setOpen(false);
      return;
    }
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  }

  function addCustom(groupId: string, label: string) {
    if (disabled || !allowCustom || mode === "single") return;
    const id = makeCustomInstrumentId(groupId, label);
    if (!id || selectedIds.includes(id)) return;
    onChange([...selectedIds, id]);
  }

  function removeChip(id: string) {
    if (disabled) return;
    onChange(selectedIds.filter((item) => item !== id));
  }

  if (loading) {
    return (
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
        <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">Loading instruments…</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <label id={`${listId}-label`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      {hint && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${listId}-label`}
        onClick={() => setOpen((value) => !value)}
        className={`mt-1.5 flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl border bg-white px-3.5 py-2.5 text-left text-sm transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 dark:bg-gray-950 dark:disabled:bg-gray-900 ${
          open
            ? "border-accent ring-2 ring-accent/10"
            : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
        }`}
      >
        <span className="text-gray-400 dark:text-gray-500">{triggerLabel}</span>
        <Chevron open={open} />
      </button>

      {mode === "multi" && selectedIds.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedIds.map((id) => (
            <span
              key={id}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-accent-muted/50 py-1 pl-2.5 pr-1.5 text-xs font-medium text-gray-800 ring-1 ring-inset ring-accent/15 dark:bg-accent/20 dark:text-gray-100"
            >
              <span className="truncate">{chipLabel(id)}</span>
              {!disabled && (
                <button
                  type="button"
                  aria-label={`Remove ${chipLabel(id)}`}
                  onClick={() => removeChip(id)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white/80 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {mode === "single" && selectedIds[0] && (
        <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{chipLabel(selectedIds[0])}</p>
      )}

      {open && (
        <div
          role="listbox"
          id={listId}
          aria-labelledby={`${listId}-label`}
          aria-multiselectable={mode === "multi"}
          className="absolute z-50 mt-1.5 max-h-[min(420px,70vh)] w-full overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg shadow-gray-900/10 dark:border-gray-700 dark:bg-gray-900 dark:shadow-black/40"
        >
          {INSTRUMENT_GROUPS.map((group) => {
            const expanded = expandedGroups.has(group.id);
            const selectedCount = selectedByGroup.get(group.id) ?? 0;

            return (
              <div key={group.id} className="border-b border-gray-100 last:border-b-0 dark:border-gray-800">
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => toggleGroup(group.id)}
                  className="flex min-h-[44px] w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none dark:hover:bg-gray-800 dark:focus-visible:bg-gray-800"
                >
                  <span className="text-base leading-none" aria-hidden="true">
                    {group.emoji}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold text-gray-900 dark:text-white">
                    {group.label}
                  </span>
                  {selectedCount > 0 && (
                    <span className="rounded-full bg-accent-muted px-2 py-0.5 text-[10px] font-semibold text-accent">
                      {selectedCount}
                    </span>
                  )}
                  <Chevron open={expanded} />
                </button>

                {expanded && (
                  <div className="pb-1">
                    {group.items.map((item) => (
                      <InstrumentOptionRow
                        key={item.id}
                        label={item.label}
                        selected={selectedIds.includes(item.id)}
                        blocked={unavailable.has(item.id)}
                        mode={mode}
                        onToggle={() => toggle(item.id)}
                      />
                    ))}

                    {allowCustom && mode === "multi" && (
                      <CustomInstrumentRow
                        groupId={group.id}
                        disabled={disabled}
                        onAdd={(value) => addCustom(group.id, value)}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function InstrumentOptionRow({
  label,
  selected,
  blocked,
  mode,
  onToggle,
}: {
  label: string;
  selected: boolean;
  blocked: boolean;
  mode: "multi" | "single";
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      aria-disabled={blocked}
      disabled={blocked}
      onClick={onToggle}
      className={`flex min-h-[44px] w-full items-center gap-3 py-2 pl-8 pr-3.5 text-left transition-colors focus-visible:outline-none ${
        blocked
          ? "cursor-not-allowed opacity-45"
          : "hover:bg-gray-50 focus-visible:bg-gray-50 dark:hover:bg-gray-800 dark:focus-visible:bg-gray-800"
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
          selected
            ? "border-accent bg-accent text-white"
            : blocked
              ? "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
              : "border-gray-300 bg-white text-transparent dark:border-gray-600 dark:bg-gray-950"
        }`}
      >
        {mode === "single" && selected ? (
          <span className="h-2 w-2 rounded-full bg-white" />
        ) : (
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.25a1 1 0 01-1.42 0l-3.25-3.25a1 1 0 011.42-1.42l2.54 2.54 6.54-6.54a1 1 0 011.42 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
        {blocked && (
          <span className="block text-xs text-gray-500 dark:text-gray-400">No musicians in network yet</span>
        )}
      </span>
    </button>
  );
}

function CustomInstrumentRow({
  groupId,
  disabled,
  onAdd,
}: {
  groupId: string;
  disabled: boolean;
  onAdd: (label: string) => void;
}) {
  const [value, setValue] = useState("");
  const inputId = `custom-${groupId}`;

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue("");
  }

  return (
    <div className="px-3.5 py-2 pl-8">
      <label htmlFor={inputId} className="block text-xs font-medium text-gray-500 dark:text-gray-400">
        Other in this category
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id={inputId}
          type="text"
          value={value}
          disabled={disabled}
          placeholder="Type instrument…"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 disabled:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500 dark:disabled:bg-gray-900"
        />
        <button
          type="button"
          disabled={disabled || !value.trim()}
          onClick={submit}
          className="shrink-0 rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}
