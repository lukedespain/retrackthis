"use client";

import { useEffect, useState, type ReactNode } from "react";
import { INSTRUMENT_GROUPS } from "@/lib/instruments";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Spinner } from "@/components/ui/Spinner";

type Status = "PENDING" | "APPROVED" | "DENIED";

type Person = { id: string; name: string; email: string };

type InstrumentRow = {
  id: string;
  label: string;
  groupId: string | null;
  status: Status;
  adminNote: string | null;
  instrumentId: string | null;
  createdAt: string;
  user: Person;
};

type FeatureRow = {
  id: string;
  title: string;
  details: string;
  status: Status;
  adminNote: string | null;
  createdAt: string;
  user: Person;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function statusLabel(status: Status) {
  if (status === "APPROVED") return "Accepted";
  if (status === "DENIED") return "Denied";
  return "Pending";
}

export function AdminRequestsPanel() {
  const [instruments, setInstruments] = useState<InstrumentRow[] | null>(null);
  const [features, setFeatures] = useState<FeatureRow[] | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [groupFor, setGroupFor] = useState<Record<string, string>>({});
  const [noteFor, setNoteFor] = useState<Record<string, string>>({});
  const [denyFor, setDenyFor] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/suggestions");
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.error ?? "Could not load requests");
    setInstruments(body.instruments);
    setFeatures(body.features);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load requests"));
  }, []);

  async function review(
    kind: "instrument" | "feature",
    id: string,
    action: "approve" | "deny",
    extra?: { groupId?: string }
  ) {
    const note = (noteFor[id] ?? "").trim();
    if (action === "deny" && note.length < 2) {
      setError("Add a short note explaining why.");
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/suggestions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id, action, note, groupId: extra?.groupId }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not save that review");
      setDenyFor(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that review");
    } finally {
      setBusyId(null);
    }
  }

  if (!instruments || !features) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const show = (status: Status) => filter === "all" || status === "PENDING";
  const instrumentRows = instruments.filter((row) => show(row.status));
  const featureRows = features.filter((row) => show(row.status));
  const pendingInstruments = instruments.filter((row) => row.status === "PENDING").length;
  const pendingFeatures = features.filter((row) => row.status === "PENDING").length;

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">
          {pendingInstruments} instrument suggestion{pendingInstruments === 1 ? "" : "s"} · {pendingFeatures} feature request
          {pendingFeatures === 1 ? "" : "s"} waiting
        </p>
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          options={[
            { value: "pending", label: "Pending" },
            { value: "all", label: "All" },
          ]}
        />
      </div>

      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Instrument suggestions</h2>
        <p className="text-sm text-gray-500">
          Approve adds the instrument to the site and to the person’s “What you play” list.
        </p>
        <RequestTable
          empty="No instrument suggestions."
          rows={instrumentRows.map((row) => ({
            id: row.id,
            title: row.label,
            meta: `${row.user.name} · ${row.user.email} · ${formatDate(row.createdAt)}`,
            body: row.groupId ? `Suggested group: ${INSTRUMENT_GROUPS.find((group) => group.id === row.groupId)?.label ?? row.groupId}` : null,
            status: row.status,
            note: row.adminNote,
            pending: row.status === "PENDING" && (
              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                <select
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                  value={groupFor[row.id] ?? row.groupId ?? "world"}
                  onChange={(e) => setGroupFor((prev) => ({ ...prev, [row.id]: e.target.value }))}
                >
                  {INSTRUMENT_GROUPS.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.label}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    className="btn primary"
                    style={{ height: 34, fontSize: 13 }}
                    disabled={busyId === row.id}
                    onClick={() =>
                      void review("instrument", row.id, "approve", {
                        groupId: groupFor[row.id] ?? row.groupId ?? "world",
                      })
                    }
                  >
                    {busyId === row.id ? "Saving…" : "Add to the site"}
                  </button>
                  <button
                    type="button"
                    className="btn soft"
                    style={{ height: 34, fontSize: 13 }}
                    onClick={() => setDenyFor(denyFor === row.id ? null : row.id)}
                  >
                    Deny
                  </button>
                </div>
                {denyFor === row.id ? (
                  <DenyNote
                    value={noteFor[row.id] ?? ""}
                    busy={busyId === row.id}
                    onChange={(value) => setNoteFor((prev) => ({ ...prev, [row.id]: value }))}
                    onDeny={() => void review("instrument", row.id, "deny")}
                  />
                ) : null}
              </div>
            ),
          }))}
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Feature requests</h2>
        <p className="text-sm text-gray-500">Accept or deny, and leave a note the person can read in Settings.</p>
        <RequestTable
          empty="No feature requests."
          rows={featureRows.map((row) => ({
            id: row.id,
            title: row.title,
            meta: `${row.user.name} · ${row.user.email} · ${formatDate(row.createdAt)}`,
            body: row.details,
            status: row.status,
            note: row.adminNote,
            pending: row.status === "PENDING" && (
              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                <textarea
                  className="w-full min-w-[220px] rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm sm:w-72"
                  rows={2}
                  placeholder="Note for them (required to deny)"
                  value={noteFor[row.id] ?? ""}
                  onChange={(e) => setNoteFor((prev) => ({ ...prev, [row.id]: e.target.value }))}
                />
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    className="btn primary"
                    style={{ height: 34, fontSize: 13 }}
                    disabled={busyId === row.id}
                    onClick={() => void review("feature", row.id, "approve")}
                  >
                    {busyId === row.id ? "Saving…" : "Accept"}
                  </button>
                  <button
                    type="button"
                    className="btn soft"
                    style={{ height: 34, fontSize: 13 }}
                    disabled={busyId === row.id}
                    onClick={() => void review("feature", row.id, "deny")}
                  >
                    Deny
                  </button>
                </div>
              </div>
            ),
          }))}
        />
      </div>
    </section>
  );
}

function DenyNote({
  value,
  busy,
  onChange,
  onDeny,
}: {
  value: string;
  busy: boolean;
  onChange: (value: string) => void;
  onDeny: () => void;
}) {
  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <textarea
        className="w-full min-w-[220px] rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm sm:w-72"
        rows={2}
        placeholder="Why not?"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="button" className="btn soft" style={{ height: 34, fontSize: 13 }} disabled={busy} onClick={onDeny}>
        Confirm deny
      </button>
    </div>
  );
}

function RequestTable({
  rows,
  empty,
}: {
  empty: string;
  rows: Array<{
    id: string;
    title: string;
    meta: string;
    body: string | null;
    status: Status;
    note: string | null;
    pending: ReactNode;
  }>;
}) {
  if (rows.length === 0) {
    return <p className="rounded-2xl border border-gray-200 bg-white px-4 py-8 text-sm text-gray-500">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
      <table className="min-w-full bg-white text-left text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-gray-200 align-top last:border-b-0">
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{row.title}</div>
                <div className="mt-0.5 text-xs text-gray-500">{row.meta}</div>
                {row.body ? <p className="mt-2 max-w-xl whitespace-pre-wrap text-sm text-gray-700">{row.body}</p> : null}
                {row.note ? <p className="mt-2 text-sm text-gray-600">Note: {row.note}</p> : null}
              </td>
              <td className="px-4 py-3 text-right">
                {row.pending || <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{statusLabel(row.status)}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
