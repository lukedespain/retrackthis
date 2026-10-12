"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { InstrumentIcon } from "@/components/brand/InstrumentIcon";
import { requestPostJob } from "@/components/MarketingHeroCtas";
import { searchInstruments } from "@/components/InstrumentTypeahead";
import type { InstrumentCategory } from "@/lib/instruments";
import { savePendingInstruments } from "@/lib/pendingInstruments";
import { useInstrumentCatalog } from "@/lib/useApprovedInstruments";

type RecentJob = { instrument: string; payoutCents: number; pickedAt: string | null };

/** Whole dollars, rounded down so a public "paid" figure never overstates. */
const dollars = (cents: number) => "$" + Math.floor(cents / 100).toLocaleString("en-US");
const monthDay = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

/** Instrument search over the same catalog and ids as onboarding and Settings. */
function InstrumentSearch({
  picked,
  setPicked,
}: {
  picked: InstrumentCategory[];
  setPicked: (next: InstrumentCategory[]) => void;
}) {
  const { catalog } = useInstrumentCatalog();
  const [query, setQuery] = useState("");
  const hits = useMemo(
    () => searchInstruments(query, 6, catalog).filter((i) => !picked.some((p) => p.id === i.id)),
    [query, catalog, picked]
  );
  const add = (item: InstrumentCategory) => {
    setPicked([...picked, item]);
    setQuery("");
  };
  return (
    <div className="fw-find-wrap">
      <div className="fw-find-field">
        <SearchIcon />
        <input
          className="in"
          type="search"
          value={query}
          placeholder="What do you play?"
          aria-label="What do you play?"
          autoComplete="off"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && hits[0]) {
              e.preventDefault();
              add(hits[0]);
            }
          }}
        />
        {query.trim() && hits.length ? (
          <div className="fw-find-menu" role="listbox">
            {hits.map((item) => (
              <button key={item.id} type="button" role="option" aria-selected={false} onClick={() => add(item)}>
                <InstrumentIcon instrument={item.label} />
                <span>{item.label}</span>
                <span className="fw-find-grp">{item.groupLabel}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {picked.length ? (
        <div className="ip-mine">
          {picked.map((item) => (
            <button
              key={item.id}
              type="button"
              className="ip-chip"
              aria-label={`Remove ${item.label}`}
              onClick={() => setPicked(picked.filter((x) => x.id !== item.id))}
            >
              {item.label}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Signed-out block under the Find Work list: pick instruments, then sign up with
 * them carried into onboarding (see lib/pendingInstruments). Beside it, recent
 * completed jobs from /api/stats/public as proof the work is real.
 */
export function FindWorkNext() {
  const router = useRouter();
  const [picked, setPicked] = useState<InstrumentCategory[]>([]);
  const [recent, setRecent] = useState<RecentJob[]>([]);

  useEffect(() => {
    fetch("/api/stats/public")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => setRecent(Array.isArray(body?.recentPicks) ? body.recentPicks : []))
      .catch(() => setRecent([]));
  }, []);

  function getAlerts() {
    const ids = picked.map((p) => p.id);
    savePendingInstruments(ids);
    const params = new URLSearchParams({ next: "/musicians" });
    if (ids.length) params.set("instruments", ids.join(","));
    router.push(`/sign-up?${params.toString()}`);
  }

  return (
    <section className="fw-next">
      <div className="fw-split fw-split-top">
        <div className="fw-split-copy">
          <h2>Don&apos;t see a job for you yet?</h2>
          <p>We&apos;re just getting started. Tell us what you play and we&apos;ll email you when a job needs it.</p>
          <div className="fw-picks-search">
            <InstrumentSearch picked={picked} setPicked={setPicked} />
          </div>
          <button type="button" className="btn primary fw-cta-iris" onClick={getAlerts}>
            Get job alerts
          </button>
        </div>
        {recent.length ? (
          <div className="fw-feed">
            <div className="fw-feed-h">Recent jobs</div>
            {recent.map((job, i) => (
              <div key={i} className="fw-feed-row">
                <span className="fw-feed-ico">
                  <InstrumentIcon instrument={job.instrument} />
                </span>
                <div>
                  <strong>{job.instrument}</strong>
                  {job.pickedAt ? <span>Completed {monthDay(job.pickedAt)}</span> : null}
                </div>
                <span className="pill money">{dollars(job.payoutCents)} paid</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div className="fw-next-foot">
        Need a demo retracked?{" "}
        <button type="button" onClick={requestPostJob}>
          Post a job
        </button>
      </div>
    </section>
  );
}
