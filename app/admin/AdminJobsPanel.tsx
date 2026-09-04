"use client";

import { useMemo, useState } from "react";
import { EditJobForm } from "@/app/dashboard/EditJobForm";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Job } from "@/lib/types";

export type AdminJobRow = Job & {
  creator: { id: string; name: string; email: string };
  priceLabel: string;
  paymentStatus: string | null;
  missingBacking: boolean;
  flexibleTempo: boolean;
};

export function AdminJobsPanel({
  jobs,
  onChanged,
}: {
  jobs: AdminJobRow[];
  onChanged: () => void;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"OPEN" | "all">("OPEN");
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((job) => {
      if (statusFilter !== "all" && job.status !== statusFilter) return false;
      if (!q) return true;
      return (
        job.title.toLowerCase().includes(q) ||
        job.creator.name.toLowerCase().includes(q) ||
        job.creator.email.toLowerCase().includes(q) ||
        job.instrument.toLowerCase().includes(q)
      );
    });
  }, [jobs, query, statusFilter]);

  const editingJob = editingId ? jobs.find((j) => j.id === editingId) : null;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Edit open jobs on behalf of creators — price and payment stay locked.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "OPEN" | "all")}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
          >
            <option value="OPEN">Open only</option>
            <option value="all">All statuses</option>
          </select>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, creator, instrument…"
            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 outline-none ring-accent/30 placeholder:text-gray-400 focus:ring-2 sm:max-w-xs dark:border-gray-700 dark:bg-gray-950 dark:text-white"
          />
        </div>
      </div>

      {editingJob && editingJob.status === "OPEN" && (
        <EditJobForm
          key={editingJob.id}
          job={editingJob}
          adminAs={{
            name: editingJob.creator.name,
            email: editingJob.creator.email,
            priceLabel: editingJob.priceLabel,
          }}
          onCancel={() => setEditingId(null)}
          onSaved={() => {
            setEditingId(null);
            onChanged();
          }}
        />
      )}

      <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900/80 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Job</th>
              <th className="px-4 py-3 font-medium">Creator</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Setup</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">
                  No jobs match.
                </td>
              </tr>
            ) : (
              filtered.map((job) => (
                <tr key={job.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">{job.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge status={job.status} />
                      <span className="text-xs text-gray-500">{job.instrument}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-900 dark:text-white">{job.creator.name}</div>
                    <div className="text-xs text-gray-500">{job.creator.email}</div>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-gray-700 dark:text-gray-300">
                    {job.priceLabel}
                    <div className="text-[11px] text-gray-400">Locked</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {job.missingBacking ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                          Needs background
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          Has background
                        </span>
                      )}
                      {job.flexibleTempo ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                          Flexible tempo
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          {job.bpm} BPM
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {job.status === "OPEN" ? (
                      <Button
                        size="sm"
                        variant={editingId === job.id ? "secondary" : "ghost"}
                        onClick={() => setEditingId(editingId === job.id ? null : job.id)}
                      >
                        {editingId === job.id ? "Editing…" : "Edit for them"}
                      </Button>
                    ) : (
                      <span className="text-xs text-gray-400">Closed</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
