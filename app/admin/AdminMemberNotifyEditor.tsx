"use client";

import { useMemo, useState } from "react";
import { InstrumentMultiSelect } from "@/components/InstrumentMultiSelect";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ALL_INSTRUMENTS_ID, labelForInstrumentId } from "@/lib/instruments";

export type MemberNotifyPrefs = {
  id: string;
  name: string;
  email: string;
  notifyJobAlerts: boolean;
  notifyInstruments: string[];
  notifyTakeSubmitted: boolean;
  notifyTakeOutcome: boolean;
  instruments: Array<{ id: string; label: string }>;
};

type Props = {
  member: MemberNotifyPrefs;
  onSaved: (next: {
    notifyJobAlerts: boolean;
    notifyInstruments: string[];
    notifyTakeSubmitted: boolean;
    notifyTakeOutcome: boolean;
  }) => void;
  onClose: () => void;
};

function sameIds(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((id, index) => id === right[index]);
}

export function AdminMemberNotifyEditor({ member, onSaved, onClose }: Props) {
  const [jobAlerts, setJobAlerts] = useState(member.notifyJobAlerts);
  const [alertDraft, setAlertDraft] = useState(member.notifyInstruments);
  const [takeSubmitted, setTakeSubmitted] = useState(member.notifyTakeSubmitted);
  const [takeOutcome, setTakeOutcome] = useState(member.notifyTakeOutcome);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allSelected = alertDraft.includes(ALL_INSTRUMENTS_ID);
  const specificIds = useMemo(
    () => alertDraft.filter((id) => id !== ALL_INSTRUMENTS_ID),
    [alertDraft]
  );

  const dirty =
    jobAlerts !== member.notifyJobAlerts ||
    takeSubmitted !== member.notifyTakeSubmitted ||
    takeOutcome !== member.notifyTakeOutcome ||
    !sameIds(alertDraft, member.notifyInstruments);

  function toggleAll() {
    setAlertDraft((prev) => (prev.includes(ALL_INSTRUMENTS_ID) ? [] : [ALL_INSTRUMENTS_ID]));
  }

  function useProfileInstruments() {
    const ids = member.instruments.map((i) => i.id);
    setAlertDraft(ids);
    if (ids.length > 0) setJobAlerts(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const notifyInstruments = alertDraft;
      const notifyJobAlerts = jobAlerts && notifyInstruments.length > 0;
      const res = await fetch(`/api/admin/members/${member.id}/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifyJobAlerts,
          notifyInstruments,
          notifyTakeSubmitted: takeSubmitted,
          notifyTakeOutcome: takeOutcome,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not save");
      onSaved({
        notifyJobAlerts: body.notifyJobAlerts,
        notifyInstruments: body.notifyInstruments,
        notifyTakeSubmitted: body.notifyTakeSubmitted,
        notifyTakeOutcome: body.notifyTakeOutcome,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-accent/20 bg-accent-muted/40 p-4 dark:bg-accent/10">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Edit alerts · {member.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          Close
        </button>
      </div>

      <div className="mt-4 space-y-4">
        <label className="flex items-center justify-between gap-3 text-sm text-gray-700 dark:text-gray-200">
          <span>New job alerts</span>
          <input
            type="checkbox"
            checked={jobAlerts}
            onChange={(e) => setJobAlerts(e.target.checked)}
            disabled={saving}
            className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleAll}
            disabled={saving}
            aria-pressed={allSelected}
            className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              allSelected
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "bg-white text-gray-700 ring-1 ring-inset ring-gray-200 dark:bg-gray-950 dark:text-gray-200 dark:ring-gray-700"
            }`}
          >
            All instruments
          </button>
          {member.instruments.length > 0 && (
            <button
              type="button"
              onClick={useProfileInstruments}
              disabled={saving}
              className="text-xs font-medium text-accent hover:underline"
            >
              Use profile instruments
            </button>
          )}
        </div>

        <InstrumentMultiSelect
          label="Alert instruments"
          hint={
            allSelected
              ? "Turn off All instruments to pick specific parts."
              : "Pick the gigs this member should be emailed about."
          }
          selectedIds={specificIds}
          onChange={setAlertDraft}
          disabled={saving || allSelected}
          allowCustom={false}
          chipLabel={labelForInstrumentId}
          triggerLabel="Select alert instruments"
        />

        <label className="flex items-center justify-between gap-3 text-sm text-gray-700 dark:text-gray-200">
          <span>New takes on their jobs</span>
          <input
            type="checkbox"
            checked={takeSubmitted}
            onChange={(e) => setTakeSubmitted(e.target.checked)}
            disabled={saving}
            className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm text-gray-700 dark:text-gray-200">
          <span>Award / cancel outcomes</span>
          <input
            type="checkbox"
            checked={takeOutcome}
            onChange={(e) => setTakeOutcome(e.target.checked)}
            disabled={saving}
            className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
          />
        </label>
      </div>

      {error && (
        <div className="mt-3">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={!dirty || saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save alerts"}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function alertSummary(member: {
  notifyJobAlerts: boolean;
  notifyInstruments: string[];
}): string {
  if (!member.notifyJobAlerts || member.notifyInstruments.length === 0) return "Off";
  if (member.notifyInstruments.includes(ALL_INSTRUMENTS_ID)) return "All instruments";
  if (member.notifyInstruments.length <= 2) {
    return member.notifyInstruments.map(labelForInstrumentId).join(", ");
  }
  return `${member.notifyInstruments.length} instruments`;
}
