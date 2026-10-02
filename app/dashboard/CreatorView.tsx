"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { WaveformMixPlayer } from "@/components/WaveformMixPlayer";
import { TestJobBadge } from "@/components/TestJobBadge";
import { audioFiles, listenUrl, masterUrl } from "@/lib/takeFiles";
import { Avatar } from "@/components/brand/Avatar";
import { InstrumentIcon } from "@/components/brand/InstrumentIcon";
import type { Job, Take } from "@/lib/types";
import { daysUntilDeadline, formatCents, formatDeadline } from "@/lib/format";
import { ExtendDeadlineDialog } from "@/components/ExtendDeadlineDialog";
import { EditJobForm } from "./EditJobForm";
import { JobCheckoutEmbed } from "./JobCheckoutEmbed";
import { JOB_POSTED, requestPostJob } from "@/components/MarketingHeroCtas";

export function CreatorView({
  initialShowPost = false,
  hideHeading = false,
  hidePostButton = false,
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
  const [filter, setFilter] = useState<"all" | JobBucket>("all");
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
    if (initialShowPost && !readOnly) requestPostJob();
  }, [initialShowPost, readOnly]);

  useEffect(() => {
    const refresh = () => loadJobs();
    window.addEventListener(JOB_POSTED, refresh);
    return () => window.removeEventListener(JOB_POSTED, refresh);
  }, [jobsUrl]);

  return (
    <div>
      {!hideHeading && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">My jobs</h2>
            <p className="mt-0.5 text-sm text-gray-500">Manage your posted gigs and review takes</p>
          </div>
          {!hidePostButton && !readOnly && (
            <Button onClick={requestPostJob} size="sm" className="w-full sm:w-auto">
              Post a job
            </Button>
          )}
        </div>
      )}

      {hideHeading && !hidePostButton && !readOnly && (
        <div className="mb-6 flex justify-end sm:mb-8">
          <Button onClick={requestPostJob} size="sm" className="w-full sm:w-auto">
            Post a job
          </Button>
        </div>
      )}

      <JobsList
        jobs={jobs}
        filter={filter}
        onFilter={setFilter}
        expandedJobId={expandedJobId}
        onToggle={(id) => setExpandedJobId(expandedJobId === id ? null : id)}
        onChanged={loadJobs}
        readOnly={readOnly}
      />
    </div>
  );
}

type JobBucket = "review" | "open" | "awarded" | "cancel" | "draft";

function jobBucket(job: Job): JobBucket {
  if (job.status === "PENDING_PAYMENT") return "draft";
  if (job.status === "CANCELLED" || job.status === "CANCELLING") return "cancel";
  if (job.status === "AWARDED") return "awarded";
  if (job.status === "AWARDING") return "review";
  if (
    job.status === "OPEN" &&
    new Date(job.deadline).getTime() < Date.now() &&
    (job.takeCount ?? 0) > 0
  ) {
    return "review";
  }
  return "open";
}

const BUCKET_LABEL: Record<JobBucket, string> = {
  review: "Pick a winner",
  open: "Open",
  awarded: "Picked",
  cancel: "Cancelled",
  draft: "Draft",
};

