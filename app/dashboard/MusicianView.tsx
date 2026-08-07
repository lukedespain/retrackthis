"use client";

import { useEffect, useState } from "react";
import { formatCents, formatDeadline } from "@/lib/format";
import type { Job } from "@/lib/types";
import { MySubmissions } from "./MySubmissions";
import { SubmitTakeForm } from "./SubmitTakeForm";

type SubTab = "browse" | "submissions";

export function MusicianView() {
  const [subTab, setSubTab] = useState<SubTab>("browse");

  return (
    <div>
      <div className="flex gap-1 border-b border-gray-100">
        <SubTabButton active={subTab === "browse"} onClick={() => setSubTab("browse")}>
          Open jobs
        </SubTabButton>
        <SubTabButton active={subTab === "submissions"} onClick={() => setSubTab("submissions")}>
          My submissions
        </SubTabButton>
      </div>

      <div className="mt-6">{subTab === "browse" ? <BrowseJobs /> : <MySubmissions />}</div>
    </div>
  );
}

function SubTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium transition-colors ${
        active ? "border-b-2 border-accent text-gray-900" : "text-gray-400 hover:text-gray-600"
      }`}
    >
      {children}
    </button>
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

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_1.2fr]">
      <div className="space-y-3">
        {jobs === null && <p className="text-sm text-gray-400">Loading…</p>}
        {jobs?.length === 0 && <p className="text-sm text-gray-400">No open jobs right now.</p>}
        {jobs?.map((job) => (
          <button
            key={job.id}
            onClick={() => setSelectedJobId(job.id)}
            className={`block w-full rounded-2xl border px-6 py-4 text-left transition-colors ${
              selectedJobId === job.id ? "border-accent bg-accent/5" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <span className="font-medium text-gray-900">{job.title}</span>
            <p className="mt-1 text-sm text-gray-500">
              {job.instrument} · {formatCents(job.priceCents)} · {formatDeadline(job.deadline)}
            </p>
          </button>
        ))}
      </div>

      <div>
        {selectedJob ? (
          <div>
            <h2 className="text-lg font-medium text-gray-900">{selectedJob.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">{selectedJob.description}</p>
            <audio controls src={selectedJob.demoFileUrl} className="mt-3 h-9 w-full max-w-sm" />
            <div className="mt-6">
              <SubmitTakeForm jobId={selectedJob.id} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Select a job to see details and submit a take.</p>
        )}
      </div>
    </div>
  );
}
