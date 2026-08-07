"use client";

import { useEffect, useRef, useState } from "react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { JobMetaTags } from "@/components/JobMetaTags";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Spinner } from "@/components/ui/Spinner";
import type { Job } from "@/lib/types";
import { MySubmissions } from "./MySubmissions";
import { SubmitTakeForm } from "./SubmitTakeForm";

type SubTab = "browse" | "submissions";

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

  useEffect(() => {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then(setJobs);
  }, []);

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
    <div className="space-y-3">
      {jobs.map((job) => (
        <OpenJobCard
          key={job.id}
          job={job}
          expanded={expandedJobId === job.id}
          onToggle={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
        />
      ))}
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
                bpm={job.bpm}
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
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Demo</p>
                <AudioPlayer src={job.demoFileUrl} label="Demo" />
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
