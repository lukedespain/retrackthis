"use client";

import { useEffect, useState } from "react";
import { ReferenceTracksPlayer } from "@/components/ReferenceTracksPlayer";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { TakeSubmissionFiles } from "@/components/TakeSubmissionFiles";
import { audioFiles, midiFiles } from "@/lib/takeFiles";
import { JobMetaTags, TempoTag } from "@/components/JobMetaTags";
import type { Job, Take } from "@/lib/types";
import { formatCents } from "@/lib/format";
import { EditJobForm } from "./EditJobForm";
import { JobCheckoutEmbed } from "./JobCheckoutEmbed";
import { PostJobForm } from "./PostJobForm";

export function CreatorView({
  initialShowPost = false,
  hideHeading = false,
  hidePostButton = false,
  onPostClosed,
  readOnly = false,
  jobsUrl = "/api/jobs?mine=true",
  initialExpandedJobId = null,
}: {
  initialShowPost?: boolean;
  hideHeading?: boolean;
  /** When the hub toggle already has Post a job, hide the inline button. */
  hidePostButton?: boolean;
  onPostClosed?: () => void;
  /** Admin preview: same UI, no edit/cancel/award. */
  readOnly?: boolean;
  /** Fetch URL for jobs. Admin preview returns `{ jobs }`; mine=true returns an array. */
  jobsUrl?: string;
  initialExpandedJobId?: string | null;
}) {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [showPostForm, setShowPostForm] = useState(initialShowPost && !readOnly);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(initialExpandedJobId);

  async function loadJobs() {
    const res = await fetch(jobsUrl);
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setJobs([]);
      return;
    }
    const list = Array.isArray(body) ? body : Array.isArray(body?.jobs) ? body.jobs : [];
    setJobs(list);
  }

  useEffect(() => {
    loadJobs();
  }, [jobsUrl]);

  useEffect(() => {
    if (initialExpandedJobId) setExpandedJobId(initialExpandedJobId);
  }, [initialExpandedJobId]);

  useEffect(() => {
    if (initialShowPost && !readOnly) setShowPostForm(true);
  }, [initialShowPost, readOnly]);

  function closePostForm() {
    setShowPostForm(false);
    onPostClosed?.();
  }

  return (
    <div>
      {!hideHeading && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">My jobs</h2>
            <p className="mt-0.5 text-sm text-gray-500">Manage your posted gigs and review takes</p>
          </div>
          {!showPostForm && !hidePostButton && !readOnly && (
            <Button onClick={() => setShowPostForm(true)} size="sm" className="w-full sm:w-auto">
              Post a job
            </Button>
          )}
        </div>
      )}

      {hideHeading && !showPostForm && !hidePostButton && !readOnly && (
        <div className="mb-6 flex justify-end sm:mb-8">
          <Button onClick={() => setShowPostForm(true)} size="sm" className="w-full sm:w-auto">
            Post a job
          </Button>
        </div>
      )}

      {showPostForm && !readOnly && (
        <div className={hideHeading ? "mb-6 sm:mb-8" : "mt-6 sm:mt-8"}>
          <PostJobForm
            onCancel={closePostForm}
            onPosted={() => {
              closePostForm();
              loadJobs();
            }}
          />
        </div>
      )}

      <div className={hideHeading ? "space-y-3 sm:space-y-4" : "mt-6 space-y-3 sm:mt-8 sm:space-y-4"}>
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
              readOnly ? undefined : (
                <Button onClick={() => setShowPostForm(true)} size="sm">
                  Post a job
                </Button>
              )
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
            readOnly={readOnly}
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
  readOnly = false,
}: {
  job: Job;
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => void;
  readOnly?: boolean;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [resumingCheckout, setResumingCheckout] = useState(false);
  const [restoringDraft, setRestoringDraft] = useState(false);
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const isPastDeadline = job.status === "OPEN" && new Date(job.deadline).getTime() < Date.now();
  const missingBacking = job.status === "OPEN" && !job.backingFileUrl;
  const flexibleTempo = job.status === "OPEN" && job.bpm == null;
  const [hasProvisionalWinner, setHasProvisionalWinner] = useState(!!job.hasSelectedWinner);
  const unpaidCancelled =
    job.status === "CANCELLED" &&
    (job.paymentStatus == null ||
      job.paymentStatus === "pending_checkout" ||
      job.paymentStatus === "cancelled");

  useEffect(() => {
    setHasProvisionalWinner(!!job.hasSelectedWinner);
  }, [job.hasSelectedWinner, job.id]);

  async function cancelJob(e?: React.MouseEvent) {
    e?.stopPropagation();
    if (readOnly) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}/cancel`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      setCheckoutClientSecret(null);
      onChanged();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setCancelling(false);
    }
  }

  async function restoreDraft(e: React.MouseEvent) {
    e.stopPropagation();
    if (readOnly) return;
    setRestoringDraft(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}/restore-draft`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      onChanged();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setRestoringDraft(false);
    }
  }

  async function resumeCheckout(e: React.MouseEvent) {
    e.stopPropagation();
    if (readOnly) return;
    setResumingCheckout(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}/resume-checkout`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      if (body?.activated) {
        onChanged();
        return;
      }
      if (body?.clientSecret && typeof body.clientSecret === "string") {
        setCheckoutClientSecret(body.clientSecret);
        if (!expanded) onToggle();
        return;
      }
      throw new Error("Checkout could not be opened.");
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setResumingCheckout(false);
    }
  }

  function startEdit(e?: React.MouseEvent) {
    e?.stopPropagation();
    if (readOnly) return;
    setEditing(true);
    if (!expanded) onToggle();
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
            {missingBacking && (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800">
                Needs background track
              </span>
            )}
          </div>
          <div className="mt-2.5">
            <JobMetaTags
              instrument={job.instrument}
              priceCents={job.priceCents}
              durationSeconds={job.durationSeconds}
              deadline={job.deadline}
              takeCount={job.takeCount}
            />
          </div>
        </button>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:shrink-0">
          {job.status === "PENDING_PAYMENT" && !readOnly && (
            <>
              <Button
                size="sm"
                onClick={resumeCheckout}
                disabled={resumingCheckout || cancelling || editing}
                className="w-full sm:w-auto"
              >
                {resumingCheckout ? "Opening…" : "Finish payment"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={startEdit}
                disabled={resumingCheckout || cancelling}
                className="w-full sm:w-auto"
              >
                {editing ? "Editing…" : "Edit draft"}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={cancelJob}
                disabled={cancelling || resumingCheckout || editing}
                className="w-full sm:w-auto"
                aria-label="Discard unpaid draft"
              >
                {cancelling ? "Discarding…" : "Discard draft"}
              </Button>
            </>
          )}
          {unpaidCancelled && !readOnly && (
            <Button
              size="sm"
              onClick={restoreDraft}
              disabled={restoringDraft}
              className="w-full sm:w-auto"
            >
              {restoringDraft ? "Restoring…" : "Restore as draft"}
            </Button>
          )}
          {job.status === "OPEN" && !readOnly && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={startEdit}
                className="w-full sm:w-auto"
              >
                {editing ? "Editing…" : "Edit job"}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={cancelJob}
                disabled={cancelling || editing}
                className="w-full sm:w-auto"
                aria-label="Cancel and refund"
              >
                {cancelling ? (
                  "Cancelling…"
                ) : (
                  <>
                    <span className="sm:hidden">Cancel</span>
                    <span className="hidden sm:inline">Cancel & refund</span>
                  </>
                )}
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            disabled={editing || job.status === "PENDING_PAYMENT"}
            className="w-full sm:w-auto"
          >
            {expanded ? "Hide takes" : "View takes"}
          </Button>
        </div>
      </div>

      {job.status === "AWARDING" && (
        <Alert variant="info">
          Payment is in progress. If this stays on Paying, open the gig and click Finish payment.
        </Alert>
      )}
      {job.status === "PENDING_PAYMENT" && checkoutClientSecret && (
        <div className="border-t border-gray-100 px-4 py-4 sm:px-6">
          <JobCheckoutEmbed
            clientSecret={checkoutClientSecret}
            amountLabel={formatCents(job.priceCents)}
            onSaveForLater={() => setCheckoutClientSecret(null)}
            onDiscard={() => {
              setCheckoutClientSecret(null);
              void cancelJob();
            }}
          />
        </div>
      )}
      {job.status === "PENDING_PAYMENT" && !checkoutClientSecret && (
        <div className="border-t border-gray-100 px-4 py-3 sm:px-6">
          <Alert variant="warning">
            <p className="font-medium">Draft - payment not finished</p>
            <p className="mt-1">
              This gig stays private until you pay. Finish payment when you’re ready, edit the
              draft, or discard it.
            </p>
          </Alert>
        </div>
      )}

      {(missingBacking || flexibleTempo) && !editing && job.status === "OPEN" && (
        <div className="border-t border-gray-100 px-4 py-3 sm:px-6">
          <Alert variant="warning">
            <p className="font-medium">
              {missingBacking && flexibleTempo
                ? "Finish setting up this job"
                : missingBacking
                  ? "Add a background / instrumental track"
                  : "Set a fixed tempo if you want one"}
            </p>
            <p className="mt-1">
              {missingBacking
                ? "Your existing scratch stays as the part being retracked. Use Edit job to upload the bed without that part"
                : "This job is currently flexible tempo. Use Edit job to turn on Fixed tempo and enter a BPM"}
              {missingBacking && flexibleTempo
                ? ", and to switch from flexible tempo to a fixed BPM"
                : null}
              .
            </p>
            {!readOnly && (
              <div className="mt-3">
                <Button size="sm" onClick={() => startEdit()}>
                  Edit job
                </Button>
              </div>
            )}
          </Alert>
        </div>
      )}

      {job.status === "OPEN" && hasProvisionalWinner && !isPastDeadline && (
        <div className="border-t border-gray-100 px-4 py-3 sm:px-6">
          <Alert variant="info">
            Favorite saved - only one submission at a time (favoriting another replaces this one,
            including all its takes). Submissions stay open until the deadline. After it ends you’ll
            have 48 hours to <span className="font-medium">Award</span> a musician; we’ll auto-award
            your current favorite if you don’t.
          </Alert>
        </div>
      )}

      {isPastDeadline && !hasProvisionalWinner && (
        <div className="border-t border-gray-100 px-4 py-3 sm:px-6">
          <Alert variant="warning">
            Deadline ended - submissions are closed. You have 48 hours to award a musician. If you
            don’t pick anyone, the job cancels automatically and you’re refunded.
          </Alert>
        </div>
      )}

      {isPastDeadline && hasProvisionalWinner && (
        <div className="border-t border-gray-100 px-4 py-3 sm:px-6">
          <Alert variant="warning">
            Deadline ended - submissions are closed. Award your favorite (or switch first) within 48
            hours. Left alone, we’ll auto-award your current favorite.
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
          expanded || editing ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-gray-100 bg-surface px-4 py-4 sm:px-6 sm:py-5">
            {editing && !readOnly ? (
              <EditJobForm
                job={job}
                onCancel={() => setEditing(false)}
                onSaved={() => {
                  setEditing(false);
                  onChanged();
                }}
              />
            ) : (
              <>
                {job.description && (
                  <p className="text-sm leading-relaxed text-gray-600">{job.description}</p>
                )}
                <div className={job.description ? "mt-3 mb-4" : "mb-4"}>
                  <TempoTag bpm={job.bpm} />
                </div>
                <div className="mb-6 space-y-3">
                  <ReferenceTracksPlayer
                    partSrc={job.demoFileUrl}
                    backingSrc={job.backingFileUrl}
                    bpm={job.bpm}
                    allowDownload
                  />
                  {!job.backingFileUrl && job.status === "OPEN" && !readOnly ? (
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      No background track yet.{" "}
                      <button
                        type="button"
                        onClick={() => startEdit()}
                        className="font-medium underline underline-offset-2"
                      >
                        Add one
                      </button>
                    </p>
                  ) : null}
                </div>
                <TakesList
                  jobId={job.id}
                  jobOpen={job.status === "OPEN" || job.status === "AWARDING"}
                  jobAwarded={job.status === "AWARDED"}
                  pastDeadline={isPastDeadline}
                  paying={job.status === "AWARDING"}
                  jobBpm={job.bpm}
                  jobBackingUrl={job.backingFileUrl}
                  onAwarded={onChanged}
                  onSelectionChange={setHasProvisionalWinner}
                  readOnly={readOnly}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function TakesList({
  jobId,
  jobOpen,
  jobAwarded,
  pastDeadline = false,
  paying = false,
  jobBpm = null,
  jobBackingUrl = null,
  onAwarded,
  onSelectionChange,
  readOnly = false,
}: {
  jobId: string;
  jobOpen: boolean;
  jobAwarded: boolean;
  pastDeadline?: boolean;
  paying?: boolean;
  jobBpm?: number | null;
  jobBackingUrl?: string | null;
  onAwarded: () => void;
  onSelectionChange?: (hasSelection: boolean) => void;
  readOnly?: boolean;
}) {
  const [takes, setTakes] = useState<Take[] | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function loadTakes() {
    const res = await fetch(`/api/jobs/${jobId}/takes`);
    const body = await res.json();
    const list = Array.isArray(body) ? body : [];
    setTakes(list);
    onSelectionChange?.(list.some((t: Take) => t.isWinner));
  }

  useEffect(() => {
    loadTakes();
  }, [jobId]);

  async function selectWinner(takeId: string, finalize = false) {
    if (readOnly) return;
    setSelectingId(takeId);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/select-winner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ takeId, finalize }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      if (body?.message) {
        setInfo(body.message);
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

  // After final award: only the winning take. While open (including provisional): all takes.
  const visibleTakes = jobOpen ? takes : takes.filter((take) => take.isWinner);
  const hasSelection = takes.some((take) => take.isWinner);

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
          {takes.length} {takes.length === 1 ? "submission" : "submissions"}
        </p>
      )}
      {visibleTakes.map((take) => (
        <TakeCard
          key={take.id}
          take={take}
          jobOpen={jobOpen}
          jobAwarded={jobAwarded}
          pastDeadline={pastDeadline}
          paying={paying}
          hasOtherSelection={hasSelection && !take.isWinner}
          jobBpm={jobBpm}
          jobBackingUrl={jobBackingUrl}
          selecting={selectingId === take.id}
          disabled={selectingId !== null || readOnly}
          readOnly={readOnly}
          onPick={() => selectWinner(take.id, false)}
          onFinalize={() => selectWinner(take.id, true)}
        />
      ))}
      {info && <Alert variant="info">{info}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}
    </div>
  );
}

function TakeCard({
  take,
  jobOpen,
  jobAwarded,
  pastDeadline = false,
  paying = false,
  hasOtherSelection,
  jobBpm = null,
  jobBackingUrl = null,
  selecting,
  disabled,
  readOnly = false,
  onPick,
  onFinalize,
}: {
  take: Take;
  jobOpen: boolean;
  jobAwarded: boolean;
  pastDeadline?: boolean;
  paying?: boolean;
  hasOtherSelection: boolean;
  jobBpm?: number | null;
  jobBackingUrl?: string | null;
  selecting: boolean;
  disabled: boolean;
  readOnly?: boolean;
  onPick: () => void;
  onFinalize: () => void;
}) {
  const isWinner = take.isWinner;
  const audioCount = take.files?.length ? audioFiles(take.files).length : 1;
  const hasMidi = take.files?.length ? midiFiles(take.files).length > 0 : false;
  // Full WAV downloads only after the job is finalized (AWARDED), not on provisional select.
  const allowDownload = jobAwarded && isWinner;

  return (
    <Card
      padding="sm"
      className={`transition-all duration-150 ${
        isWinner ? "ring-2 ring-accent/20 bg-accent-muted/30" : ""
      }`}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{take.musician.name}</span>
          {isWinner && <Badge status={jobAwarded ? "AWARDED" : "PICKED"} />}
          {audioCount > 1 && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
              {audioCount} takes
            </span>
          )}
          {hasMidi && (
            <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-100">
              MIDI included
            </span>
          )}
        </div>
        {take.note && (
          <p className="text-sm leading-relaxed text-gray-500">{take.note}</p>
        )}
        <TakeSubmissionFiles
          files={take.files}
          fallbackAudioUrl={take.audioFileUrl}
          allowDownload={allowDownload}
          collapsible={audioCount > 1}
          bpm={jobBpm}
          backingSrc={jobBackingUrl}
        />
        {jobOpen && isWinner && !jobAwarded && pastDeadline && (
          <div className="flex flex-col items-center gap-2 border-t border-gray-100 pt-4">
            <Button
              size="sm"
              onClick={onFinalize}
              disabled={disabled}
              title={readOnly ? "Preview only. Awarding stays with the producer." : undefined}
              className="w-full sm:w-auto"
            >
              {readOnly
                ? "Award this submission"
                : selecting
                  ? "Awarding…"
                  : paying
                    ? "Finish payment"
                    : "Award this submission"}
            </Button>
            <p className="max-w-md text-center text-xs leading-relaxed text-gray-500">
              Accepts this musician, pays them, unlocks masters, and closes the job.
            </p>
          </div>
        )}
        {jobOpen && isWinner && !jobAwarded && !pastDeadline && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-center text-xs leading-relaxed text-gray-500">
              Favorited (one at a time). Favoriting another submission replaces this one. Awarding
              opens after the deadline so musicians get the full window.
            </p>
          </div>
        )}
        {jobOpen && !isWinner && !paying && (
          <div className="flex flex-col items-center gap-2 border-t border-gray-100 pt-4">
            {pastDeadline ? (
              <>
                <Button
                  size="sm"
                  onClick={onFinalize}
                  disabled={disabled}
                  title={readOnly ? "Preview only. Awarding stays with the producer." : undefined}
                  className="w-full sm:w-auto"
                >
                  {readOnly
                    ? hasOtherSelection
                      ? "Award this instead"
                      : "Award this submission"
                    : selecting
                      ? "Awarding…"
                      : hasOtherSelection
                        ? "Award this instead"
                        : "Award this submission"}
                </Button>
                <p className="max-w-md text-center text-xs leading-relaxed text-gray-500">
                  Pays the musician, unlocks masters, and closes the job.
                </p>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onPick}
                  disabled={disabled}
                  title={readOnly ? "Preview only." : undefined}
                  className="w-full sm:w-auto"
                >
                  {readOnly
                    ? hasOtherSelection
                      ? "Switch favorite"
                      : "Favorite this submission"
                    : selecting
                      ? "Saving…"
                      : hasOtherSelection
                        ? "Switch favorite"
                        : "Favorite this submission"}
                </Button>
                <p className="max-w-md text-center text-xs leading-relaxed text-gray-500">
                  Favorites are one submission at a time (all takes in that submission). Favoriting
                  another replaces the previous one so auto-award after the deadline stays clean.
                  Jobs can’t close early - musicians keep the full window.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
