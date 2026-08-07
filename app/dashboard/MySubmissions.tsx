"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCents } from "@/lib/format";
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
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-accent" />
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
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-medium text-gray-900">{take.job.title}</span>
            <Badge status={statusFor(take)} />
          </div>
          <p className="mt-1.5 text-sm text-gray-500">
            {take.job.instrument} · {formatCents(take.job.priceCents)}
          </p>
          {take.note && <p className="mt-2 text-sm text-gray-500">{take.note}</p>}
          <audio controls src={take.audioFileUrl} className="mt-3 h-9 w-full max-w-sm" />
        </Card>
      ))}
    </div>
  );
}
