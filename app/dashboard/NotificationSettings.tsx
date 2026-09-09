"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";

type Prefs = {
  notifyJobAlerts: boolean;
  notifyTakeSubmitted: boolean;
  notifyTakeOutcome: boolean;
};

export function NotificationSettings() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings/notifications")
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? "Could not load settings");
        setPrefs({
          notifyJobAlerts: Boolean(body.notifyJobAlerts),
          notifyTakeSubmitted: Boolean(body.notifyTakeSubmitted),
          notifyTakeOutcome: Boolean(body.notifyTakeOutcome),
        });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load settings");
      });
  }, []);

  async function save(next: Prefs) {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not save settings");
      setPrefs({
        notifyJobAlerts: Boolean(body.notifyJobAlerts),
        notifyTakeSubmitted: Boolean(body.notifyTakeSubmitted),
        notifyTakeOutcome: Boolean(body.notifyTakeOutcome),
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  if (!prefs && !error) {
    return <p className="text-sm text-gray-500">Loading email settings…</p>;
  }

  if (!prefs) {
    return <Alert variant="error">{error}</Alert>;
  }

  return (
    <div className="space-y-5">
      <Card padding="md">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Email notifications</h2>
        <div className="mt-4 space-y-4">
          <PrefRow
            title="New job alerts"
            description="Email me when a creator posts a gig that matches my selected instruments. If I haven’t selected any instruments, I won’t get job alerts."
            checked={prefs.notifyJobAlerts}
            disabled={saving}
            onChange={(checked) => void save({ ...prefs, notifyJobAlerts: checked })}
          />
          <PrefRow
            title="New takes on my jobs"
            description="When a musician submits a take to a gig you posted."
            checked={prefs.notifyTakeSubmitted}
            disabled={saving}
            onChange={(checked) => void save({ ...prefs, notifyTakeSubmitted: checked })}
          />
          <PrefRow
            title="Take outcomes"
            description="When your take is selected, or a job you submitted to is cancelled."
            checked={prefs.notifyTakeOutcome}
            disabled={saving}
            onChange={(checked) => void save({ ...prefs, notifyTakeOutcome: checked })}
          />
        </div>
      </Card>

      {error && <Alert variant="error">{error}</Alert>}
      {saved && <p className="text-sm text-emerald-700 dark:text-emerald-400">Saved</p>}
    </div>
  );
}

function PrefRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <Toggle checked={checked} disabled={disabled} onChange={onChange} />
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 disabled:opacity-50 ${
        checked ? "bg-accent" : "bg-gray-200 dark:bg-gray-700"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-150 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
