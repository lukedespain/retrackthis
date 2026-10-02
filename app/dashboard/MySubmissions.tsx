"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SubmitTakeForm } from "@/app/dashboard/SubmitTakeForm";
import { TakeSubmissionFiles } from "@/components/TakeSubmissionFiles";
import { InstrumentIcon } from "@/components/brand/InstrumentIcon";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatCents, formatDeadline } from "@/lib/format";
import { musicianFacingPriceCents } from "@/lib/jobPricing";
import { audioFiles } from "@/lib/takeFiles";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import type { MyTake } from "@/lib/types";

function subStatus(take: MyTake): { cls: string; label: string } {
  if (take.job.status === "CANCELLED" || take.job.status === "CANCELLING") {
    return { cls: "cancel", label: "Cancelled" };
  }
  if (take.job.status === "AWARDED") {
    return take.isWinner ? { cls: "awarded", label: "Picked" } : { cls: "lost", label: "Not picked" };
  }
  return { cls: "pending", label: "Pending" };
}

const SUB_ORDER = ["pending", "awarded", "lost", "cancel"] as const;
type SubFilter = "all" | (typeof SUB_ORDER)[number];
const SUB_LABEL: Record<(typeof SUB_ORDER)[number], string> = {
  pending: "Pending",
  awarded: "Picked",
  lost: "Not picked",
  cancel: "Cancelled",
};

