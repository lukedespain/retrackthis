"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { JobMetaTags, TempoTag } from "@/components/JobMetaTags";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Spinner } from "@/components/ui/Spinner";
import { emojiForInstrument } from "@/lib/instruments";
import type { Job } from "@/lib/types";
import { MySubmissions } from "./MySubmissions";
import { SubmitTakeForm } from "./SubmitTakeForm";

type SubTab = "browse" | "submissions";
type SortKey = "pay" | "posted";
type SortDir = "asc" | "desc";

export function MusicianView() {
  const [subTab, setSubTab] = useState<SubTab>("browse");

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {subTab === "browse" ? "Open jobs" : "My submissions"}
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {subTab === "browse"
              ? "Browse available gigs and submit your take"
              : "Track the status of your submitted takes"}
          </p>
        </div>
        <SegmentedControl
          options={[
            { value: "browse" as const, label: "Open jobs" },
            { value: "submissions" as const, label: "My submissions" },
          ]}
          value={subTab}
          onChange={setSubTab}
          className="self-start"
        />
      </div>

      <div className="mt-6 sm:mt-8">{subTab === "browse" ? <BrowseJobs /> : <MySubmissions />}</div>
    </div>
  );
}

function BrowseJobs() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  /** Empty set = all instruments */
  const [selectedInstruments, setSelectedInstruments] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("posted");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then(setJobs);
  }, []);

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
      const aVal =
        sortKey === "pay" ? a.priceCents : new Date(a.createdAt).getTime();
      const bVal =
        sortKey === "pay" ? b.priceCents : new Date(b.createdAt).getTime();
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
    sortKey === "posted"
      ? sortDir === "desc"
        ? "Newest"
        : "Oldest"
      : "Date";

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
          <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Sort
          </span>
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
              expanded={expandedJobId === job.id}
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
  expanded,
  onToggle,
}: {
  job: Job;
  expanded: boolean;
  onToggle: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

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
            <div className="mt-2.5">
              <JobMetaTags
                instrument={job.instrument}
                priceCents={job.priceCents}
                deadline={job.deadline}
              />
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
                <AudioPlayer src={job.demoFileUrl} label="Demo" allowDownload />
              </div>
              <div className="mt-6">
                <SubmitTakeForm jobId={job.id} />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
