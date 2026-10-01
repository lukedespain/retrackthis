"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { type PayoutSnapshot } from "@/components/PayoutSetupPanel";
import { TestJobBadge } from "@/components/TestJobBadge";
import { Avatar } from "@/components/brand/Avatar";
import { InstrumentIcon } from "@/components/brand/InstrumentIcon";
import { ReferenceTracksPlayer } from "@/components/ReferenceTracksPlayer";
import { Spinner } from "@/components/ui/Spinner";
import { requestPostJob } from "@/components/MarketingHeroCtas";
import { formatCents, formatDeadline } from "@/lib/format";
import { formatPartDuration, musicianFacingPriceCents } from "@/lib/jobPricing";
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
  const [meId, setMeId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

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
      setMeId(null);
      setIsAdmin(false);
      return;
    }
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        setMeId(body?.profile?.id ?? null);
        setIsAdmin(Boolean(body?.profile?.isAdmin));
      })
      .catch(() => {
        setMeId(null);
        setIsAdmin(false);
      });
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
      if (sort === "pay") return musicianFacingPriceCents(b) - musicianFacingPriceCents(a);
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
            <button type="button" className="btn text" onClick={requestPostJob}>
              Post a job
            </button>
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
              adminTest={Boolean(isAdmin && job.isTest)}
              mine={Boolean(meId && job.creatorId === meId)}
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
  adminTest = false,
  onTakeSubmitted,
  onToggle,
  mine,
}: {
  job: Job;
  signedIn: boolean;
  expanded: boolean;
  myTake?: MyTakeSummary;
  payout: PayoutSnapshot | null;
  /** Admin on a test job can submit without payout setup. */
  adminTest?: boolean;
  mine: boolean;
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
  const payLabel = formatCents(musicianFacingPriceCents(job));
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
            <span className="pill money">{payLabel}</span>
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
            <div className="by">
              <Avatar avatar={job.poster?.avatar} name={mine ? "You" : job.poster?.name ?? "Producer"} size="sm" />
              Posted by <b>{mine ? "you" : job.poster?.name ?? "a producer"}</b>
            </div>
            <p style={{ color: "var(--ink-2)" }}>{job.description}</p>
            <div className="pills" style={{ margin: 0 }}>
              <span className="pill">{job.bpm ? `${job.bpm} BPM` : "Tempo not fixed"}</span>
              {job.musicalKey ? <span className="pill">{job.musicalKey}</span> : null}
              <span className="pill">
                <InstrumentIcon instrument={job.instrument} />
                {job.instrument}
              </span>
            </div>
            <ReferenceTracksPlayer
              flat
              partSrc={job.demoFileUrl}
              backingSrc={job.backingFileUrl}
              allowDownload={signedIn}
            />
          </div>
          <div className="panel">
            {mine ? (
              <div className="stack" style={{ gap: 12 }}>
                <h3>This is your job</h3>
                <p>This is how musicians see it. Listen to submissions and pick a winner in My jobs.</p>
                <Link href="/producers" className="btn soft" style={{ height: 38, fontSize: 13.5, alignSelf: "flex-start" }}>
                  Go to My jobs
                </Link>
              </div>
            ) : !signedIn ? (
              <div className="stack" style={{ gap: 14 }}>
                <div className="sub-head">
                  <h3>Submit your take</h3>
                  <span className="sub-pay">{payLabel} if picked</span>
                </div>
                <div className="pay-gate">
                  <span className="pg-t">
                    <strong>Create an account to submit</strong>
                    <span>Free to send a take. Set up payouts after you sign up.</span>
                  </span>
                  <Link href={signUpHref} className="btn primary">
                    Sign up
                  </Link>
                </div>
              </div>
            ) : payout === null && !myTake && !adminTest ? (
              <div className="stack" style={{ gap: 14 }}>
                <div className="sub-head">
                  <h3>Submit your take</h3>
                  <span className="sub-pay">{payLabel} if picked</span>
                </div>
                <p>Checking payout setup…</p>
              </div>
            ) : (
              <SubmitTakeForm
                jobId={job.id}
                priceCents={musicianFacingPriceCents(job)}
                payoutReady={Boolean(payout?.ready) || Boolean(myTake) || adminTest}
                alreadySubmitted={Boolean(myTake)}
                existingTakeUrl={myTake?.audioFileUrl}
                existingFiles={myTake?.files}
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
