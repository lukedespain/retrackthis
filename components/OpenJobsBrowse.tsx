"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { PayoutSetupPanel, type PayoutSnapshot } from "@/components/PayoutSetupPanel";
import { JobMetaTags, TempoTag } from "@/components/JobMetaTags";
import { ReferenceTracksPlayer } from "@/components/ReferenceTracksPlayer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { emojiForInstrument } from "@/lib/instruments";
import type { Job } from "@/lib/types";
import { SubmitTakeForm } from "@/app/dashboard/SubmitTakeForm";

type MyTakeSummary = { jobId: string; audioFileUrl: string; files?: import("@/lib/takeFiles").TakeFileRecord[] };

/**
 * Shared open-jobs marketplace.
 * Anyone can open a job to read the brief and listen.
 * Submit is gated: sign-up for guests; payouts ready (Stripe or PayPal/Wise) for musicians.
 */
export function OpenJobsBrowse({ signedIn }: { signedIn: boolean }) {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [selectedInstruments, setSelectedInstruments] = useState<Set<string>>(new Set());
  const [myTakesByJob, setMyTakesByJob] = useState<Record<string, MyTakeSummary>>({});
  const [payout, setPayout] = useState<PayoutSnapshot | null>(null);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/jobs")
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(body?.error ?? `Could not load jobs (${res.status})`);
        }
        if (!Array.isArray(body)) {
          throw new Error("Unexpected response loading jobs");
        }
        if (!cancelled) {
          setLoadError(null);
          setJobs(body);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Could not load jobs");
          setJobs([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadPayoutStatus() {
    try {
      const res = await fetch("/api/payouts/status");
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not load payout status");
      setPayout(body as PayoutSnapshot);
      setPayoutError(null);
    } catch {
      setPayout({
        ready: false,
        status: "none",
        provider: null,
        country: null,
        payoutEmail: null,
        payoutAccountName: null,
      });
    }
  }

  useEffect(() => {
    if (!signedIn) {
      setMyTakesByJob({});
      setPayout(null);
      return;
    }
    fetch("/api/takes/mine")
      .then((res) => (res.ok ? res.json() : []))
      .then((takes: Array<{ jobId: string; audioFileUrl: string; files?: MyTakeSummary["files"] }>) => {
        const map: Record<string, MyTakeSummary> = {};
        for (const take of takes) {
          map[take.jobId] = {
            jobId: take.jobId,
            audioFileUrl: take.audioFileUrl,
            files: take.files,
          };
        }
        setMyTakesByJob(map);
      })
      .catch(() => {});

    void loadPayoutStatus();
  }, [signedIn]);

  function handleToggleJob(jobId: string) {
    setExpandedJobId((prev) => (prev === jobId ? null : jobId));
  }

  function handleTakeSubmitted(take: MyTakeSummary) {
    setMyTakesByJob((prev) => {
      const alreadyHad = Boolean(prev[take.jobId]);
      if (!alreadyHad) {
        setJobs((jobs) =>
          jobs
            ? jobs.map((job) =>
                job.id === take.jobId ? { ...job, takeCount: (job.takeCount ?? 0) + 1 } : job
              )
            : jobs
        );
      }
      return { ...prev, [take.jobId]: take };
    });
  }

  const instruments = useMemo(() => {
    if (!jobs) return [];
    return Array.from(new Set(jobs.map((job) => job.instrument))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    if (!jobs) return [];

    const filtered =
      selectedInstruments.size === 0
        ? [...jobs]
        : jobs.filter((job) => selectedInstruments.has(job.instrument));

    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return filtered;
  }, [jobs, selectedInstruments]);

  function toggleInstrument(name: string) {
    setSelectedInstruments((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  if (jobs === null) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (loadError) {
    return (
      <EmptyState
        title="Couldn’t load jobs"
        description={loadError}
        action={
          <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
            Try again
          </Button>
        }
      />
    );
  }

  if (jobs.length === 0) {
    return (
      <EmptyState
        title="No open jobs right now"
        description="Check back soon. New gigs are posted regularly."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <button
          type="button"
          onClick={() => setSelectedInstruments(new Set())}
          aria-pressed={selectedInstruments.size === 0}
          className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs ${
            selectedInstruments.size === 0
              ? "bg-gray-900 text-white"
              : "bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50 hover:text-gray-900"
          }`}
        >
          All
        </button>
        {instruments.map((name) => {
          const selected = selectedInstruments.has(name);
          return (
            <button
              key={name}
              type="button"
              onClick={() => toggleInstrument(name)}
              aria-pressed={selected}
              className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs ${
                selected
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-700 ring-1 ring-inset ring-gray-200 hover:bg-gray-50"
              }`}
            >
              <span aria-hidden="true">{emojiForInstrument(name)}</span>
              <span>{name}</span>
            </button>
          );
        })}
      </div>

      {filteredJobs.length === 0 ? (
        <EmptyState
          title="No jobs for these instruments"
          description="Try selecting All, or pick a different instrument."
          action={
            selectedInstruments.size > 0 ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedInstruments(new Set())}
              >
                Show all
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => (
            <OpenJobCard
              key={job.id}
              job={job}
              signedIn={signedIn}
              expanded={expandedJobId === job.id}
              myTake={myTakesByJob[job.id]}
              payout={signedIn ? payout : null}
              payoutError={payoutError}
              onPayoutError={setPayoutError}
              onPayoutReady={setPayout}
              onPayoutRefresh={loadPayoutStatus}
              onTakeSubmitted={handleTakeSubmitted}
              onToggle={() => handleToggleJob(job.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OpenJobCard({
  job,
  signedIn,
  expanded,
  myTake,
  payout,
  payoutError,
  onPayoutError,
  onPayoutReady,
  onPayoutRefresh,
  onTakeSubmitted,
  onToggle,
}: {
  job: Job;
  signedIn: boolean;
  expanded: boolean;
  myTake?: MyTakeSummary;
  payout: PayoutSnapshot | null;
  payoutError: string | null;
  onPayoutError: (message: string | null) => void;
  onPayoutReady: (snapshot: PayoutSnapshot) => void;
  onPayoutRefresh: () => Promise<void> | void;
  onTakeSubmitted: (take: MyTakeSummary) => void;
  onToggle: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const signUpHref = `/sign-up?next=${encodeURIComponent("/musicians")}`;

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
            <span className="font-medium text-gray-900">{job.title}</span>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <JobMetaTags
                instrument={job.instrument}
                priceCents={job.priceCents}
                deadline={job.deadline}
                takeCount={job.takeCount ?? 0}
              />
              {myTake && (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
                  Your take · pending
                </span>
              )}
            </div>
          </button>
          <Button variant="ghost" size="sm" onClick={onToggle} className="w-full shrink-0 sm:w-auto">
            {expanded ? "Hide" : "View job"}
          </Button>
        </div>

        <div
          className={`grid transition-all duration-200 ease-out ${
            expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="border-t border-gray-100 bg-surface px-4 py-4 sm:px-6 sm:py-5">
              <p className="text-sm leading-relaxed text-gray-600">{job.description}</p>
              <div className="mt-3">
                <TempoTag bpm={job.bpm} />
              </div>
              <div className="mt-4">
                <ReferenceTracksPlayer
                  partSrc={job.demoFileUrl}
                  backingSrc={job.backingFileUrl}
                  bpm={job.bpm}
                  allowDownload={signedIn}
                />
              </div>
              <div className="mt-6">
                {!signedIn ? (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-5 text-center sm:px-6">
                    <p className="text-sm text-gray-600">
                      Like this gig? Create a free account to submit your take.
                    </p>
                    <Link href={signUpHref} className="mt-3 inline-block">
                      <Button size="sm">Sign up to submit</Button>
                    </Link>
                    <p className="mt-2 text-xs text-gray-400">
                      Already have an account?{" "}
                      <Link
                        href={`/sign-in?next=${encodeURIComponent("/musicians")}`}
                        className="font-medium text-gray-600 underline-offset-2 hover:text-gray-900 hover:underline"
                      >
                        Sign in
                      </Link>
                    </p>
                  </div>
                ) : payout === null ? (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-5 sm:px-6">
                    <p className="text-sm text-gray-500">Checking payout setup…</p>
                  </div>
                ) : !payout.ready && !myTake ? (
                  <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/50 px-4 py-5 sm:px-6">
                    <PayoutSetupPanel
                      snapshot={payout}
                      error={payoutError}
                      onRefresh={onPayoutRefresh}
                      onError={onPayoutError}
                      onReady={onPayoutReady}
                      idPrefix={`job-${job.id}-payout`}
                    />
                  </div>
                ) : (
                  <SubmitTakeForm
                    jobId={job.id}
                    alreadySubmitted={Boolean(myTake)}
                    existingTakeUrl={myTake?.audioFileUrl}
                    existingFiles={myTake?.files}
                    onSubmitted={onTakeSubmitted}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
