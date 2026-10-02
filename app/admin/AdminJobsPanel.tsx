"use client";

import { useEffect, useMemo, useState } from "react";
import { EditJobForm } from "@/app/dashboard/EditJobForm";
import { ExtendDeadlineDialog } from "@/components/ExtendDeadlineDialog";
import { AdminActionsMenu, type AdminAction } from "./AdminActionsMenu";
import { TakeSubmissionFiles } from "@/components/TakeSubmissionFiles";
import { TestJobBadge } from "@/components/TestJobBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { formatDeadline } from "@/lib/format";
import { audioFiles, midiFiles } from "@/lib/takeFiles";
import type { Job, Take } from "@/lib/types";

export type AdminJobRow = Job & {
  creator: { id: string; name: string; email: string };
  priceLabel: string;
  paymentStatus: string | null;
  missingBacking: boolean;
  flexibleTempo: boolean;
  takeCount?: number;
  needsManualPayout?: boolean;
  winnerPayout?: {
    musicianName: string;
    musicianEmail: string;
    provider: string | null;
    providerLabel: string;
    payoutEmail: string | null;
    payoutAccountName: string | null;
    payoutLabel: string;
    payoutCents: number;
    hasStripe: boolean;
  } | null;
};

export function AdminJobsPanel({
  jobs,
  onChanged,
}: {
  jobs: AdminJobRow[];
  onChanged: () => void;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"OPEN" | "manual" | "all">("OPEN");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [listeningId, setListeningId] = useState<string | null>(null);
  const [payoutJobId, setPayoutJobId] = useState<string | null>(null);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notifyJobId, setNotifyJobId] = useState<string | null>(null);
  const [notifyMessage, setNotifyMessage] = useState<string | null>(null);
  const [extendingId, setExtendingId] = useState<string | null>(null);

  const manualCount = useMemo(
    () => jobs.filter((j) => j.needsManualPayout).length,
    [jobs]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((job) => {
      if (statusFilter === "OPEN" && job.status !== "OPEN") return false;
      if (statusFilter === "manual" && !job.needsManualPayout) return false;
      if (!q) return true;
      return (
        job.title.toLowerCase().includes(q) ||
        job.creator.name.toLowerCase().includes(q) ||
        job.creator.email.toLowerCase().includes(q) ||
        job.instrument.toLowerCase().includes(q) ||
        (job.winnerPayout?.payoutEmail ?? "").toLowerCase().includes(q) ||
        (job.winnerPayout?.musicianName ?? "").toLowerCase().includes(q)
      );
    });
  }, [jobs, query, statusFilter]);

  const editingJob = editingId ? jobs.find((j) => j.id === editingId) : null;
  const listeningJob = listeningId ? jobs.find((j) => j.id === listeningId) : null;

  async function completePayout(jobId: string, markOnly = false) {
    setPayoutJobId(jobId);
    setPayoutError(null);
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/complete-payout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markOnly }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
      onChanged();
    } catch (err) {
      setPayoutError(err instanceof Error ? err.message : "Payout failed");
    } finally {
      setPayoutJobId(null);
    }
  }

  async function purgeJob(job: AdminJobRow) {
    const ok = window.confirm(
      `Permanently delete “${job.title}” and its payment/takes from the database?\n\nThis does not refund Stripe. Use only for test junk you already cancelled/refunded.`
    );
    if (!ok) return;
    setDeletingId(job.id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/jobs/${job.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `Delete failed (${res.status})`);
      if (editingId === job.id) setEditingId(null);
      if (listeningId === job.id) setListeningId(null);
      onChanged();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  async function resendAlerts(job: AdminJobRow) {
    const ok = window.confirm(
      `Re-send “new job” emails for “${job.title}” to musicians matching ${job.instrument}?`
    );
    if (!ok) return;
    setNotifyJobId(job.id);
    setNotifyMessage(null);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/jobs/${job.id}/notify-alerts`, {
        method: "POST",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `Notify failed (${res.status})`);
      setNotifyMessage(
        `Sent alerts for “${job.title}” to ${body.recipientCount ?? "?"} matching musician(s).`
      );
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Notify failed");
    } finally {
      setNotifyJobId(null);
    }
  }

  const extendingJob = extendingId ? jobs.find((j) => j.id === extendingId) : null;

  function busyLabelFor(jobId: string): string | null {
    if (notifyJobId === jobId) return "Sending…";
    if (payoutJobId === jobId) return "Saving payout…";
    if (deletingId === jobId) return "Deleting…";
    return null;
  }

  function actionsFor(job: AdminJobRow, takeCount: number): AdminAction[] {
    const busy = busyLabelFor(job.id) !== null;
    const actions: AdminAction[] = [
      {
        label: "Preview as producer",
        href: `/admin/preview/producer/${job.creator.id}?job=${job.id}`,
      },
      {
        label: listeningId === job.id ? "Stop listening" : "Listen to takes",
        onClick: () => setListeningId(listeningId === job.id ? null : job.id),
        disabled: takeCount === 0,
        hint: takeCount === 0 ? "No takes yet" : undefined,
      },
    ];

    if (job.status === "OPEN") {
      actions.push({
        label: editingId === job.id ? "Close editor" : "Edit job",
        onClick: () => setEditingId(editingId === job.id ? null : job.id),
      });
      if (job.paymentStatus === "captured" && new Date(job.deadline).getTime() > Date.now()) {
        actions.push({
          label: "Extend deadline",
          onClick: () => {
            setNotifyMessage(null);
            setDeleteError(null);
            setExtendingId(job.id);
          },
        });
      }
      if (!job.isTest) {
        actions.push({
          label: "Resend alerts",
          onClick: () => void resendAlerts(job),
          disabled: busy,
        });
      }
    } else if (job.needsManualPayout) {
      actions.push({
        label: "Mark paid",
        hint: "After you send via PayPal/Wise",
        onClick: () => void completePayout(job.id, true),
        disabled: busy,
      });
    } else if (job.status === "AWARDED" && job.paymentStatus === "captured") {
      actions.push(
        {
          label: "Complete payout",
          onClick: () => void completePayout(job.id, false),
          disabled: busy,
        },
        {
          label: "Mark transferred",
          onClick: () => void completePayout(job.id, true),
          disabled: busy,
        }
      );
    }

    actions.push({
      label: "Delete",
      danger: true,
      onClick: () => void purgeJob(job),
      disabled: busy,
    });
    return actions;
  }

  return (
    <section className="space-y-4">
      {extendingJob && (
        <ExtendDeadlineDialog
          job={extendingJob}
          onBehalfOf={extendingJob.creator.name}
          onClose={() => setExtendingId(null)}
          onExtended={({ days, notified }) => {
            setExtendingId(null);
            setNotifyMessage(
              `Extended “${extendingJob.title}” by ${days === 1 ? "1 day" : `${days} days`} and emailed ${notified} musician(s).`
            );
            onChanged();
          }}
        />
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">
          Edit open jobs, listen to takes, and clear PayPal/Wise payouts waiting on founders.
          {manualCount > 0 ? (
            <>
              {" "}
              <button
                type="button"
                className="font-medium text-amber-800 underline underline-offset-2"
                onClick={() => setStatusFilter("manual")}
              >
                {manualCount} waiting on manual payout
              </button>
              .
            </>
          ) : null}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "OPEN" | "manual" | "all")}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="OPEN">Open only</option>
            <option value="manual">Needs manual payout</option>
            <option value="all">All statuses</option>
          </select>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, creator, instrument…"
            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 outline-none ring-accent/30 placeholder:text-gray-400 focus:ring-2 sm:max-w-xs"
          />
        </div>
      </div>

      {payoutError && (
        <p className="text-sm text-red-600">{payoutError}</p>
      )}
      {deleteError && (
        <p className="text-sm text-red-600">{deleteError}</p>
      )}
      {notifyMessage && (
        <p className="text-sm text-emerald-700">{notifyMessage}</p>
      )}

      {editingJob && editingJob.status === "OPEN" && (
        <EditJobForm
          key={editingJob.id}
          job={editingJob}
          adminAs={{
            name: editingJob.creator.name,
            email: editingJob.creator.email,
            priceLabel: editingJob.priceLabel,
          }}
          onCancel={() => setEditingId(null)}
          onSaved={() => {
            setEditingId(null);
            onChanged();
          }}
        />
      )}

      {listeningJob && (
        <Card padding="md" className="border border-gray-100">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Takes · {listeningJob.title}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Posted by {listeningJob.creator.name}. Listen only. Picking stays with the creator.
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setListeningId(null)}>
              Close
            </Button>
          </div>
          <div className="mt-5">
            <AdminTakesList
              jobId={listeningJob.id}
              jobOpen={listeningJob.status === "OPEN"}
              jobBackingUrl={listeningJob.backingFileUrl}
            />
          </div>
        </Card>
      )}

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="min-w-full bg-white text-left text-sm">
          <thead className="border-b border-gray-200 bg-white text-xs uppercase tracking-wide text-gray-500">
            <tr className="bg-white">
              <th className="px-4 py-3 font-medium">Job</th>
              <th className="px-4 py-3 font-medium">Creator</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Takes</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filtered.length === 0 ? (
              <tr className="bg-white">
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">
                  No jobs match.
                </td>
              </tr>
            ) : (
              filtered.map((job) => {
                const takeCount = job.takeCount ?? 0;
                return (
                  <tr key={job.id} className="bg-white align-top hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div
                        className="max-w-[11rem] truncate font-medium text-gray-900"
                        title={job.title}
                      >
                        {job.title}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge status={job.status} />
                        {job.isTest && <TestJobBadge />}
                        {job.status === "OPEN" && job.hasSelectedWinner && (
                          <Badge status="PICKED" />
                        )}
                        <span className="text-xs text-gray-500">{job.instrument}</span>
                      </div>
                      {job.status === "OPEN" && (
                        <div className="mt-1 text-[11px] text-gray-400">
                          {formatDeadline(job.deadline, { extended: Boolean(job.deadlineExtendedAt) })}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900">{job.creator.name}</div>
                      <div className="text-xs text-gray-500">{job.creator.email}</div>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-gray-700">
                      {job.priceLabel}
                      {job.needsManualPayout && job.winnerPayout && (
                        <div className="mt-1.5 max-w-[14rem] rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] leading-snug text-amber-900">
                          <div className="font-medium">
                            Send {job.winnerPayout.payoutLabel} via{" "}
                            {job.winnerPayout.providerLabel}
                          </div>
                          <div className="mt-0.5 truncate">
                            {job.winnerPayout.payoutAccountName ?? job.winnerPayout.musicianName}
                          </div>
                          <div className="truncate">{job.winnerPayout.payoutEmail}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-gray-700">
                      {takeCount}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {busyLabelFor(job.id) && (
                          <span className="text-xs text-gray-400">{busyLabelFor(job.id)}</span>
                        )}
                        <AdminActionsMenu actions={actionsFor(job, takeCount)} />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AdminTakesList({
  jobId,
  jobOpen,
  jobBackingUrl = null,
}: {
  jobId: string;
  jobOpen: boolean;
  jobBackingUrl?: string | null;
}) {
  const [takes, setTakes] = useState<Take[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setTakes(null);
    setError(null);
    fetch(`/api/jobs/${jobId}/takes`)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? `Could not load takes (${res.status})`);
        if (!cancelled) setTakes(Array.isArray(body) ? body : []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load takes");
          setTakes([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  if (takes === null) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="sm" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (takes.length === 0) {
    return (
      <EmptyState
        title="No takes yet"
        description="Musicians haven’t submitted anything on this job."
      />
    );
  }

  const visibleTakes = jobOpen ? takes : takes.filter((take) => take.isWinner);
  if (visibleTakes.length === 0) {
    return (
      <EmptyState title="No picked take" description="This job closed without a selected take." />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
        {takes.length} {takes.length === 1 ? "submission" : "submissions"}
        {!jobOpen ? " · showing the pick only" : ""}
      </p>
      {visibleTakes.map((take) => {
        const audioCount = take.files?.length ? audioFiles(take.files).length : 1;
        const hasMidi = take.files?.length ? midiFiles(take.files).length > 0 : false;
        return (
          <Card
            key={take.id}
            padding="sm"
            className={take.isWinner ? "ring-2 ring-accent/20 bg-accent-muted/30" : ""}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-900">
                {take.musician.name}
              </span>
              {take.isWinner && <Badge status={jobOpen ? "PICKED" : "AWARDED"} />}
              {audioCount > 1 && (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {audioCount} files
                </span>
              )}
              {hasMidi && (
                <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-100">
                  MIDI included
                </span>
              )}
            </div>
            {take.note && (
              <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{take.note}</p>
            )}
            <div className="mt-3">
              <TakeSubmissionFiles
                files={take.files}
                fallbackAudioUrl={take.audioFileUrl}
                allowDownload
                collapsible={audioCount > 1}
                backingSrc={jobBackingUrl}
              />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
