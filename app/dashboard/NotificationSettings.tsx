"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { ALL_INSTRUMENTS_ID, INSTRUMENT_CATEGORIES } from "@/lib/instruments";

type Prefs = {
  notifyJobAlerts: boolean;
  notifyInstruments: string[];
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
        setPrefs(body);
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
      setPrefs(body);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  function toggleInstrument(id: string) {
    if (!prefs) return;
    const selected = new Set(prefs.notifyInstruments);
    if (id === ALL_INSTRUMENTS_ID) {
      const next = selected.has(ALL_INSTRUMENTS_ID) ? [] : [ALL_INSTRUMENTS_ID];
      const enabled = next.length > 0;
      void save({ ...prefs, notifyInstruments: next, notifyJobAlerts: enabled });
      return;
    }

    selected.delete(ALL_INSTRUMENTS_ID);
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    const next = Array.from(selected);
    void save({ ...prefs, notifyInstruments: next, notifyJobAlerts: next.length > 0 });
  }

  if (!prefs && !error) {
    return <p className="text-sm text-gray-500">Loading notification settings…</p>;
  }

  if (!prefs) {
    return <Alert variant="error">{error}</Alert>;
  }

  const allSelected = prefs.notifyInstruments.includes(ALL_INSTRUMENTS_ID);

  return (
    <div className="space-y-5">
      <Card padding="md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">New job alerts</h2>
            <p className="mt-1 text-sm text-gray-500">
              Email me when a creator posts a gig that matches the instruments I play.
            </p>
          </div>
          <Toggle
            checked={prefs.notifyJobAlerts}
            onChange={(checked) =>
              void save({
                ...prefs,
                notifyJobAlerts: checked,
                notifyInstruments: checked
                  ? prefs.notifyInstruments.length
                    ? prefs.notifyInstruments
                    : [ALL_INSTRUMENTS_ID]
                  : prefs.notifyInstruments,
              })
            }
            disabled={saving}
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Chip
            selected={allSelected}
            onClick={() => toggleInstrument(ALL_INSTRUMENTS_ID)}
            label="All instruments"
          />
          {INSTRUMENT_CATEGORIES.map((category) => (
            <Chip
              key={category.id}
              selected={!allSelected && prefs.notifyInstruments.includes(category.id)}
              onClick={() => toggleInstrument(category.id)}
              emoji={category.emoji}
              label={category.label}
            />
          ))}
        </div>
        {!prefs.notifyJobAlerts && (
          <p className="mt-3 text-xs text-gray-400">
            Select instruments to turn alerts on. Leave them empty to stay quiet.
          </p>
        )}
      </Card>

      <Card padding="md">
        <h2 className="text-base font-semibold text-gray-900">Other emails</h2>
        <div className="mt-4 space-y-4">
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
      {saved && <p className="text-sm text-emerald-700">Saved</p>}
    </div>
  );
}

function Chip({
  selected,
  onClick,
  label,
  emoji,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  emoji?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 ${
        selected
          ? "bg-gray-900 text-white"
          : "bg-white text-gray-700 ring-1 ring-inset ring-gray-200 hover:bg-gray-50"
      }`}
    >
      {emoji ? <span aria-hidden="true">{emoji}</span> : null}
      <span>{label}</span>
    </button>
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
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="mt-0.5 text-sm text-gray-500">{description}</p>
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
        checked ? "bg-accent" : "bg-gray-200"
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
