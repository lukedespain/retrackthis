"use client";

import { useEffect, useRef, useState } from "react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { JobMetaTags, TempoTag } from "@/components/JobMetaTags";
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

export function MySubmissions() {
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

  if (takes.length === 0) {
    return (
      <EmptyState
        title="No submissions yet"
        description="Browse open jobs and submit your first take to get started."
      />
    );
  }

  return (
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
              <span className="font-medium text-gray-900">{take.job.title}</span>
              <Badge status={statusFor(take)} />
            </div>
            <div className="mt-2.5">
              <JobMetaTags
                instrument={take.job.instrument}
                priceCents={take.job.priceCents}
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
              {take.note && (
                <p className="text-sm leading-relaxed text-gray-600">{take.note}</p>
              )}
              <div className={take.note ? "mt-3" : undefined}>
                <TempoTag bpm={take.job.bpm} />
              </div>
              <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wider text-gray-400">
                Your take
              </p>
              <AudioPlayer src={take.audioFileUrl} label="Take" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
