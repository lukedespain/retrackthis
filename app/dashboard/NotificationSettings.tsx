"use client";

import { useEffect, useMemo, useState } from "react";
import { InstrumentMultiSelect } from "@/components/InstrumentMultiSelect";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ALL_INSTRUMENTS_ID, labelForInstrumentId } from "@/lib/instruments";

type Prefs = {
  notifyJobAlerts: boolean;
  notifyInstruments: string[];
  notifyTakeSubmitted: boolean;
  notifyTakeOutcome: boolean;
};

function sameIds(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((id, index) => id === right[index]);
}

export function NotificationSettings() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [alertDraft, setAlertDraft] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const allSelected = alertDraft.includes(ALL_INSTRUMENTS_ID);
  const dirty = prefs ? !sameIds(prefs.notifyInstruments, alertDraft) : false;

  useEffect(() => {
    fetch("/api/settings/notifications")
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? "Could not load settings");
        setPrefs(body);
        setAlertDraft(body.notifyInstruments ?? []);
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
      setAlertDraft(body.notifyInstruments ?? []);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  function saveAlertInstruments() {
    if (!prefs) return;
    const notifyInstruments = alertDraft;
    const notifyJobAlerts = notifyInstruments.length > 0;
    void save({ ...prefs, notifyInstruments, notifyJobAlerts });
  }

  function resetAlertDraft() {
    if (!prefs) return;
    setAlertDraft(prefs.notifyInstruments);
    setError(null);
  }

  function toggleAllInstruments() {
    if (allSelected) {
      setAlertDraft([]);
      return;
    }
    setAlertDraft([ALL_INSTRUMENTS_ID]);
  }

  const specificIds = useMemo(
    () => alertDraft.filter((id) => id !== ALL_INSTRUMENTS_ID),
    [alertDraft]
  );

  if (!prefs && !error) {
    return <p className="text-sm text-gray-500">Loading notification settings…</p>;
  }

  if (!prefs) {
    return <Alert variant="error">{error}</Alert>;
  }

  return (
    <div className="space-y-5">
      <Card padding="md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">New job alerts</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              On by default. Email me when a creator posts a matching gig — turn off anytime.
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

        <div className="mt-5 space-y-4">
          <button
            type="button"
            onClick={toggleAllInstruments}
            disabled={saving}
            aria-pressed={allSelected}
            className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 disabled:opacity-50 dark:focus-visible:ring-offset-gray-900 ${
              allSelected
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "bg-white text-gray-700 ring-1 ring-inset ring-gray-200 hover:bg-gray-50 dark:bg-gray-950 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-800"
            }`}
          >
            All instruments
          </button>

          <InstrumentMultiSelect
            label="Alert me for"
            hint={
              allSelected
                ? "Turn off All instruments above to pick specific parts."
                : "Expand a category and pick the gigs you want emailed about."
            }
            selectedIds={specificIds}
            onChange={(ids) => setAlertDraft(ids)}
            disabled={saving || allSelected}
            allowCustom={false}
            chipLabel={labelForInstrumentId}
            triggerLabel="Select instruments for alerts"
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={!dirty || saving}
            onClick={saveAlertInstruments}
          >
            {saving ? "Saving…" : "Save alert preferences"}
          </Button>
          {dirty && (
            <button
              type="button"
              disabled={saving}
              onClick={resetAlertDraft}
              className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 disabled:opacity-50 dark:text-gray-400 dark:hover:text-white"
            >
              Cancel
            </button>
          )}
        </div>

        {!prefs.notifyJobAlerts && (
          <p className="mt-3 text-xs text-gray-400">
            Alerts are off. Flip the switch above (or pick instruments and save) to turn them back on.
          </p>
        )}
      </Card>

      <Card padding="md">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Other emails</h2>
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
      {saved && !dirty && <p className="text-sm text-emerald-700 dark:text-emerald-400">Saved</p>}
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