function monthDay(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function whenLabel(take: MyTake, status: string) {
  if (status === "pending" && take.job.deadline) return formatDeadline(take.job.deadline);
  const stamp = take.job.moneyClaimedAt || take.job.deadline;
  if (!stamp) return null;
  const formatted = monthDay(stamp);
  if (status === "awarded") return `Picked ${formatted}`;
  if (status === "cancel") return `Cancelled ${formatted}`;
  return `Closed ${formatted}`;
}

export function MySubmissions() {
  const focusJobId = useSearchParams().get("job");
  const [takes, setTakes] = useState<MyTake[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<SubFilter>("all");

  useEffect(() => {
    fetch("/api/takes/mine")
      .then((res) => res.json())
      .then(setTakes);
  }, []);

  useEffect(() => {
    if (!takes || !focusJobId) return;
    const match = takes.find((take) => take.jobId === focusJobId);
    if (match) setExpandedId(match.id);
  }, [takes, focusJobId]);

  if (takes === null) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const picked = takes.filter((take) => take.isWinner && take.job.status === "AWARDED");
  const pending = takes.filter((take) => subStatus(take).cls === "pending");
  const earned = picked.reduce((sum, take) => sum + musicianFacingPriceCents(take.job), 0);
  const waiting = pending.reduce((sum, take) => sum + musicianFacingPriceCents(take.job), 0);
  const counts = takes.reduce<Record<string, number>>((acc, take) => {
    const key = subStatus(take).cls;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const kinds = SUB_ORDER.filter((key) => counts[key]);
  const active: SubFilter = filter !== "all" && !counts[filter] ? "all" : filter;
  const shown = takes
    .filter((take) => active === "all" || subStatus(take).cls === active)
    .sort((a, b) => SUB_ORDER.indexOf(subStatus(a).cls as (typeof SUB_ORDER)[number]) - SUB_ORDER.indexOf(subStatus(b).cls as (typeof SUB_ORDER)[number]));

  return (
    <div>
      <div className="earn">
        <div className="earn-s">
          <strong>{formatCents(earned)}</strong>
          <span>Earned</span>
        </div>
        <div className="earn-s">
          <strong>{picked.length}</strong>
          <span>{picked.length === 1 ? "Time picked" : "Times picked"}</span>
        </div>
        <div className="earn-s">
          <strong>{formatCents(waiting)}</strong>
          <span>
            Pending on {pending.length} job{pending.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {takes.length === 0 ? (
        <EmptyState
          title="No submissions yet"
          description="Browse open jobs and submit your first take to get started."
          action={
            <a href="/musicians">
              <Button size="sm">Browse jobs</Button>
            </a>
          }
        />
      ) : (
        <>
          {kinds.length < 2 ? (
            <div className="section-title">Submissions</div>
          ) : (
            <div className="jobs-bar">
              <div className="section-title">Submissions</div>
              <div className="seg">
                <button type="button" aria-pressed={active === "all"} onClick={() => setFilter("all")}>
                  All<span className="seg-n">{takes.length}</span>
                </button>
                {kinds.map((key) => (
                  <button key={key} type="button" aria-pressed={active === key} onClick={() => setFilter(key)}>
                    {SUB_LABEL[key]}
                    <span className="seg-n">{counts[key]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="jobs">
            {shown.map((take) => (
              <SubmissionCard
                key={take.id}
                take={take}
                expanded={expandedId === take.id}
                onToggle={() => setExpandedId(expandedId === take.id ? null : take.id)}
              />
            ))}
          </div>
        </>
      )}
      <JobAlertNudge />
    </div>
  );
}

function JobAlertNudge() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    fetch("/api/settings/notifications")
      .then((res) => (res.ok ? res.json() : null))
      .then((prefs) => {
        if (prefs && !prefs.notifyJobAlerts) setShow(true);
      })
      .catch(() => {});
  }, []);

  if (!show) return null;

  return (
    <Card padding="md" className="border border-dashed border-gray-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">Get emailed about new gigs</p>
          <p className="mt-0.5 text-sm text-gray-500">
            Turn on job alerts in Settings. Emails only go out for instruments you play.
          </p>
        </div>
        <Link href="/settings#notifications" className="shrink-0">
          <Button size="sm" variant="secondary" className="w-full sm:w-auto">
            Email settings
          </Button>
        </Link>
      </div>
    </Card>
  );
}

function SubmissionCard({
  take,
  expanded,
  onToggle,
}: {
  take: MyTake;
  expanded: boolean;
  onToggle: () => void;
}) {
  const cardRef = useRef<HTMLElement>(null);
  const [liveTake, setLiveTake] = useState(take);
  const canReplace = !liveTake.isWinner && liveTake.job.status === "OPEN";

  useEffect(() => {
    setLiveTake(take);
  }, [take]);

  useEffect(() => {
    if (expanded) {
      cardRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [expanded]);

  const status = subStatus(liveTake);
  const takeCount = liveTake.files?.length ? Math.max(1, audioFiles(liveTake.files).length) : 1;

  return (
    <article ref={cardRef} className="job">
      <div className="job-head" onClick={onToggle}>
        <span className="job-ico">
          <InstrumentIcon instrument={liveTake.job.instrument} />
        </span>
        <div className="job-main">
          <div className="job-title">
            {liveTake.job.title} <span className={`status ${status.cls}`}>{status.label}</span>
          </div>
          <div className="pills">
            <span className="pill money">{formatCents(musicianFacingPriceCents(liveTake.job))}</span>
            {whenLabel(liveTake, status.cls) ? (
              <span className="pill quiet">{whenLabel(liveTake, status.cls)}</span>
            ) : null}
            <span className="pill quiet">
              {takeCount} take{takeCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <button type="button" className="chip-btn" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
          {expanded ? "Hide" : "View"}
        </button>
      </div>
      {expanded ? (
        <div className="job-body" style={{ gridTemplateColumns: "1fr" }}>
          <div className="panel">
            <div className="pills" style={{ margin: 0 }}>
              <span className="pill">{liveTake.job.bpm ? `${liveTake.job.bpm} BPM` : "Tempo not fixed"}</span>
              {liveTake.job.musicalKey ? <span className="pill">{liveTake.job.musicalKey}</span> : null}
              <span className="pill">
                <InstrumentIcon instrument={liveTake.job.instrument} />
                {liveTake.job.instrument}
              </span>
            </div>
            {canReplace ? (
              <SubmitTakeForm
                jobId={liveTake.jobId}
                priceCents={musicianFacingPriceCents(liveTake.job)}
                alreadySubmitted
                existingTakeUrl={liveTake.audioFileUrl}
                existingFiles={liveTake.files}
                existingNote={liveTake.note}
                backingSrc={liveTake.job.backingFileUrl}
                viewJobHref={`/musicians?job=${liveTake.jobId}`}
                onSubmitted={(next) =>
                  setLiveTake((prev) => ({
                    ...prev,
                    audioFileUrl: next.audioFileUrl,
                    files: next.files,
                  }))
                }
              />
            ) : (
              <>
                <TakeSubmissionFiles
                  files={liveTake.files}
                  fallbackAudioUrl={liveTake.audioFileUrl}
                  allowDownload
                />
                <Link href={`/musicians?job=${liveTake.jobId}`} className="btn soft" style={{ height: 38, fontSize: 13.5 }}>
                  View job
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </article>
  );
}
