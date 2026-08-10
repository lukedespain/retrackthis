"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { JobMetaTags, TempoTag } from "@/components/JobMetaTags";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { emojiForInstrument } from "@/lib/instruments";
import type { Job } from "@/lib/types";
import { SubmitTakeForm } from "@/app/dashboard/SubmitTakeForm";

type SortKey = "pay" | "posted";
type SortDir = "asc" | "desc";
type MyTakeSummary = { jobId: string; audioFileUrl: string };

/**
 * Shared open-jobs marketplace.
 * `signedIn` false = public browse; submit is gated behind sign-up.
 */
export function OpenJobsBrowse({ signedIn }: { signedIn: boolean }) {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [selectedInstruments, setSelectedInstruments] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("posted");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [myTakesByJob, setMyTakesByJob] = useState<Record<string, MyTakeSummary>>({});

  useEffect(() => {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then(setJobs);
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    fetch("/api/takes/mine")
      .then((res) => (res.ok ? res.json() : []))
      .then((takes: Array<{ jobId: string; audioFileUrl: string }>) => {
        const map: Record<string, MyTakeSummary> = {};
        for (const take of takes) {
          map[take.jobId] = { jobId: take.jobId, audioFileUrl: take.audioFileUrl };
        }
        setMyTakesByJob(map);
      })
      .catch(() => {});
  }, [signedIn]);

  function handleTakeSubmitted(take: MyTakeSummary) {
    setMyTakesByJob((prev) => ({ ...prev, [take.jobId]: take }));
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

    filtered.sort((a, b) => {
      const aVal = sortKey === "pay" ? a.priceCents : new Date(a.createdAt).getTime();
      const bVal = sortKey === "pay" ? b.priceCents : new Date(b.createdAt).getTime();
      return sortDir === "desc" ? bVal - aVal : aVal - bVal;
    });

    return filtered;
  }, [jobs, selectedInstruments, sortKey, sortDir]);

  function toggleInstrument(name: string) {
    setSelectedInstruments((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function cycleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "desc" ? "asc" : "desc"));
      return;
    }
    setSortKey(key);
    setSortDir("desc");
  }

  if (jobs === null) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
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

  const payLabel =
    sortKey === "pay"
      ? sortDir === "desc"
        ? "Pay · high → low"
        : "Pay · low → high"
      : "Pay";
  const dateLabel =
    sortKey === "posted" ? (sortDir === "desc" ? "Newest" : "Oldest") : "Date";

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedInstruments(new Set())}
            aria-pressed={selectedInstruments.size === 0}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 ${
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
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 ${
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

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Sort</span>
          <button
            type="button"
            onClick={() => cycleSort("pay")}
            aria-pressed={sortKey === "pay"}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 ${
              sortKey === "pay"
                ? "bg-accent text-white"
                : "bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            {payLabel}
          </button>
          <button
            type="button"
            onClick={() => cycleSort("posted")}
            aria-pressed={sortKey === "posted"}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 ${
              sortKey === "posted"
                ? "bg-accent text-white"
                : "bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            {dateLabel}
          </button>
        </div>
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
              onTakeSubmitted={handleTakeSubmitted}
              onToggle={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
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
  onTakeSubmitted,
  onToggle,
}: {
  job: Job;
  signedIn: boolean;
  expanded: boolean;
  myTake?: MyTakeSummary;
  onTakeSubmitted: (take: MyTakeSummary) => void;
  onToggle: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const signUpHref = `/sign-up?next=${encodeURIComponent("/dashboard")}`;

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
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Demo</p>
                <AudioPlayer src={job.demoFileUrl} label="Demo" allowDownload={signedIn} />
              </div>
              <div className="mt-6">
                {signedIn ? (
                  <SubmitTakeForm
                    jobId={job.id}
                    alreadySubmitted={Boolean(myTake)}
                    existingTakeUrl={myTake?.audioFileUrl}
                    onSubmitted={onTakeSubmitted}
                  />
                ) : (
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
                        href={`/sign-in?next=${encodeURIComponent("/dashboard")}`}
                        className="font-medium text-gray-600 underline-offset-2 hover:text-gray-900 hover:underline"
                      >
                        Sign in
                      </Link>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
