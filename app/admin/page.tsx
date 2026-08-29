"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Spinner } from "@/components/ui/Spinner";
import { supabaseClient } from "@/lib/supabaseClient";

type Tab = "members" | "instruments" | "income";
type Period = "7d" | "30d" | "90d" | "all";

type Profile = {
  id: string;
  name: string;
  isAdmin?: boolean;
  stripeAccountId?: string | null;
};

type Member = {
  id: string;
  email: string;
  name: string;
  role: string[];
  isAdmin: boolean;
  createdAt: string;
  hasPayouts: boolean;
  jobsPosted: number;
  takesSubmitted: number;
  jobsWon: number;
  instruments: Array<{ id: string; label: string }>;
};

type InstrumentRow = {
  id: string;
  label: string;
  groupLabel: string;
  musicianCount: number;
  custom: boolean;
};

type StatsPayload = {
  period: Period;
  income: {
    escrowAuthorizedCents: number;
    volumeCapturedCents: number;
    platformFeeEarnedCents: number;
    transferredCents: number;
    cancelledCents: number;
    failedCents: number;
    paymentCount: number;
  };
  activity: {
    jobsTotal: number;
    jobsOpen: number;
    jobsAwarded: number;
    jobsCancelled: number;
    takesTotal: number;
    membersTotal: number;
    membersNew: number;
  };
  series: Array<{ date: string; amountCents: number; feesCents: number; count: number }>;
};

function money(cents: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
          <div className="flex items-center justify-center py-32">
            <Spinner />
          </div>
        </main>
      }
    >
      <AdminPageInner />
    </Suspense>
  );
}

function AdminPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("members");
  const [period, setPeriod] = useState<Period>("30d");
  const [members, setMembers] = useState<Member[] | null>(null);
  const [memberQuery, setMemberQuery] = useState("");
  const [instruments, setInstruments] = useState<{
    covered: InstrumentRow[];
    needed: InstrumentRow[];
    summary: {
      catalogTotal: number;
      coveredCount: number;
      neededCount: number;
      musiciansOnCustom: number;
    };
  } | null>(null);
  const [instrumentFilter, setInstrumentFilter] = useState<"covered" | "needed" | "all">("all");
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingTab, setLoadingTab] = useState(false);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "members" || t === "instruments" || t === "income") setTab(t);
    const p = searchParams.get("period");
    if (p === "7d" || p === "30d" || p === "90d" || p === "all") setPeriod(p);
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/auth/me").then(async (res) => {
      if (res.status === 401) {
        router.push("/sign-in?next=/admin");
        return;
      }
      const body = await res.json();
      if (!body.profile?.isAdmin) {
        router.push("/dashboard");
        return;
      }
      setProfile(body.profile);
    });
  }, [router]);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;

    async function load() {
      setLoadingTab(true);
      setError(null);
      try {
        if (tab === "members") {
          const res = await fetch("/api/admin/members");
          if (res.status === 403) {
            router.push("/dashboard");
            return;
          }
          if (!res.ok) throw new Error("Could not load members");
          const body = await res.json();
          if (!cancelled) setMembers(body.members);
        } else if (tab === "instruments") {
          const res = await fetch("/api/admin/instruments");
          if (res.status === 403) {
            router.push("/dashboard");
            return;
          }
          if (!res.ok) throw new Error("Could not load instruments");
          const body = await res.json();
          if (!cancelled) setInstruments(body);
        } else {
          const res = await fetch(`/api/admin/stats?period=${period}`);
          if (res.status === 403) {
            router.push("/dashboard");
            return;
          }
          if (!res.ok) throw new Error("Could not load stats");
          const body = await res.json();
          if (!cancelled) setStats(body);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        if (!cancelled) setLoadingTab(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [profile, tab, period, router]);

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    const q = memberQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.instruments.some((i) => i.label.toLowerCase().includes(q))
    );
  }, [members, memberQuery]);

  function changeTab(next: Tab) {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`/admin?${params.toString()}`, { scroll: false });
  }

  function changePeriod(next: Period) {
    setPeriod(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "income");
    params.set("period", next);
    router.replace(`/admin?${params.toString()}`, { scroll: false });
  }

  async function signOut() {
    await supabaseClient.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (profile === undefined) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
        <div className="flex items-center justify-center py-32">
          <Spinner />
        </div>
      </main>
    );
  }

  if (!profile) return null;

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
      <DashboardHeader
        name={profile.name}
        hasStripeAccount={Boolean(profile.stripeAccountId)}
        isAdmin
        onSignOut={signOut}
      />

      <div className="mt-8 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-accent">Admin</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Operations
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Members, instrument coverage, and income.
            </p>
          </div>
          <SegmentedControl
            value={tab}
            onChange={changeTab}
            options={[
              { value: "members", label: "Members" },
              { value: "instruments", label: "Instruments" },
              { value: "income", label: "Income" },
            ]}
          />
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        {loadingTab && !((tab === "members" && members) || (tab === "instruments" && instruments) || (tab === "income" && stats)) ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : null}

        {tab === "members" && members && (
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {filteredMembers.length} of {members.length} members
              </p>
              <input
                type="search"
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                placeholder="Search name, email, instrument…"
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 outline-none ring-accent/30 placeholder:text-gray-400 focus:ring-2 sm:max-w-xs dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900/80 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Member</th>
                    <th className="px-4 py-3 font-medium">Posted</th>
                    <th className="px-4 py-3 font-medium">Submitted</th>
                    <th className="px-4 py-3 font-medium">Won</th>
                    <th className="px-4 py-3 font-medium">Instruments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredMembers.map((m) => (
                    <tr key={m.id} className="align-top">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {m.name}
                          {m.isAdmin ? (
                            <span className="ml-2 rounded-full bg-accent-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                              Admin
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{m.email}</div>
                        <div className="mt-1 text-[11px] text-gray-400">
                          Joined {formatDate(m.createdAt)}
                          {m.hasPayouts ? " · Payouts connected" : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-gray-700 dark:text-gray-300">
                        {m.jobsPosted}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-gray-700 dark:text-gray-300">
                        {m.takesSubmitted}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-gray-700 dark:text-gray-300">
                        {m.jobsWon}
                      </td>
                      <td className="px-4 py-3">
                        {m.instruments.length === 0 ? (
                          <span className="text-xs text-gray-400">None listed</span>
                        ) : (
                          <div className="flex max-w-md flex-wrap gap-1">
                            {m.instruments.map((inst) => (
                              <span
                                key={inst.id}
                                className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                              >
                                {inst.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "instruments" && instruments && (
          <section className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard
                label="Covered"
                value={`${instruments.summary.coveredCount}`}
                hint={`of ${instruments.summary.catalogTotal} catalog`}
              />
              <StatCard
                label="Still needed"
                value={`${instruments.summary.neededCount}`}
                hint="No musicians yet"
              />
              <StatCard
                label="Custom write-ins"
                value={`${instruments.summary.musiciansOnCustom}`}
                hint="Outside the catalog"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Sorted by musician count for covered; by group for gaps.
              </p>
              <SegmentedControl
                value={instrumentFilter}
                onChange={setInstrumentFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "covered", label: "Covered" },
                  { value: "needed", label: "Needed" },
                ]}
              />
            </div>

            {(instrumentFilter === "all" || instrumentFilter === "covered") && (
              <InstrumentTable
                title="Covered"
                rows={instruments.covered}
                empty="No musicians have listed instruments yet."
              />
            )}
            {(instrumentFilter === "all" || instrumentFilter === "needed") && (
              <InstrumentTable
                title="Need musicians"
                rows={instruments.needed}
                empty="Every catalog instrument has at least one musician."
                emphasizeGap
              />
            )}
          </section>
        )}

        {tab === "income" && stats && (
          <section className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Escrow volume and platform fees for the selected window.
              </p>
              <SegmentedControl
                value={period}
                onChange={changePeriod}
                options={[
                  { value: "7d", label: "7d" },
                  { value: "30d", label: "30d" },
                  { value: "90d", label: "90d" },
                  { value: "all", label: "All time" },
                ]}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="In escrow" value={money(stats.income.escrowAuthorizedCents)} hint="Authorized, not captured" />
              <StatCard label="Captured volume" value={money(stats.income.volumeCapturedCents)} hint="Awarded jobs" />
              <StatCard label="Platform fees" value={money(stats.income.platformFeeEarnedCents)} hint="Earned on awards" />
              <StatCard label="Payments" value={`${stats.income.paymentCount}`} hint="In this period" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Jobs posted" value={`${stats.activity.jobsTotal}`} hint={`${stats.activity.jobsOpen} open`} />
              <StatCard label="Jobs awarded" value={`${stats.activity.jobsAwarded}`} hint={`${stats.activity.jobsCancelled} cancelled`} />
              <StatCard label="Takes submitted" value={`${stats.activity.takesTotal}`} hint="Auditions in period" />
              <StatCard
                label="Members"
                value={`${stats.activity.membersTotal}`}
                hint={period === "all" ? "Total" : `${stats.activity.membersNew} new in period`}
              />
            </div>

            <div className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Daily volume
              </p>
              <MiniBars series={stats.series} />
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span>Cancelled: {money(stats.income.cancelledCents)}</span>
                <span>Failed: {money(stats.income.failedCents)}</span>
                <span>Transferred: {money(stats.income.transferredCents)}</span>
              </div>
            </div>
          </section>
        )}

        <p className="text-xs text-gray-400">
          <Link href="/dashboard" className="underline-offset-2 hover:underline">
            Back to dashboard
          </Link>
        </p>
      </div>
    </main>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-gray-900 dark:text-white">
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}

function InstrumentTable({
  title,
  rows,
  empty,
  emphasizeGap = false,
}: {
  title: string;
  rows: InstrumentRow[];
  empty: string;
  emphasizeGap?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2.5 dark:border-gray-800 dark:bg-gray-900/80">
        <h2 className="text-sm font-medium text-gray-800 dark:text-gray-200">{title}</h2>
        <span className="text-xs text-gray-400">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-sm text-gray-500">{empty}</p>
      ) : (
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2.5 font-medium">Instrument</th>
              <th className="px-4 py-2.5 font-medium">Group</th>
              <th className="px-4 py-2.5 font-medium">Musicians</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-2.5 text-gray-900 dark:text-white">
                  {row.label}
                  {row.custom ? (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-gray-400">
                      Custom
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{row.groupLabel}</td>
                <td
                  className={`px-4 py-2.5 tabular-nums ${
                    emphasizeGap || row.musicianCount === 0
                      ? "font-medium text-amber-700 dark:text-amber-400"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {row.musicianCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function MiniBars({
  series,
}: {
  series: Array<{ date: string; amountCents: number }>;
}) {
  const max = Math.max(1, ...series.map((s) => s.amountCents));
  const last = series.slice(-42);

  if (last.length === 0) {
    return <p className="mt-4 text-sm text-gray-500">No payment activity in this period.</p>;
  }

  return (
    <div className="mt-4 flex h-28 items-end gap-0.5">
      {last.map((day) => {
        const h = Math.max(day.amountCents > 0 ? 8 : 2, Math.round((day.amountCents / max) * 100));
        return (
          <div
            key={day.date}
            title={`${day.date}: ${money(day.amountCents)}`}
            className="min-w-0 flex-1 rounded-t bg-accent/80 transition-opacity hover:opacity-100"
            style={{ height: `${h}%`, opacity: day.amountCents > 0 ? 1 : 0.25 }}
          />
        );
      })}
    </div>
  );
}
