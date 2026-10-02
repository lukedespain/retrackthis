"use client";

import { useEffect, useState } from "react";

type Musician = { id: string; name: string; email: string };
type JobRow = { id: string; title: string; status: string };
type Alternative = { id: string; label: string; groupLabel: string };

type Detail = {
  id: string;
  label: string;
  groupLabel: string;
  musicians: Musician[];
  musicianCount: number;
  activeJobs: JobRow[];
  alternatives: Alternative[];
};

type Confirm =
  | { kind: "rename"; musicianCount: number }
  | { kind: "profiles"; musicianCount: number }
  | { kind: "jobs"; musicianCount: number; jobs: JobRow[] }
  | null;

function jobStatus(status: string) {
  if (status === "OPEN") return "Open";
  if (status === "AWARDING") return "Picking a winner";
  if (status === "PENDING_PAYMENT") return "Waiting for payment";
  return status;
}

export function AdminInstrumentEditor({
  instrumentId,
  onClose,
  onChanged,
}: {
  instrumentId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [replacementId, setReplacementId] = useState("");

  useEffect(() => {
    let cancel = false;
    fetch(`/api/admin/instruments/${encodeURIComponent(instrumentId)}`)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? "Could not load this instrument");
        return body as Detail;
      })
      .then((body) => {
        if (cancel) return;
        setDetail(body);
        setName(body.label);
        setReplacementId(body.alternatives[0]?.id ?? "");
      })
      .catch((err) => {
        if (!cancel) setError(err instanceof Error ? err.message : "Could not load this instrument");
      });
    return () => {
      cancel = true;
    };
  }, [instrumentId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape" || saving) return;
      if (confirm) {
        setConfirm(null);
        return;
      }
      onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, confirm, saving]);

  async function save(acknowledgeProfiles = false) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/instruments/${encodeURIComponent(instrumentId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: name, acknowledgeProfiles }),
      });
      const body = await res.json().catch(() => null);
      if (res.status === 409 && body?.code === "profiles") {
        setConfirm({ kind: "rename", musicianCount: body.musicianCount ?? detail?.musicianCount ?? 0 });
        return;
      }
      if (!res.ok) throw new Error(body?.error ?? "Could not save that name");
      setConfirm(null);
      onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that name");
    } finally {
      setSaving(false);
    }
  }

  async function remove(acknowledgeProfiles = false, nextId?: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/instruments/${encodeURIComponent(instrumentId)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acknowledgeProfiles,
          replacementId: nextId || undefined,
        }),
      });
      const body = await res.json().catch(() => null);
      if (res.status === 409 && body?.code === "jobs") {
        setConfirm({
          kind: "jobs",
          musicianCount: body.musicianCount ?? 0,
          jobs: Array.isArray(body.jobs) ? body.jobs : detail?.activeJobs ?? [],
        });
        return;
      }
      if (res.status === 409 && body?.code === "profiles") {
        setConfirm({ kind: "profiles", musicianCount: body.musicianCount ?? detail?.musicianCount ?? 0 });
        return;
      }
      if (!res.ok) throw new Error(body?.error ?? "Could not delete that instrument");
      setConfirm(null);
      onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete that instrument");
    } finally {
      setSaving(false);
    }
  }

  const people = detail?.musicianCount ?? 0;
  const personLine =
    people === 1 ? "1 person has this on their profile." : `${people} people have this on their profile.`;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-6"
      role="presentation"
      onClick={() => {
        if (!saving && !confirm) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="instrument-editor-title"
        className="flex max-h-[min(40rem,calc(100dvh-1.5rem))] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
          <div>
            <h2 id="instrument-editor-title" className="text-lg font-medium text-gray-900">
              {detail?.label ?? "Instrument"}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">{detail?.groupLabel ?? "Loading…"}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error ? <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <label className="block text-xs font-medium uppercase tracking-wide text-gray-500" htmlFor="instrument-name">
            Name
          </label>
          <input
            id="instrument-name"
            className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 outline-none ring-accent/30 focus:ring-2"
            value={name}
            maxLength={48}
            disabled={!detail || saving}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="mt-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Musicians</h3>
            <span className="text-xs tabular-nums text-gray-400">{detail ? detail.musicianCount : ""}</span>
          </div>
          <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-gray-200">
            {!detail ? (
              <p className="px-3 py-6 text-sm text-gray-500">Loading…</p>
            ) : detail.musicians.length === 0 ? (
              <p className="px-3 py-6 text-sm text-gray-500">No one has this on their profile.</p>
            ) : (
              <ul>
                {detail.musicians.map((musician) => (
                  <li key={musician.id} className="border-b border-gray-200 px-3 py-2.5 last:border-b-0">
                    <div className="text-sm text-gray-900">{musician.name}</div>
                    <div className="text-xs text-gray-500">{musician.email}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            className="text-sm font-medium text-red-700 hover:underline disabled:opacity-50"
            disabled={!detail || saving}
            onClick={() => void remove(false)}
          >
            Delete
          </button>
          <button
            type="button"
            className="rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
            disabled={!detail || saving || name.trim() === detail.label}
            onClick={() => void save(false)}
          >
            {saving ? "Saving…" : "Save name"}
          </button>
        </div>
      </div>

      {confirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {confirm.kind === "rename" ? (
              <p className="text-sm leading-relaxed text-gray-900">
                {confirm.musicianCount === 1
                  ? "1 person has this on their profile."
                  : `${confirm.musicianCount} people have this on their profile.`}{" "}
                The new name shows for them too.
              </p>
            ) : null}
            {confirm.kind === "profiles" ? (
              <p className="text-sm leading-relaxed text-gray-900">
                {personLine} Deleting it takes it off those profiles.
              </p>
            ) : null}
            {confirm.kind === "jobs" ? (
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-gray-900">
                  Careful — this is on {confirm.jobs.length === 1 ? "an active job" : `${confirm.jobs.length} active jobs`}.
                  If you delete it, what should {confirm.jobs.length === 1 ? "that job" : "those jobs"} say instead?
                </p>
                <ul className="max-h-28 overflow-y-auto text-sm text-gray-600">
                  {confirm.jobs.map((job) => (
                    <li key={job.id}>
                      {job.title} <span className="text-gray-400">· {jobStatus(job.status)}</span>
                    </li>
                  ))}
                </ul>
                <select
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                  value={replacementId}
                  onChange={(e) => setReplacementId(e.target.value)}
                >
                  {(detail?.alternatives ?? []).map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {confirm.musicianCount > 0 ? (
                  <p className="text-sm leading-relaxed text-gray-600">
                    {confirm.musicianCount === 1
                      ? "1 person also has this on their profile. Deleting removes it there."
                      : `${confirm.musicianCount} people also have this on their profile. Deleting removes it there.`}
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setConfirm(null)}
                className="rounded-full px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || (confirm.kind === "jobs" && !replacementId)}
                onClick={() => {
                  if (confirm.kind === "rename") void save(true);
                  else if (confirm.kind === "profiles") void remove(true);
                  else void remove(true, replacementId);
                }}
                className="rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
              >
                {saving ? "Saving…" : confirm.kind === "rename" ? "Save anyway" : "Delete anyway"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