function JobsList({
  jobs,
  filter,
  onFilter,
  expandedJobId,
  onToggle,
  onChanged,
  readOnly,
}: {
  jobs: Job[] | null;
  filter: "all" | JobBucket;
  onFilter: (next: "all" | JobBucket) => void;
  expandedJobId: string | null;
  onToggle: (id: string) => void;
  onChanged: () => void;
  readOnly: boolean;
}) {
  if (jobs === null) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }
  if (jobs.length === 0) {
    return (
      <div className="empty">
        No jobs yet.{" "}
        {readOnly ? null : (
          <button type="button" className="btn text" onClick={requestPostJob}>
            Post a job
          </button>
        )}
      </div>
    );
  }

  const drafts = jobs.filter((job) => jobBucket(job) === "draft");
  const live = jobs.filter((job) => jobBucket(job) !== "draft");
  const counts = live.reduce<Partial<Record<JobBucket, number>>>((acc, job) => {
    const bucket = jobBucket(job);
    acc[bucket] = (acc[bucket] ?? 0) + 1;
    return acc;
  }, {});
  const kinds = (["review", "open", "awarded", "cancel"] as JobBucket[]).filter((key) => counts[key]);
  const shown = live.filter((job) => filter === "all" || jobBucket(job) === filter);

  return (
    <>
      {drafts.length > 0 ? (
        <>
          <div className="section-title">Drafts</div>
          <div className="jobs" style={{ paddingBottom: 8 }}>
            {drafts.map((job) => (
              <CreatorJobCard
                key={job.id}
                job={job}
                expanded={expandedJobId === job.id}
                onToggle={() => onToggle(job.id)}
                onChanged={onChanged}
                readOnly={readOnly}
              />
            ))}
          </div>
        </>
      ) : null}
      <div className="jobs-bar">
        <div className="section-title">Jobs</div>
        {kinds.length > 1 ? (
          <div className="seg">
            <button type="button" aria-pressed={filter === "all"} onClick={() => onFilter("all")}>
              All<span className="seg-n">{live.length}</span>
            </button>
            {kinds.map((key) => (
              <button key={key} type="button" aria-pressed={filter === key} onClick={() => onFilter(key)}>
                {BUCKET_LABEL[key]}
                <span className="seg-n">{counts[key]}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="jobs">
        {shown.length === 0 ? (
          <div className="empty">No jobs in this view</div>
        ) : (
          shown.map((job) => (
            <CreatorJobCard
              key={job.id}
              job={job}
              expanded={expandedJobId === job.id}
              onToggle={() => onToggle(job.id)}
              onChanged={onChanged}
              readOnly={readOnly}
            />
          ))
        )}
      </div>
    </>
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [postingTest, setPostingTest] = useState(false);
  const [editing, setEditing] = useState(false);
  const [extending, setExtending] = useState(false);
  const isPastDeadline = job.status === "OPEN" && new Date(job.deadline).getTime() < Date.now();
  const canExtend = job.status === "OPEN" && !isPastDeadline && job.paymentStatus === "captured";
  const missingBacking = job.status === "OPEN" && !job.backingFileUrl;
  const [favoriteName, setFavoriteName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const unpaidCancelled =
    job.status === "CANCELLED" &&
    (job.paymentStatus == null ||
      job.paymentStatus === "pending_checkout" ||
      job.paymentStatus === "cancelled");

  useEffect(() => {
    const needsAdmin =
      job.status === "PENDING_PAYMENT" || (job.status === "CANCELLED" && job.isTest);
    if (readOnly || !needsAdmin) return;
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (!cancelled) setIsAdmin(Boolean(body?.profile?.isAdmin));
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, [job.status, job.isTest, readOnly]);

  async function postAsTest(e?: React.MouseEvent) {
    e?.stopPropagation();
    if (readOnly || postingTest) return;
    setPostingTest(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}/post-as-test`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not post the test job");
      setCheckoutClientSecret(null);
      onChanged();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Could not post the test job");
      setPostingTest(false);
    }
  }

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

  async function discardCancelledTest(e: React.MouseEvent) {
    e.stopPropagation();
    if (readOnly || cancelling) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/admin/jobs/${job.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not discard this test job");
      onChanged();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Could not discard this test job");
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

  async function shareGig() {
    const url = `${window.location.origin}/musicians?job=${job.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: job.title, url });
        return;
      }
    } catch {
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
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

  const bucket = jobBucket(job);
  const count = job.takeCount ?? 0;

  return (
    <article className="job">
      <div className="job-head" onClick={onToggle}>
        <span className="job-ico">
          <InstrumentIcon instrument={job.instrument} />
        </span>
        <div className="job-main">
          <div className="job-title">
            {job.title} <span className={`status ${bucket}`}>{BUCKET_LABEL[bucket]}</span>
            {job.isTest ? <TestJobBadge /> : null}
          </div>
          <div className="pills">
            <span className="pill money">{formatCents(job.priceCents)}</span>
            {bucket === "open" ? (
              <span className="pill">
                {formatDeadline(job.deadline, { extended: Boolean(job.deadlineExtendedAt) })}
              </span>
            ) : null}
            <span className="pill quiet">
              {count === 0 ? "No submissions yet" : `${count} submission${count === 1 ? "" : "s"}`}
            </span>
            {missingBacking ? <span className="pill quiet">Needs bed</span> : null}
          </div>
        </div>
        {job.status === "PENDING_PAYMENT" && !readOnly ? (
          <button
            type="button"
            className="chip-btn"
            onClick={(e) => {
              e.stopPropagation();
              void resumeCheckout(e);
            }}
          >
            {resumingCheckout ? "Opening…" : "Finish posting"}
          </button>
        ) : (
          <button
            type="button"
            className="chip-btn"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            {expanded ? "Hide" : count ? "View takes" : "View"}
          </button>
        )}
      </div>

      {expanded && !readOnly && (job.status === "PENDING_PAYMENT" || job.status === "CANCELLED") ? (
        <div className="job-actions">
          <div className="job-actions-row">
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
              {isAdmin ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={postAsTest}
                  disabled={postingTest || resumingCheckout || cancelling || editing}
                  className="w-full sm:w-auto"
                >
                  {postingTest ? "Posting test…" : "Post as test"}
                </Button>
              ) : null}
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
              disabled={restoringDraft || cancelling}
              className="w-full sm:w-auto"
            >
              {restoringDraft ? "Restoring…" : "Restore as draft"}
            </Button>
          )}
          {job.status === "CANCELLED" && job.isTest && isAdmin && !readOnly && (
            <Button
              variant="danger"
              size="sm"
              onClick={discardCancelledTest}
              disabled={cancelling || restoringDraft}
              className="w-full sm:w-auto"
            >
              {cancelling ? "Discarding…" : "Discard"}
            </Button>
          )}
          </div>
        </div>
      ) : null}

      {extending && !readOnly && (
        <ExtendDeadlineDialog
          job={job}
          onClose={() => setExtending(false)}
          onExtended={() => {
            setExtending(false);
            onChanged();
          }}
        />
      )}
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
            onPostAsTest={isAdmin ? () => void postAsTest() : undefined}
            postingTest={postingTest}
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
          <div className="job-open">
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
                {job.status === "OPEN" && !isPastDeadline && favoriteName ? (
                  <div className="banner">
                    <StarIcon />
                    <span>
                      <b>{favoriteName}</b> is your favorite. Picking opens when it closes in{" "}
                      {closesInPhrase(job.deadline)}.
                    </span>
                  </div>
                ) : null}
                {isPastDeadline ? (
                  <div className="banner warm">
                    <ClockIcon />
                    <span>
                      Pick by {pickByPhrase(job.deadline)}.{" "}
                      {favoriteName
                        ? `Otherwise we’ll pick ${favoriteName}, your favorite.`
                        : "If you don’t pick anyone, the job is refunded."}
                    </span>
                  </div>
                ) : null}
                <TakesList
                  jobId={job.id}
                  jobOpen={job.status === "OPEN" || job.status === "AWARDING"}
                  jobAwarded={job.status === "AWARDED"}
                  pastDeadline={isPastDeadline}
                  paying={job.status === "AWARDING"}
                  jobBackingUrl={job.backingFileUrl}
                  onAwarded={onChanged}
                  onSelectionChange={setFavoriteName}
                  readOnly={readOnly}
                />
                {job.status === "OPEN" && !readOnly ? (
                  <div className="job-foot">
                    <button type="button" className="btn soft" onClick={startEdit} disabled={cancelling}>
                      Edit job
                    </button>
                    {canExtend ? (
                      <button
                        type="button"
                        className="btn soft"
                        disabled={cancelling || editing}
                        onClick={() => {
                          setCancelError(null);
                          setExtending(true);
                        }}
                      >
                        Extend deadline
                      </button>
                    ) : null}
                    <button type="button" className="btn soft" onClick={() => void shareGig()}>
                      {copied ? null : <ShareIcon />}
                      {copied ? "Link copied" : "Share gig"}
                    </button>
                    <button
                      type="button"
                      className="btn text"
                      style={{ marginLeft: "auto" }}
                      disabled={cancelling || editing || extending}
                      onClick={cancelJob}
                    >
                      {cancelling ? "Cancelling…" : "Cancel & refund"}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function TakesList({
  jobId,
  jobOpen,
  jobAwarded,
  pastDeadline = false,
  paying = false,
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
  jobBackingUrl?: string | null;
  onAwarded: () => void;
  onSelectionChange?: (winnerName: string | null) => void;
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
    onSelectionChange?.(list.find((t: Take) => t.isWinner)?.musician.name ?? null);
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
    <div className="takes">
      {visibleTakes.map((take) => (
        <TakeCard
          key={take.id}
          take={take}
          jobOpen={jobOpen}
          jobAwarded={jobAwarded}
          pastDeadline={pastDeadline}
          paying={paying}
          hasOtherSelection={hasSelection && !take.isWinner}
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
  jobBackingUrl?: string | null;
  selecting: boolean;
  disabled: boolean;
  readOnly?: boolean;
  onPick: () => void;
  onFinalize: () => void;
}) {
  const isWinner = take.isWinner;
  const audio = take.files?.length ? audioFiles(take.files) : [];
  const [takeIndex, setTakeIndex] = useState(0);
  const index = Math.min(takeIndex, Math.max(0, audio.length - 1));
  const current = audio[index];
  const playSrc = current ? listenUrl(current) : take.audioFileUrl;
  const downloadSrc = current ? masterUrl(current) : take.audioFileUrl;
  const audioCount = Math.max(1, audio.length || (take.audioFileUrl ? 1 : 0));
  const first = take.musician.name.split(" ")[0];
  const allowDownload = jobAwarded && isWinner;

  return (
    <div className={`take${isWinner && !jobAwarded ? " fav" : ""}${jobAwarded && isWinner ? " win" : ""}`}>
      <div className="take-head">
        <Avatar name={take.musician.name} avatar={null} size="sm" />
        <span className="who">
          <strong>{take.musician.name}</strong>
          <span>
            {audioCount} take{audioCount === 1 ? "" : "s"}
            {isWinner && !jobAwarded ? " · Your favorite" : ""}
            {jobAwarded && isWinner ? " · Picked" : ""}
          </span>
        </span>
        {jobOpen && !paying && !pastDeadline ? (
          <button
            type="button"
            className="fav-btn"
            aria-pressed={isWinner}
            disabled={disabled || isWinner}
            onClick={onPick}
          >
            <StarIcon filled={isWinner} />
            {selecting ? "Saving…" : "Favorite"}
          </button>
        ) : null}
        {jobOpen && pastDeadline && !jobAwarded ? (
          <button
            type="button"
            className={`btn ${isWinner ? "primary" : "soft"}`}
            style={{ height: 34, padding: "0 14px", fontSize: 13 }}
            disabled={disabled}
            onClick={onFinalize}
          >
            {selecting ? "Picking…" : `Pick ${first}`}
          </button>
        ) : null}
      </div>
      {take.note ? <p className="take-note">{take.note}</p> : null}
      {playSrc ? (
        <div className="take-listen">
          <WaveformMixPlayer
            key={current?.id ?? playSrc}
            className="flat"
            partSrc={playSrc}
            partDownloadSrc={downloadSrc}
            backingSrc={jobBackingUrl}
            partTabLabel="Part"
            partCaption="Your submitted take"
            initialMode={jobBackingUrl ? "both" : "part"}
            allowDownload={allowDownload}
            heading={
              audio.length > 1 ? (
                <div className="seg" role="tablist" aria-label="Takes">
                  {audio.map((file, i) => (
                    <button key={file.id} type="button" aria-pressed={i === index} onClick={() => setTakeIndex(i)}>
                      Take {i + 1}
                    </button>
                  ))}
                </div>
              ) : (
                <strong className="ref-lbl">{current?.label ?? "Take"}</strong>
              )
            }
          />
        </div>
      ) : null}
    </div>
  );
}

function closesInPhrase(deadline: string) {
  const days = daysUntilDeadline(deadline);
  if (days <= 0) return "today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

function pickByPhrase(deadline: string) {
  const end = new Date(new Date(deadline).getTime() + 48 * 60 * 60 * 1000);
  const time = end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((start(end) - start(new Date())) / 86400000);
  if (diff <= 0) return `today, ${time}`;
  if (diff === 1) return `tomorrow, ${time}`;
  const date = end.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return `${date}, ${time}`;
}

function StarIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 3.2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.8 7.2 18.1l.9-5.4L4.2 8.9l5.4-.8L12 3.2z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 15V4M8 8l4-4 4 4" />
      <path d="M6 12v6.5A1.5 1.5 0 0 0 7.5 20h9a1.5 1.5 0 0 0 1.5-1.5V12" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5l3 2" strokeLinecap="round" />
    </svg>
  );
}
