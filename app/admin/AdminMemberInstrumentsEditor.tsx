"use client";

import { useMemo, useState } from "react";
import { InstrumentMultiSelect } from "@/components/InstrumentMultiSelect";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

type MemberInstruments = {
  id: string;
  name: string;
  email: string;
  instruments: Array<{ id: string; label: string }>;
};

type Props = {
  member: MemberInstruments;
  onSaved: (instruments: Array<{ id: string; label: string }>) => void;
  onClose: () => void;
};

function sameIds(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((id, index) => id === right[index]);
}

export function AdminMemberInstrumentsEditor({ member, onSaved, onClose }: Props) {
  const initialIds = useMemo(() => member.instruments.map((i) => i.id), [member.instruments]);
  const [draft, setDraft] = useState(initialIds);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = !sameIds(draft, initialIds);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/members/${member.id}/instruments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruments: draft }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not save instruments");
      onSaved(body.instruments ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save instruments");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-accent/20 bg-accent-muted/40 p-4 dark:bg-accent/10">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Edit instruments · {member.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            These are profile instruments. Job alert emails use this list when alerts are on.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          Close
        </button>
      </div>

      <div className="mt-4">
        <InstrumentMultiSelect
          label="Instruments they play"
          hint="Expand a category and pick each part they can record."
          selectedIds={draft}
          onChange={setDraft}
          disabled={saving}
          allowCustom
          triggerLabel="Select instruments"
        />
      </div>

      {error && (
        <div className="mt-3">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={!dirty || saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save instruments"}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
