"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PayoutSetupPanel, type PayoutSnapshot } from "@/components/PayoutSetupPanel";
import { TempoTag } from "@/components/JobMetaTags";
import { TestJobBadge } from "@/components/TestJobBadge";
import { InstrumentIcon } from "@/components/brand/InstrumentIcon";
import { ReferenceTracksPlayer } from "@/components/ReferenceTracksPlayer";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { requestPostJob } from "@/components/MarketingHeroCtas";
import { formatCents, formatDeadline } from "@/lib/format";
import { formatPartDuration } from "@/lib/jobPricing";
import type { Job } from "@/lib/types";
import { SubmitTakeForm } from "@/app/dashboard/SubmitTakeForm";

type MyTakeSummary = { jobId: string; audioFileUrl: string; files?: import("@/lib/takeFiles").TakeFileRecord[] };

/**
 * Shared open-jobs marketplace.
 * Anyone can open a job to read the brief and listen.
 * Submit is gated: sign-up for guests; payouts ready (Stripe or PayPal/Wise) for musicians.
 */
export function OpenJobsBrowse({ signedIn }: { signedIn: boolean }) {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [instrument, setInstrument] = useState("All");
  const [sort, setSort] = useState<"new" | "soon" | "pay">("new");
  const [menu, setMenu] = useState<"inst" | "sort" | null>(null);
  const searchParams = useSearchParams();
  const [myTakesByJob, setMyTakesByJob] = useState<Record<string, MyTakeSummary>>({});
  const [payout, setPayout] = useState<PayoutSnapshot | null>(null);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/jobs")
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(body?.error ?? `Could not load jobs (${res.status})`);
        }
        if (!Array.isArray(body)) {
          throw new Error("Unexpected response loading jobs");
        }
        if (!cancelled) {
          setLoadError(null);
          setJobs(body);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Could not load jobs");
          setJobs([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadPayoutStatus() {
    try {
      const res = await fetch("/api/payouts/status");
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not load payout status");
      setPayout(body as PayoutSnapshot);
      setPayoutError(null);
    } catch {
      setPayout({
        ready: false,
        status: "none",
        provider: null,
        country: null,
        payoutEmail: null,
        payoutAccountName: null,
      });
    }
  }

  useEffect(() => {
    if (!signedIn) {
      setMyTakesByJob({});
      setPayout(null);
      return;
    }
    fetch("/api/takes/mine")
      .then((res) => (res.ok ? res.json() : []))
      .then((takes: Array<{ jobId: string; audioFileUrl: string; files?: MyTakeSummary["files"] }>) => {
        const map: Record<string, MyTakeSummary> = {};
        for (const take of takes) {
          map[take.jobId] = {
            jobId: take.jobId,
            audioFileUrl: take.audioFileUrl,
            files: take.files,
          };
        }
        setMyTakesByJob(map);
      })
      .catch(() => {});

    void loadPayoutStatus();
  }, [signedIn]);

  function handleToggleJob(jobId: string) {
    setExpandedJobId((prev) => (prev === jobId ? null : jobId));
  }

  useEffect(() => {
    const id = searchParams.get("job");
    if (id) setExpandedJobId(id);
  }, [searchParams]);

  useEffect(() => {
    if (!menu) return;
    function close(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest(".fw-dd")) setMenu(null);
    }
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menu]);

  function handleTakeSubmitted(take: MyTakeSummary) {
    setMyTakesByJob((prev) => {
      const alreadyHad = Boolean(prev[take.jobId]);
      if (!alreadyHad) {
        setJobs((jobs) =>
          jobs
            ? jobs.map((job) =>
                job.id === take.jobId ? { ...job, takeCount: (job.takeCount ?? 0) + 1 } : job
              )
            : jobs
        );
      }
      return { ...prev, [take.jobId]: take };
    });
  }

  const instruments = useMemo(() => {
    if (!jobs) return [];
    return Array.from(new Set(jobs.map((job) => job.instrument))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    if (!jobs) return [];
    const filtered =
      instrument === "All" ? [...jobs] : jobs.filter((job) => job.instrument === instrument);
    filtered.sort((a, b) => {
      if (sort === "soon") return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      if (sort === "pay") return b.priceCents - a.priceCents;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return filtered;
  }, [jobs, instrument, sort]);

  if (jobs === null) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (loadError) {
    return <div className="empty">{loadError}</div>;
  }

  const sortLabel = sort === "soon" ? "Due soon" : sort === "pay" ? "Highest pay" : "Newest";
  const instCount = (name: string) =>
    name === "All" ? jobs.length : jobs.filter((job) => job.instrument === name).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Find work</h1>
        </div>
        <div className="fw-tools">
        <FilterMenu
          open={menu === "inst"}
          label={instrument === "All" ? "All instruments" : instrument}
          count={instCount(instrument)}
          lead={<InstrumentIcon instrument={instrument === "All" ? "note" : instrument} />}
          onOpen={() => setMenu(menu === "inst" ? null : "inst")}
          menuClass="fw-menu-inst"
        >
          {["All", ...instruments].map((name) => (
            <button
              key={name}
              type="button"
              className="fw-opt"
              role="menuitemradio"
              aria-checked={instrument === name}
              onClick={() => {
                setInstrument(name);
                setMenu(null);
              }}
            >
              <InstrumentIcon instrument={name === "All" ? "note" : name} />
              <span className="fw-opt-l">{name === "All" ? "All instruments" : name}</span>
              <span className="count">{instCount(name)}</span>
              <span className="fw-tick">
                <CheckIcon />
              </span>
            </button>
          ))}
        </FilterMenu>
        <FilterMenu
          open={menu === "sort"}
          label={sortLabel}
          lead={<SortIcon />}
          onOpen={() => setMenu(menu === "sort" ? null : "sort")}
          menuClass="fw-menu-sort"
        >
          {(
            [
              ["new", "Newest"],
              ["soon", "Due soon"],
              ["pay", "Highest pay"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className="fw-opt"
              role="menuitemradio"
              aria-checked={sort === key}
              onClick={() => {
                setSort(key);
                setMenu(null);
              }}
            >
              <span className="fw-opt-l">{label}</span>
              <span className="fw-tick">
                <CheckIcon />
              </span>
            </button>
          ))}
        </FilterMenu>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="empty">
          No open jobs right now.{" "}
          {signedIn ? (
            <button type="button" className="btn text" onClick={requestPostJob}>
              Post a job
            </button>
          ) : (
            <Link href="/sign-up">Post a job</Link>
          )}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="empty">No jobs for this instrument.</div>
      ) : (
        <div className="jobs">
          {filteredJobs.map((job) => (
            <OpenJobCard
              key={job.id}
              job={job}
              signedIn={signedIn}
              expanded={expandedJobId === job.id}
              myTake={myTakesByJob[job.id]}
              payout={signedIn ? payout : null}
              payoutError={payoutError}
              onPayoutError={setPayoutError}
              onPayoutReady={setPayout}
              onPayoutRefresh={loadPayoutStatus}
              onTakeSubmitted={handleTakeSubmitted}
              onToggle={() => handleToggleJob(job.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function FilterMenu({
  open,
  label,
  count,
  lead,
  menuClass,
  onOpen,
  children,
}: {
  open: boolean;
  label: string;
  count?: number;
  lead: ReactNode;
  menuClass: string;
  onOpen: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fw-dd">
      <button type="button" className="chip fw-chip" aria-expanded={open} aria-haspopup="menu" onClick={onOpen}>
        {lead}
        <span>
          {label}
          {count != null ? <span className="count"> {count}</span> : null}
        </span>
        <ChevronIcon />
      </button>
      {open ? (
        <div className={`menu fw-menu ${menuClass}`} role="menu">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function OpenJobCard({
  job,
  signedIn,
  expanded,
  myTake,
  payout,
  payoutError,
  onPayoutError,
  onPayoutReady,
  onPayoutRefresh,
  onTakeSubmitted,
  onToggle,
}: {
  job: Job;
  signedIn: boolean;
  expanded: boolean;
  myTake?: MyTakeSummary;
  payout: PayoutSnapshot | null;
  payoutError: string | null;
  onPayoutError: (message: string | null) => void;
  onPayoutReady: (snapshot: PayoutSnapshot) => void;
  onPayoutRefresh: () => Promise<void> | void;
  onTakeSubmitted: (take: MyTakeSummary) => void;
  onToggle: () => void;
}) {
  const cardRef = useRef<HTMLElement>(null);
  const signUpHref = `/sign-up?next=${encodeURIComponent("/musicians")}`;

  useEffect(() => {
    if (expanded) {
      cardRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [expanded]);

  const due = formatDeadline(job.deadline, { extended: Boolean(job.deadlineExtendedAt) });
  const closes = new Date(job.deadline).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <article ref={cardRef} className="job">
      <div className="job-head" onClick={onToggle}>
        <span className="job-ico">
          <InstrumentIcon instrument={job.instrument} />
        </span>
        <div className="job-main">
          <div className="job-title">
            {job.title}
            {job.isTest ? <TestJobBadge /> : null}
            {myTake ? <span className="status mine">Your take · pending</span> : null}
          </div>
          <div className="pills">
            <span className="pill money">{formatCents(job.priceCents)}</span>
            {job.durationSeconds ? (
              <span className="pill">Part {formatPartDuration(job.durationSeconds)}</span>
            ) : null}
            <span className="pill due" tabIndex={0} data-due={`Closes ${closes}`} aria-label={`${due}. Closes ${closes}`}>
              {due}
            </span>
            <span className="pill quiet">
              {(job.takeCount ?? 0) === 0
                ? "No submissions yet"
                : `${job.takeCount} submission${job.takeCount === 1 ? "" : "s"}`}
            </span>
          </div>
        </div>
        <button type="button" className="chip-btn" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
          {expanded ? "Hide" : "View job"}
        </button>
      </div>

      {expanded ? (
        <div className="job-body">
          <div className="panel">
            <p>{job.description}</p>
            <div className="pills" style={{ margin: 0 }}>
              <TempoTag bpm={job.bpm} />
              <span className="pill">{job.instrument}</span>
            </div>
            <ReferenceTracksPlayer
              partSrc={job.demoFileUrl}
              backingSrc={job.backingFileUrl}
              allowDownload={signedIn}
            />
          </div>
          <div className="panel">
                {!signedIn ? (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-5 text-center sm:px-6">
                    <p className="text-sm text-gray-600">
                      Like this gig? Create a free account to submit your take.
                    </p>
                    <Link href={signUpHref} className="mt-3 inline-block">
                      <Button size="sm">Sign up to submit</Button>
                    </Link>
                    <p className="mt-2 text-xs text-gray-400">
                      Already have an account?{" "}
                      <Link
                        href={`/sign-in?next=${encodeURIComponent("/musicians")}`}
                        className="font-medium text-gray-600 underline-offset-2 hover:text-gray-900 hover:underline"
                      >
                        Sign in
                      </Link>
                    </p>
                  </div>
                ) : payout === null ? (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-5 sm:px-6">
                    <p className="text-sm text-gray-500">Checking payout setup…</p>
                  </div>
                ) : !payout.ready && !myTake ? (
                  <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/50 px-4 py-5 sm:px-6">
                    <PayoutSetupPanel
                      snapshot={payout}
                      error={payoutError}
                      onRefresh={onPayoutRefresh}
                      onError={onPayoutError}
                      onReady={onPayoutReady}
                      idPrefix={`job-${job.id}-payout`}
                    />
                  </div>
                ) : (
                  <SubmitTakeForm
                    jobId={job.id}
                    alreadySubmitted={Boolean(myTake)}
                    existingTakeUrl={myTake?.audioFileUrl}
                    existingFiles={myTake?.files}
                    backingSrc={job.backingFileUrl}
                    onSubmitted={onTakeSubmitted}
                  />
                )}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l5 5L19 7" />
    </svg>
  );
}
function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
function SortIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 7h12M8 12h8M8 17h4M4 7h.01M4 12h.01M4 17h.01" />
    </svg>
  );
}
