"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { InstrumentIcon } from "@/components/brand/InstrumentIcon";
import { requestPostJob } from "@/components/MarketingHeroCtas";
import { searchInstruments } from "@/components/InstrumentTypeahead";
import { labelForInstrumentId } from "@/lib/instruments";
import { savePendingInstruments } from "@/lib/pendingInstruments";
import { useInstrumentCatalog } from "@/lib/useApprovedInstruments";

type RecentJob = { instrument: string; payoutCents: number; pickedAt: string | null };

/** Whole dollars, rounded down so a public "paid" figure never overstates. */
const dollars = (cents: number) => "$" + Math.floor(cents / 100).toLocaleString("en-US");
const monthDay = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

function useInstrumentLabel() {
  const { catalog } = useInstrumentCatalog();
  return (id: string) => catalog.find((item) => item.id === id)?.label ?? labelForInstrumentId(id);
}

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
  selectedIds,
  onAdd,
  onRemove,
}: {
  selectedIds: string[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const { catalog } = useInstrumentCatalog();
  const labelFor = useInstrumentLabel();
  const [query, setQuery] = useState("");
  const hits = useMemo(
    () => searchInstruments(query, 6, catalog).filter((i) => !selectedIds.includes(i.id)),
    [query, catalog, selectedIds]
  );
  const add = (id: string) => {
    onAdd(id);
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
              add(hits[0].id);
            }
          }}
        />
        {query.trim() && hits.length ? (
          <div className="fw-find-menu" role="listbox">
            {hits.map((item) => (
              <button key={item.id} type="button" role="option" aria-selected={false} onClick={() => add(item.id)}>
                <InstrumentIcon instrument={item.label} />
                <span>{item.label}</span>
                <span className="fw-find-grp">{item.groupLabel}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {selectedIds.length ? (
        <div className="fw-mine edit">
          {selectedIds.map((id) => (
            <button key={id} type="button" aria-label={`Remove ${labelFor(id)}`} onClick={() => onRemove(id)}>
              <InstrumentIcon instrument={labelFor(id)} />
              {labelFor(id)}
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

function RecentJobs({ compact = false }: { compact?: boolean }) {
  const [recent, setRecent] = useState<RecentJob[]>([]);
  useEffect(() => {
    fetch("/api/stats/public")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => setRecent(Array.isArray(body?.recentPicks) ? body.recentPicks : []))
      .catch(() => setRecent([]));
  }, []);
  if (!recent.length) return null;
  return (
    <div className={compact ? "fw-feed compact" : "fw-feed"}>
      <div className="fw-feed-h">Recent jobs</div>
      {(compact ? recent.slice(0, 3) : recent).map((job, i) => (
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
  );
}

function ProducerFoot() {
  return (
    <div className="fw-next-foot">
      Need a demo retracked?{" "}
      <button type="button" onClick={requestPostJob}>
        Post a job
      </button>
    </div>
  );
}

/**
 * Signed-out block under the Find Work list: pick instruments, then sign up with
 * them carried into onboarding (see lib/pendingInstruments).
 */
export function FindWorkNext() {
  const router = useRouter();
  const [ids, setIds] = useState<string[]>([]);

  function getAlerts() {
    savePendingInstruments(ids);
    const params = new URLSearchParams({ next: "/musicians" });
    if (ids.length) params.set("instruments", ids.join(","));
    router.push(`/sign-up?${params.toString()}`);
  }

  return (
    <section className="fw-next">
      <div className="fw-split">
        <div className="fw-split-copy">
          <h2>Don&apos;t see a job for you yet?</h2>
          <p>We&apos;re just getting started. Tell us what you play and we&apos;ll email you when a job needs it.</p>
          <div className="fw-picks-search">
            <InstrumentSearch
              selectedIds={ids}
              onAdd={(id) => setIds((cur) => [...cur, id])}
              onRemove={(id) => setIds((cur) => cur.filter((x) => x !== id))}
            />
          </div>
          <button type="button" className="btn primary fw-cta-iris" onClick={getAlerts}>
            Get job alerts
          </button>
        </div>
        <RecentJobs />
      </div>
      <ProducerFoot />
    </section>
  );
}

type AlertsPreview = "on" | "off" | "empty";
const PREVIEW_IDS = ["cello", "piano-grand", "vocal-male"];

/**
 * Signed-in block in the same spot: shows the instruments job alerts match on and
 * links to the Settings section that fixes whatever is missing. Alerts only send
 * when notifyJobAlerts is on AND at least one instrument is saved, so each of
 * those cases gets its own copy.
 */
export function FindWorkAlerts() {
  const labelFor = useInstrumentLabel();
  const searchParams = useSearchParams();
  // Localhost-only: ?alerts=on|off|empty previews a state without reading real settings.
  const preview =
    process.env.NODE_ENV === "development"
      ? ((["on", "off", "empty"] as const).find((v) => v === searchParams.get("alerts")) ?? null)
      : null;

  const [ids, setIds] = useState<string[] | null>(null);
  const [alertsOn, setAlertsOn] = useState<boolean | null>(null);

  useEffect(() => {
    if (preview) {
      setIds(preview === "empty" ? [] : PREVIEW_IDS);
      setAlertsOn(preview !== "off");
      return;
    }
    let cancelled = false;
    Promise.all([
      fetch("/api/settings/instruments").then((res) => (res.ok ? res.json() : null)),
      fetch("/api/settings/notifications").then((res) => (res.ok ? res.json() : null)),
    ])
      .then(([inst, prefs]) => {
        if (cancelled || !inst || !prefs) return;
        setIds(Array.isArray(inst.instruments) ? inst.instruments : []);
        setAlertsOn(Boolean(prefs.notifyJobAlerts));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [preview]);

  if (ids === null || alertsOn === null) return null;

  let state: { h: string; p: string; cta: string; href: string; quiet?: boolean };
  if (!ids.length) {
    state = {
      h: "Tell us what you play.",
      p: "Add your instruments and we'll email you when a job needs one.",
      cta: "Add instruments",
      href: "/settings#instruments",
    };
  } else if (!alertsOn) {
    state = {
      h: "Your job alerts are off.",
      p: "Turn them on and we'll email you when a job needs one of these.",
      cta: "Turn on alerts",
      href: "/settings#notifications",
    };
  } else {
    state = {
      h: "Your job alerts",
      p: "We'll email you when a job needs one of these.",
      cta: "Edit instruments",
      href: "/settings#instruments",
      quiet: true,
    };
  }
  const shown = ids.slice(0, 6);

  return (
    <section className="fw-next">
      <div className="fw-split compact">
        <div className="fw-split-copy">
          <h2>{state.h}</h2>
          <p>{state.p}</p>
          {shown.length ? (
            <ul className={alertsOn ? "fw-mine" : "fw-mine off"} aria-label="Your instruments">
              {shown.map((id) => (
                <li key={id}>
                  <InstrumentIcon instrument={labelFor(id)} />
                  {labelFor(id)}
                </li>
              ))}
              {ids.length > shown.length ? <li className="more">+{ids.length - shown.length} more</li> : null}
            </ul>
          ) : null}
          <Link href={state.href} className={state.quiet ? "btn outline fw-cta-quiet" : "btn primary fw-cta-iris"}>
            {state.cta}
          </Link>
        </div>
        <RecentJobs compact />
      </div>
      <ProducerFoot />
      {process.env.NODE_ENV === "development" ? (
        <div className="fw-proto">
          <span>Preview</span>
          {(
            [
              ["", "Real"],
              ["on", "Alerts on"],
              ["off", "Alerts off"],
              ["empty", "No instruments"],
            ] as const
          ).map(([value, text]) => (
            <a key={text} href={value ? `?alerts=${value}` : "?"} aria-current={(preview ?? "") === value}>
              {text}
            </a>
          ))}
        </div>
      ) : null}
    </section>
  );
}
