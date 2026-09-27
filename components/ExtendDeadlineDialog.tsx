"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatDeadline } from "@/lib/format";
import {
  DEFAULT_EXTENSION_DAYS,
  MAX_EXTENSION_DAYS,
  MIN_EXTENSION_DAYS,
} from "@/lib/jobPricing";

const DAY_MS = 24 * 60 * 60 * 1000;

function formatDateTime(date: Date) {
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ExtendDeadlineDialog({
  job,
  onClose,
  onExtended,
  onBehalfOf,
}: {
  job: { id: string; title: string; instrument: string; deadline: string };
  onClose: () => void;
  onExtended: (result: { days: number; notified: number }) => void;
  /** Admin only: producer name shown in the heading. */
  onBehalfOf?: string;
}) {
  const [days, setDays] = useState(DEFAULT_EXTENSION_DAYS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentDeadline = new Date(job.deadline);
  const newDeadline = new Date(currentDeadline.getTime() + days * DAY_MS);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  function step(delta: number) {
    setDays((d) => Math.min(MAX_EXTENSION_DAYS, Math.max(MIN_EXTENSION_DAYS, d + delta)));
  }

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}/extend-deadline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
      onExtended({ days, notified: body?.notified ?? 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }

  const dayLabel = days === 1 ? "1 day" : `${days} days`;
  const stepperButton =
    "flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-lg font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-6"
      role="presentation"
      onClick={(e) => {
        e.stopPropagation();
        if (!saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="extend-deadline-title"
        className="w-full max-w-md rounded-2xl bg-white p-5 text-left shadow-xl sm:p-6 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="extend-deadline-title"
          className="text-base font-semibold text-gray-900 dark:text-white"
        >
          Extend deadline
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {job.title}
          {onBehalfOf ? ` · for ${onBehalfOf}` : ""}
        </p>

        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            type="button"
            className={stepperButton}
            onClick={() => step(-1)}
            disabled={saving || days <= MIN_EXTENSION_DAYS}
            aria-label="One day less"
          >
            −
          </button>
          <div className="min-w-[7rem] text-center" aria-live="polite">
            <div className="text-3xl font-semibold tabular-nums text-gray-900 dark:text-white">
              +{days}
            </div>
            <div className="text-xs text-gray-500">{days === 1 ? "day" : "days"}</div>
          </div>
          <button
            type="button"
            className={stepperButton}
            onClick={() => step(1)}
            disabled={saving || days >= MAX_EXTENSION_DAYS}
            aria-label="One day more"
          >
            +
          </button>
        </div>

        <p className="mt-3 text-center text-[11px] text-gray-400">
          {MIN_EXTENSION_DAYS}–{MAX_EXTENSION_DAYS} days per extension
        </p>

        <dl className="mt-5 space-y-1.5 rounded-xl bg-gray-50 px-4 py-3 text-sm dark:bg-gray-800/60">
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500 dark:text-gray-400">Current</dt>
            <dd className="text-right text-gray-700 dark:text-gray-300">
              {formatDateTime(currentDeadline)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500 dark:text-gray-400">New deadline</dt>
            <dd className="text-right font-medium text-gray-900 dark:text-white">
              {formatDateTime(newDeadline)}
              <span className="block text-xs font-normal text-gray-500">
                {formatDeadline(newDeadline)}
              </span>
            </dd>
          </div>
        </dl>

        <p className="mt-4 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          We’ll email all musicians that have “{job.instrument}” included in their profile. The 48
          hour grace-period to award a musician will start after the new deadline.
        </p>

        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => void submit()} disabled={saving}>
            {saving ? "Extending…" : `Extend by ${dayLabel}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
