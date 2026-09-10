"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SubmitTakeForm } from "@/app/dashboard/SubmitTakeForm";
import { TakeSubmissionFiles } from "@/components/TakeSubmissionFiles";
import { JobMetaTags, TempoTag } from "@/components/JobMetaTags";
import { PayoutSetupCard } from "@/components/PayoutSetupCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import type { MyTake } from "@/lib/types";

function statusFor(take: MyTake): string {
  if (take.isWinner) return "SELECTED";
  if (take.job.status === "AWARDED") return "NOT SELECTED";
  if (take.job.status === "CANCELLED") return "JOB CANCELLED";
  return "PENDING";
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

  return (
    <div className="space-y-5">
      <PayoutSetupCard highlightReturn={payoutsHighlight} allowManage />
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
        <div className="space-y-3">
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
  const cardRef = useRef<HTMLDivElement>(null);
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

  return (
    <div ref={cardRef}>
      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6 sm:py-5">
          <button
            type="button"
            onClick={onToggle}
            className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-gray-900">{liveTake.job.title}</span>
              <Badge status={statusFor(liveTake)} />
            </div>
            <div className="mt-2.5">
              <JobMetaTags
                instrument={liveTake.job.instrument}
                priceCents={liveTake.job.priceCents}
                showDeadline={false}
              />
            </div>
          </button>
          <Button variant="ghost" size="sm" onClick={onToggle} className="w-full shrink-0 sm:w-auto">
            {expanded ? "Hide" : "View take"}
          </Button>
        </div>

        <div
          className={`grid transition-all duration-200 ease-out ${
            expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="border-t border-gray-100 bg-surface px-4 py-4 sm:px-6 sm:py-5">
              {liveTake.note && (
                <p className="text-sm leading-relaxed text-gray-600">{liveTake.note}</p>
              )}
              <div className={liveTake.note ? "mt-3" : undefined}>
                <TempoTag bpm={liveTake.job.bpm} />
              </div>
              {canReplace ? (
                <div className="mt-4">
                  <SubmitTakeForm
                    jobId={liveTake.jobId}
                    alreadySubmitted
                    existingTakeUrl={liveTake.audioFileUrl}
                    existingFiles={liveTake.files}
                    onSubmitted={(next) =>
                      setLiveTake((prev) => ({
                        ...prev,
                        audioFileUrl: next.audioFileUrl,
                        files: next.files,
                      }))
                    }
                  />
                </div>
              ) : (
                <>
                  <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wider text-gray-400">
                    Your submission
                  </p>
                  <TakeSubmissionFiles
                    files={liveTake.files}
                    fallbackAudioUrl={liveTake.audioFileUrl}
                    allowDownload
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
