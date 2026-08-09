"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { JobMetaTags, TempoTag } from "@/components/JobMetaTags";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Spinner } from "@/components/ui/Spinner";
import { formatCents } from "@/lib/format";
import type { Job } from "@/lib/types";
import { MySubmissions } from "./MySubmissions";
import { SubmitTakeForm } from "./SubmitTakeForm";

type SubTab = "browse" | "submissions";

const DUE_WITHIN_OPTIONS = [
  { value: "", label: "Any deadline" },
  { value: "7", label: "Due within 7 days" },
  { value: "14", label: "Due within 14 days" },
  { value: "30", label: "Due within 30 days" },
  { value: "60", label: "Due within 60 days" },
] as const;

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
  const [instrument, setInstrument] = useState("");
  const [minPriceCents, setMinPriceCents] = useState(0);
  const [dueWithinDays, setDueWithinDays] = useState("");

  useEffect(() => {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then((data: Job[]) => {
        setJobs(data);
        if (data.length > 0) {
          setMinPriceCents(0);
        }
      });
  }, []);

  const instruments = useMemo(() => {
    if (!jobs) return [];
    return Array.from(new Set(jobs.map((job) => job.instrument))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [jobs]);

  const priceBounds = useMemo(() => {
    if (!jobs || jobs.length === 0) return { min: 0, max: 10000 };
    const prices = jobs.map((job) => job.priceCents);
    return { min: 0, max: Math.max(...prices) };
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    if (!jobs) return [];
    const now = Date.now();
    const dueLimitMs = dueWithinDays
      ? now + Number(dueWithinDays) * 24 * 60 * 60 * 1000
      : null;

    return jobs.filter((job) => {
      if (instrument && job.instrument !== instrument) return false;
      if (job.priceCents < minPriceCents) return false;
      if (dueLimitMs !== null && new Date(job.deadline).getTime() > dueLimitMs) return false;
      return true;
    });
  }, [jobs, instrument, minPriceCents, dueWithinDays]);

  const filtersActive = instrument !== "" || minPriceCents > 0 || dueWithinDays !== "";

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

  return (
    <div className="space-y-4">
      <div className="grid gap-4 rounded-2xl border border-gray-100 bg-white p-4 sm:grid-cols-3 sm:p-5">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700">Instrument</span>
          <select
            value={instrument}
            onChange={(e) => setInstrument(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-all duration-150 ease-out hover:border-gray-300 focus:border-accent focus:ring-2 focus:ring-accent/10"
          >
            <option value="">All instruments</option>
            {instruments.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700">
            Paying at least {formatCents(minPriceCents)}
          </span>
          <input
            type="range"
            min={priceBounds.min}
            max={priceBounds.max}
            step={100}
            value={Math.min(minPriceCents, priceBounds.max)}
            onChange={(e) => setMinPriceCents(Number(e.target.value))}
            className="mt-3 w-full accent-accent"
          />
          <div className="mt-1 flex justify-between text-xs text-gray-400">
            <span>{formatCents(priceBounds.min)}</span>
            <span>{formatCents(priceBounds.max)}</span>
          </div>
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700">Deadline</span>
          <select
            value={dueWithinDays}
            onChange={(e) => setDueWithinDays(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-all duration-150 ease-out hover:border-gray-300 focus:border-accent focus:ring-2 focus:ring-accent/10"
          >
            {DUE_WITHIN_OPTIONS.map((opt) => (
              <option key={opt.value || "any"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {filtersActive && (
          <div className="sm:col-span-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setInstrument("");
                setMinPriceCents(0);
                setDueWithinDays("");
              }}
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {filteredJobs.length === 0 ? (
        <EmptyState
          title="No jobs match these filters"
          description="Try widening the instrument, pay, or deadline filters."
          action={
            filtersActive ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setInstrument("");
                  setMinPriceCents(0);
                  setDueWithinDays("");
                }}
              >
                Clear filters
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
