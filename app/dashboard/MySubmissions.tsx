"use client";

import { useEffect, useState } from "react";
import { formatCents } from "@/lib/format";
import type { MyTake } from "@/lib/types";

function statusFor(take: MyTake) {
  if (take.isWinner) return { label: "Selected", className: "bg-accent/10 text-accent" };
  if (take.job.status === "AWARDED") return { label: "Not selected", className: "bg-gray-100 text-gray-500" };
  if (take.job.status === "CANCELLED") return { label: "Job cancelled", className: "bg-gray-100 text-gray-500" };
  return { label: "Pending", className: "bg-emerald-50 text-emerald-700" };
}

export function MySubmissions() {
  const [takes, setTakes] = useState<MyTake[] | null>(null);

  useEffect(() => {
    fetch("/api/takes/mine")
      .then((res) => res.json())
      .then(setTakes);
  }, []);

  if (takes === null) return <p className="text-sm text-gray-400">Loading…</p>;
  if (takes.length === 0) return <p className="text-sm text-gray-400">You haven't submitted any takes yet.</p>;

  return (
    <div className="space-y-3">
      {takes.map((take) => {
        const status = statusFor(take);
        return (
          <div key={take.id} className="rounded-2xl border border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-medium text-gray-900">{take.job.title}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
                    {status.label}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {take.job.instrument} · {formatCents(take.job.priceCents)}
                </p>
              </div>
            </div>
            {take.note && <p className="mt-2 text-sm text-gray-500">{take.note}</p>}
            <audio controls src={take.audioFileUrl} className="mt-2 h-9 w-72" />
          </div>
        );
      })}
    </div>
  );
}
