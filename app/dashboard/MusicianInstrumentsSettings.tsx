"use client";

import { useEffect, useMemo, useState } from "react";
import { InstrumentMultiSelect } from "@/components/InstrumentMultiSelect";
import { InstrumentTypeahead } from "@/components/InstrumentTypeahead";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

function sameIds(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((id, index) => id === right[index]);
}

export function MusicianInstrumentsSettings() {
  const [saved, setSaved] = useState<string[]>([]);
  const [draft, setDraft] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const dirty = useMemo(() => !sameIds(saved, draft), [saved, draft]);

  useEffect(() => {
    fetch("/api/settings/instruments")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        const instruments = body?.instruments ?? [];
        setSaved(instruments);
        setDraft(instruments);
      })
      .catch(() => setError("Could not load instruments"))
      .finally(() => setLoading(false));
  }, []);

  async function saveChanges() {
    setSaving(true);
    setError(null);
    setSavedFlash(false);
    try {
      const res = await fetch("/api/settings/instruments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruments: draft }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not save");
      setSaved(body.instruments);
      setDraft(body.instruments);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  function resetDraft() {
    setDraft(saved);
    setError(null);
  }

  return (
    <Card padding="md" id="instruments">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">What I play</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Update the parts you can record live. This powers which instruments creators can post
            gigs for. Job alert emails are separate — manage those under Notifications.
          </p>
        </div>
        {!loading && (
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {draft.length === 0 ? "None selected" : `${draft.length} selected`}
          </span>
        )}
      </div>

      <div className="mt-5">
        <InstrumentMultiSelect
          label="Instruments"
          hint="Expand a category and pick each part you play. Use Other for anything missing."
          selectedIds={draft}
          onChange={setDraft}
          disabled={saving}
          loading={loading}
        />
      </div>

      {!loading && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button type="button" disabled={!dirty || saving} onClick={() => void saveChanges()}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
          {dirty && (
            <button
              type="button"
              disabled={saving}
              onClick={resetDraft}
              className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          {savedFlash && !dirty && <p className="text-sm text-emerald-700">Saved</p>}
        </div>
      )}

      {error && !loading && (
        <Alert variant="error" className="mt-3">
          {error}
        </Alert>
      )}
    </Card>
  );
}

/** Used in post-job form — typeahead with pill selection. */
export function PostJobInstrumentPicker({
  selectedId,
  onChange,
  disabled,
}: {
  selectedId: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
}) {
  return (
    <InstrumentTypeahead
      selectedId={selectedId}
      onChange={onChange}
      disabled={disabled}
      label="Instrument needed"
      hint="Start typing the part you need — pick from the suggestions."
    />
  );
}
