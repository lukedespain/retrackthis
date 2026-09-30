"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SubmitTakeForm } from "@/app/dashboard/SubmitTakeForm";
import { TakeSubmissionFiles } from "@/components/TakeSubmissionFiles";
import { TempoTag } from "@/components/JobMetaTags";
import { InstrumentIcon } from "@/components/brand/InstrumentIcon";
import { PayoutSetupCard } from "@/components/PayoutSetupCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatCents } from "@/lib/format";
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

export function MySubmissions({ payoutsHighlight = false }: { payoutsHighlight?: boolean }) {
  const [takes, setTakes] = useState<MyTake[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/takes/mine")
      .then((res) => res.json())
      .then(setTakes);
  }, []);

  if (takes === null) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const picked = takes.filter((take) => take.isWinner && take.job.status === "AWARDED");
  const pending = takes.filter((take) => subStatus(take).cls === "pending");
  const earned = picked.reduce((sum, take) => sum + take.job.priceCents, 0);
  const waiting = pending.reduce((sum, take) => sum + take.job.priceCents, 0);

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
      <div className="mt-4">
        <PayoutSetupCard highlightReturn={payoutsHighlight} allowManage />
      </div>
      <JobAlertNudge />

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
        <div className="jobs">
          {takes.map((take) => (
            <SubmissionCard
              key={take.id}
              take={take}
              expanded={expandedId === take.id}
              onToggle={() => setExpandedId(expandedId === take.id ? null : take.id)}
            />
          ))}
        </div>
      )}
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
            <span className="pill money">{formatCents(liveTake.job.priceCents)}</span>
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
            {liveTake.note ? (
              <div className="sub-note">
                <span>Your note</span>
                {liveTake.note}
              </div>
            ) : null}
            <TempoTag bpm={liveTake.job.bpm} />
            {canReplace ? (
              <SubmitTakeForm
                jobId={liveTake.jobId}
                alreadySubmitted
                existingTakeUrl={liveTake.audioFileUrl}
                existingFiles={liveTake.files}
                backingSrc={liveTake.job.backingFileUrl}
                onSubmitted={(next) =>
                  setLiveTake((prev) => ({
                    ...prev,
                    audioFileUrl: next.audioFileUrl,
                    files: next.files,
                  }))
                }
              />
            ) : (
              <TakeSubmissionFiles
                files={liveTake.files}
                fallbackAudioUrl={liveTake.audioFileUrl}
                allowDownload
              />
            )}
            <Link href={`/musicians?job=${liveTake.jobId}`} className="btn soft" style={{ height: 38, fontSize: 13.5 }}>
              View job
            </Link>
          </div>
        </div>
      ) : null}
    </article>
  );
}
