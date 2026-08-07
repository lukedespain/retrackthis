"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatCents, formatDeadline } from "@/lib/format";
import type { Job } from "@/lib/types";
import { MySubmissions } from "./MySubmissions";
import { SubmitTakeForm } from "./SubmitTakeForm";

type SubTab = "browse" | "submissions";

export function MusicianView() {
  const [subTab, setSubTab] = useState<SubTab>("browse");

  return (
    <div>
      <div className="flex items-center justify-between">
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
        />
      </div>

      <div className="mt-8">{subTab === "browse" ? <BrowseJobs /> : <MySubmissions />}</div>
    </div>
  );
}

function BrowseJobs() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then(setJobs);
  }, []);

  const selectedJob = jobs?.find((j) => j.id === selectedJobId) ?? null;

  if (jobs === null) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-accent" />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <EmptyState
        title="No open jobs right now"
        description="Check back soon — new gigs are posted regularly."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div className="space-y-2">
        {jobs.map((job) => (
          <Card
            key={job.id}
            padding="sm"
            hover
            selected={selectedJobId === job.id}
            onClick={() => setSelectedJobId(job.id)}
          >
            <span className="font-medium text-gray-900">{job.title}</span>
            <p className="mt-1 text-sm text-gray-500">
              {job.instrument} · {formatCents(job.priceCents)} · {formatDeadline(job.deadline)}
            </p>
          </Card>
        ))}
      </div>

      <div>
        {selectedJob ? (
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-gray-900">{selectedJob.title}</h3>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
              <span>{selectedJob.instrument}</span>
              <span>{formatCents(selectedJob.priceCents)}</span>
              <span>{formatDeadline(selectedJob.deadline)}</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">{selectedJob.description}</p>
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Demo</p>
              <audio controls src={selectedJob.demoFileUrl} className="h-9 w-full max-w-sm" />
            </div>
            <div className="mt-8">
              <SubmitTakeForm jobId={selectedJob.id} />
            </div>
          </div>
        ) : (
          <EmptyState
            title="Select a job"
            description="Choose a gig from the list to see details and submit your take."
          />
        )}
      </div>
    </div>
  );
}
