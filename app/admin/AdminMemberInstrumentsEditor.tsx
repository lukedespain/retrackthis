"use client";

import { useEffect, useMemo, useState } from "react";
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, saving]);

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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-edit-instruments-title"
        className="flex max-h-[min(40rem,calc(100dvh-2rem))] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h2
            id="admin-edit-instruments-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            Edit instruments
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {member.name} · {member.email}
          </p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Profile instruments drive job-alert emails when alerts are on.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <InstrumentMultiSelect
            label="Instruments they play"
            hint="Expand a category and pick each part they can record."
            selectedIds={draft}
            onChange={setDraft}
            disabled={saving}
            allowCustom
            triggerLabel="Select instruments"
          />
          {error && (
            <div className="mt-3">
              <Alert variant="error">{error}</Alert>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-gray-100 px-5 py-4 sm:flex-row sm:justify-end dark:border-gray-800">
          <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" size="sm" disabled={!dirty || saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save instruments"}
          </Button>
        </div>
      </div>
    </div>
  );
}
