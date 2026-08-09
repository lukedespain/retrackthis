"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { AudioPlayer } from "@/components/AudioPlayer";
import { JobMetaTags, TempoTag } from "@/components/JobMetaTags";
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">My jobs</h2>
          <p className="mt-0.5 text-sm text-gray-500">Manage your posted gigs and review takes</p>
        </div>
        {!showPostForm && (
          <Button onClick={() => setShowPostForm(true)} size="sm" className="w-full sm:w-auto">
            Post a job
          </Button>
        )}
      </div>

      {showPostForm && (
        <div className="mt-6 sm:mt-8">
          <PostJobForm
            onCancel={() => setShowPostForm(false)}
            onPosted={() => {
              setShowPostForm(false);
              loadJobs();
            }}
          />
        </div>
      )}

      <div className="mt-6 space-y-3 sm:mt-8 sm:space-y-4">
        {jobs === null && (
          <div className="flex justify-center py-16">
            <Spinner />
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
      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:py-5">
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 rounded-lg"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-gray-900">{job.title}</span>
            <Badge status={job.status} />
          </div>
          <div className="mt-2.5">
            <JobMetaTags
              instrument={job.instrument}
              priceCents={job.priceCents}
              deadline={job.deadline}
            />
          </div>
        </button>
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {job.status === "OPEN" && (
            <Button
              variant="danger"
              size="sm"
              onClick={cancelJob}
              disabled={cancelling}
              className="flex-1 sm:flex-none"
            >
              {cancelling ? "Cancelling…" : "Cancel & refund"}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onToggle} className="flex-1 sm:flex-none">
            {expanded ? "Hide takes" : "View takes"}
          </Button>
        </div>
      </div>

      {isPastDeadline && (
        <div className="border-t border-gray-100 px-4 py-3 sm:px-6">
          <Alert variant="warning">
            Deadline passed with no winner picked yet. Choose a take below, or cancel for a full
            refund. This job will cancel itself automatically if left unattended.
          </Alert>
        </div>
      )}

      {cancelError && (
        <div className="border-t border-gray-100 px-4 py-3 sm:px-6">
          <Alert variant="error">{cancelError}</Alert>
        </div>
      )}

      <div
        className={`grid transition-all duration-200 ease-out ${
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-gray-100 bg-surface px-4 py-4 sm:px-6 sm:py-5">
            {job.description && (
              <p className="text-sm leading-relaxed text-gray-600">{job.description}</p>
            )}
            <div className={job.description ? "mt-3 mb-4" : "mb-4"}>
              <TempoTag bpm={job.bpm} />
            </div>
            <TakesList jobId={job.id} jobOpen={job.status === "OPEN"} onAwarded={onChanged} />
          </div>
        </div>
      </div>
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
        <Spinner size="sm" />
      </div>
    );
  }

  if (takes.length === 0) {
    return (
      <EmptyState
        title="No takes yet"
        description="Musicians can submit their recordings while this job is open."
      />
    );
  }

  // After award: only the winning take (no runner-up list). While open: all takes to choose from.
  const visibleTakes = jobOpen ? takes : takes.filter((take) => take.isWinner);

  if (visibleTakes.length === 0) {
    return (
      <EmptyState
        title="No awarded take"
        description="This job closed without a selected take."
      />
    );
  }

  return (
    <div className="space-y-3">
      {jobOpen && (
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
          {takes.length} {takes.length === 1 ? "take" : "takes"}
        </p>
      )}
      {visibleTakes.map((take) => (
        <TakeCard
          key={take.id}
          take={take}
          jobOpen={jobOpen}
          selecting={selectingId === take.id}
          disabled={selectingId !== null}
          onSelect={() => selectWinner(take.id)}
        />
      ))}
      {error && <Alert variant="error">{error}</Alert>}
    </div>
  );
}

function TakeCard({
  take,
  jobOpen,
  selecting,
  disabled,
  onSelect,
}: {
  take: Take;
  jobOpen: boolean;
  selecting: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const isWinner = take.isWinner;

  return (
    <Card
      padding="sm"
      className={`transition-all duration-150 ${
        isWinner ? "ring-2 ring-accent/20 bg-accent-muted/30" : ""
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-900">{take.musician.name}</span>
            {isWinner && <Badge status="AWARDED" />}
          </div>
          {take.note && (
            <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{take.note}</p>
          )}
          <AudioPlayer
            src={take.audioFileUrl}
            label="Take"
            className="mt-3"
            allowDownload={isWinner}
          />
        </div>
        {jobOpen && !isWinner && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onSelect}
            disabled={disabled}
            className="w-full shrink-0 sm:w-auto"
          >
            {selecting ? "Selecting…" : "Choose this one"}
          </Button>
        )}
      </div>
    </Card>
  );
}
