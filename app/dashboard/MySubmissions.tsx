"use client";

import { useEffect, useState } from "react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { JobMetaTags } from "@/components/JobMetaTags";
import { Badge } from "@/components/ui/Badge";
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
        <Card key={take.id} padding="sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-gray-900">{take.job.title}</span>
            <Badge status={statusFor(take)} />
          </div>
          <div className="mt-2.5">
            <JobMetaTags
              instrument={take.job.instrument}
              priceCents={take.job.priceCents}
              bpm={take.job.bpm}
              showDeadline={false}
            />
          </div>
          {take.note && <p className="mt-2 text-sm leading-relaxed text-gray-500">{take.note}</p>}
          <AudioPlayer src={take.audioFileUrl} label="Take" className="mt-3" />
        </Card>
      ))}
    </div>
  );
}
