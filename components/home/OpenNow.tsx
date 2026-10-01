"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { InstrumentIcon } from "@/components/brand/InstrumentIcon";
import { formatCents, formatDeadline } from "@/lib/format";
import { formatPartDuration, musicianFacingPriceCents } from "@/lib/jobPricing";
import type { Job } from "@/lib/types";

function closesAt(deadline: string) {
  const d = new Date(deadline);
  const day = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `Closes ${day} at ${time}`;
}

/** Top three open gigs by pay. Renders nothing until loaded, or when nothing is open. */
export function OpenNow() {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/jobs")
      .then((res) => (res.ok ? res.json() : []))
      .then((body: unknown) => {
        if (cancelled || !Array.isArray(body)) return;
        const now = Date.now();
        const picks = (body as Job[])
          .filter((j) => j.status === "OPEN" && !j.isTest && new Date(j.deadline).getTime() > now)
          .sort((a, b) => musicianFacingPriceCents(b) - musicianFacingPriceCents(a))
          .slice(0, 3);
        setJobs(picks);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (jobs.length === 0) return null;

  return (
    <section className="open-now">
      <div className="on-head">
        <h2>Open right now</h2>
        <Link href="/musicians">
          See all gigs
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
      <div className="on-grid">
        {jobs.map((job) => {
          const due = closesAt(job.deadline);
          const left = formatDeadline(job.deadline, { extended: Boolean(job.deadlineExtendedAt) });
          return (
            <Link key={job.id} className="on-card" href={`/musicians?job=${encodeURIComponent(job.id)}`}>
              <div className="on-top">
                <span className="job-ico">
                  <InstrumentIcon instrument={job.instrument} />
                </span>
                <span className="on-t">
                  <strong>{job.title.split(":")[0]}</strong>
                  <span>{job.instrument}</span>
                </span>
              </div>
              <div className="pills">
                <span className="pill money">{formatCents(musicianFacingPriceCents(job))}</span>
                <span className="pill due" tabIndex={0} data-due={due} aria-label={`${left}. ${due}`}>
                  {left}
                </span>
                {typeof job.durationSeconds === "number" && job.durationSeconds > 0 ? (
                  <span className="pill quiet">Part {formatPartDuration(job.durationSeconds)}</span>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
