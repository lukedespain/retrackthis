"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCents, formatDeadline } from "@/lib/format";
import type { Job, Take } from "@/lib/types";
import { PostJobForm } from "./PostJobForm";

export function CreatorView() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [showPostForm, setShowPostForm] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  async function loadJobs() {
    const res = await fetch(`/api/jobs?mine=true`);
    setJobs(await res.json());
  }

  useEffect(() => {
    loadJobs();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">My jobs</h2>
          <p className="mt-0.5 text-sm text-gray-500">Manage your posted gigs and review takes</p>
        </div>
        {!showPostForm && (
          <Button onClick={() => setShowPostForm(true)} size="sm">
            Post a job
          </Button>
        )}
      </div>

      {showPostForm && (
        <div className="mt-8">
          <PostJobForm
            onCancel={() => setShowPostForm(false)}
            onPosted={() => {
              setShowPostForm(false);
              loadJobs();
            }}
          />
        </div>
      )}

      <div className="mt-8 space-y-4">
        {jobs === null && (
          <div className="flex justify-center py-16">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-accent" />
          </div>
        )}
        {jobs?.length === 0 && !showPostForm && (
          <EmptyState
            title="No jobs yet"
            description="Post your first gig to start receiving takes from musicians."
            action={
              <Button onClick={() => setShowPostForm(true)} size="sm">
                Post a job
              </Button>
            }
          />
        )}
        {jobs?.map((job) => (
          <CreatorJobCard
            key={job.id}
            job={job}
            expanded={expandedJobId === job.id}
            onToggle={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
            onChanged={loadJobs}
          />
        ))}
      </div>
    </div>
  );
}

function CreatorJobCard({
  job,
  expanded,
  onToggle,
  onChanged,
}: {
  job: Job;
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const isPastDeadline = job.status === "OPEN" && new Date(job.deadline).getTime() < Date.now();

  async function cancelJob(e: React.MouseEvent) {
    e.stopPropagation();
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}/cancel`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      onChanged();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-6 py-5">
        <button onClick={onToggle} className="flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-medium text-gray-900">{job.title}</span>
            <Badge status={job.status} />
          </div>
          <p className="mt-1.5 text-sm text-gray-500">
            {job.instrument} · {formatCents(job.priceCents)} · {formatDeadline(job.deadline)}
          </p>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {job.status === "OPEN" && (
            <Button variant="danger" size="sm" onClick={cancelJob} disabled={cancelling}>
              {cancelling ? "Cancelling…" : "Cancel & refund"}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onToggle}>
            {expanded ? "Hide takes" : "View takes"}
          </Button>
        </div>
      </div>

      {isPastDeadline && (
        <div className="border-t border-amber-100 bg-amber-50 px-6 py-3.5 text-sm leading-relaxed text-amber-800">
          Deadline passed with no winner picked yet. Choose a take below, or cancel for a full
          refund — this job will cancel itself automatically if left unattended.
        </div>
      )}

      {cancelError && (
        <p className="border-t border-gray-100 px-6 py-3 text-sm text-red-600">{cancelError}</p>
      )}

      {expanded && (
        <div className="border-t border-gray-100 bg-surface px-6 py-5">
          <TakesList jobId={job.id} jobOpen={job.status === "OPEN"} onAwarded={onChanged} />
        </div>
      )}
    </Card>
  );
}

function TakesList({
  jobId,
  jobOpen,
  onAwarded,
}: {
  jobId: string;
  jobOpen: boolean;
  onAwarded: () => void;
}) {
  const [takes, setTakes] = useState<Take[] | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadTakes() {
    const res = await fetch(`/api/jobs/${jobId}/takes`);
    setTakes(await res.json());
  }

  useEffect(() => {
    loadTakes();
  }, [jobId]);

  async function selectWinner(takeId: string) {
    setSelectingId(takeId);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/select-winner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ takeId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      await loadTakes();
      onAwarded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSelectingId(null);
    }
  }

  if (takes === null) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-accent" />
      </div>
    );
  }

  if (takes.length === 0) {
    return <p className="py-4 text-center text-sm text-gray-400">No takes submitted yet.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
        {takes.length} {takes.length === 1 ? "take" : "takes"}
      </p>
      {takes.map((take) => (
        <div
          key={take.id}
          className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">{take.musician.name}</span>
              {take.isWinner && <Badge status="AWARDED" />}
            </div>
            {take.note && <p className="mt-1 text-sm text-gray-500">{take.note}</p>}
            <audio controls src={take.audioFileUrl} className="mt-3 h-9 w-full max-w-sm" />
          </div>
          {jobOpen && !take.isWinner && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => selectWinner(take.id)}
              disabled={selectingId !== null}
              className="shrink-0"
            >
              {selectingId === take.id ? "Selecting…" : "Choose this one"}
            </Button>
          )}
        </div>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
