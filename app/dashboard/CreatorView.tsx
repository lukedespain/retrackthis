"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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
        <h2 className="text-lg font-medium text-gray-900">My jobs</h2>
        {!showPostForm && <Button onClick={() => setShowPostForm(true)}>Post a job</Button>}
      </div>

      {showPostForm && (
        <div className="mt-4">
          <PostJobForm
            onCancel={() => setShowPostForm(false)}
            onPosted={() => {
              setShowPostForm(false);
              loadJobs();
            }}
          />
        </div>
      )}

      <div className="mt-6 space-y-3">
        {jobs === null && <p className="text-sm text-gray-400">Loading…</p>}
        {jobs?.length === 0 && !showPostForm && (
          <p className="text-sm text-gray-400">No jobs yet — post one to get started.</p>
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

  async function cancelJob() {
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
    <div className="rounded-2xl border border-gray-200">
      <div className="flex w-full items-center justify-between px-6 py-4">
        <button onClick={onToggle} className="flex-1 text-left">
          <div className="flex items-center gap-2.5">
            <span className="font-medium text-gray-900">{job.title}</span>
            <Badge status={job.status} />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {job.instrument} · {formatCents(job.priceCents)} · {formatDeadline(job.deadline)}
          </p>
        </button>
        <div className="flex items-center gap-4">
          {job.status === "OPEN" && (
            <button
              onClick={cancelJob}
              disabled={cancelling}
              className="text-sm text-gray-400 hover:text-red-600 disabled:opacity-50"
            >
              {cancelling ? "Cancelling…" : "Cancel & refund"}
            </button>
          )}
          <button onClick={onToggle} className="text-sm text-gray-400">
            {expanded ? "Hide takes" : "View takes"}
          </button>
        </div>
      </div>

      {isPastDeadline && (
        <div className="border-t border-amber-100 bg-amber-50 px-6 py-3 text-sm text-amber-800">
          Deadline passed with no winner picked yet. Choose a take below, or cancel for a full refund —
          this job will cancel itself automatically if left unattended.
        </div>
      )}

      {cancelError && <p className="px-6 py-2 text-sm text-red-600">{cancelError}</p>}

      {expanded && (
        <div className="border-t border-gray-100 px-6 py-4">
          <TakesList jobId={job.id} jobOpen={job.status === "OPEN"} onAwarded={onChanged} />
        </div>
      )}
    </div>
  );
}

function TakesList({ jobId, jobOpen, onAwarded }: { jobId: string; jobOpen: boolean; onAwarded: () => void }) {
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

  if (takes === null) return <p className="text-sm text-gray-400">Loading takes…</p>;
  if (takes.length === 0) return <p className="text-sm text-gray-400">No takes submitted yet.</p>;

  return (
    <div className="space-y-3">
      {takes.map((take) => (
        <div key={take.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">{take.musician.name}</span>
              {take.isWinner && <Badge status="AWARDED" />}
            </div>
            {take.note && <p className="mt-0.5 text-sm text-gray-500">{take.note}</p>}
            <audio controls src={take.audioFileUrl} className="mt-2 h-9 w-72" />
          </div>
          {jobOpen && !take.isWinner && (
            <Button
              variant="secondary"
              onClick={() => selectWinner(take.id)}
              disabled={selectingId !== null}
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
