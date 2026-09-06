"use client";

import { useEffect, useMemo, useState } from "react";
import { EditJobForm } from "@/app/dashboard/EditJobForm";
import { TakeSubmissionFiles } from "@/components/TakeSubmissionFiles";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { audioFiles, midiFiles } from "@/lib/takeFiles";
import type { Job, Take } from "@/lib/types";

export type AdminJobRow = Job & {
  creator: { id: string; name: string; email: string };
  priceLabel: string;
  paymentStatus: string | null;
  missingBacking: boolean;
  flexibleTempo: boolean;
  takeCount?: number;
};

export function AdminJobsPanel({
  jobs,
  onChanged,
}: {
  jobs: AdminJobRow[];
  onChanged: () => void;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"OPEN" | "all">("OPEN");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [listeningId, setListeningId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((job) => {
      if (statusFilter !== "all" && job.status !== statusFilter) return false;
      if (!q) return true;
      return (
        job.title.toLowerCase().includes(q) ||
        job.creator.name.toLowerCase().includes(q) ||
        job.creator.email.toLowerCase().includes(q) ||
        job.instrument.toLowerCase().includes(q)
      );
    });
  }, [jobs, query, statusFilter]);

  const editingJob = editingId ? jobs.find((j) => j.id === editingId) : null;
  const listeningJob = listeningId ? jobs.find((j) => j.id === listeningId) : null;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Edit open jobs on behalf of creators, and listen to submitted takes. Price and payment stay
          locked.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "OPEN" | "all")}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
          >
            <option value="OPEN">Open only</option>
            <option value="all">All statuses</option>
          </select>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, creator, instrument…"
            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 outline-none ring-accent/30 placeholder:text-gray-400 focus:ring-2 sm:max-w-xs dark:border-gray-700 dark:bg-gray-950 dark:text-white"
          />
        </div>
      </div>

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
        <Card padding="md" className="border border-gray-100 dark:border-gray-800">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Takes · {listeningJob.title}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Posted by {listeningJob.creator.name}. Listen only. Awarding stays with the creator.
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setListeningId(null)}>
              Close
            </Button>
          </div>
          <div className="mt-5">
            <AdminTakesList jobId={listeningJob.id} jobOpen={listeningJob.status === "OPEN"} />
          </div>
        </Card>
      )}

      <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900/80 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Job</th>
              <th className="px-4 py-3 font-medium">Creator</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Setup</th>
              <th className="px-4 py-3 font-medium">Takes</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                  No jobs match.
                </td>
              </tr>
            ) : (
              filtered.map((job) => {
                const takeCount = job.takeCount ?? 0;
                return (
                  <tr key={job.id} className="align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{job.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge status={job.status} />
                        <span className="text-xs text-gray-500">{job.instrument}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900 dark:text-white">{job.creator.name}</div>
                      <div className="text-xs text-gray-500">{job.creator.email}</div>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-gray-700 dark:text-gray-300">
                      {job.priceLabel}
                      <div className="text-[11px] text-gray-400">Locked</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {job.missingBacking ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                            Needs background
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            Has background
                          </span>
                        )}
                        {job.flexibleTempo ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                            Flexible tempo
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                            {job.bpm} BPM
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-gray-700 dark:text-gray-300">
                      {takeCount}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          size="sm"
                          variant={listeningId === job.id ? "secondary" : "ghost"}
                          onClick={() => setListeningId(listeningId === job.id ? null : job.id)}
                          disabled={takeCount === 0}
                        >
                          {listeningId === job.id ? "Listening…" : "Listen"}
                        </Button>
                        {job.status === "OPEN" ? (
                          <Button
                            size="sm"
                            variant={editingId === job.id ? "secondary" : "ghost"}
                            onClick={() => setEditingId(editingId === job.id ? null : job.id)}
                          >
                            {editingId === job.id ? "Editing…" : "Edit"}
                          </Button>
                        ) : (
                          <span className="self-center text-xs text-gray-400">Closed</span>
                        )}
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

function AdminTakesList({ jobId, jobOpen }: { jobId: string; jobOpen: boolean }) {
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
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
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
      <EmptyState title="No awarded take" description="This job closed without a selected take." />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
        {takes.length} {takes.length === 1 ? "take" : "takes"}
        {!jobOpen ? " · showing winner only" : ""}
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
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {take.musician.name}
              </span>
              {take.isWinner && <Badge status="AWARDED" />}
              {audioCount > 1 && (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  {audioCount} files
                </span>
              )}
              {hasMidi && (
                <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300">
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
              />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
