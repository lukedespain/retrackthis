"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Spinner } from "@/components/ui/Spinner";
import { AdminEmailsPanel } from "./AdminEmailsPanel";
import { AdminFinanceWaterfall } from "./AdminFinanceWaterfall";
import { AdminJobsPanel, type AdminJobRow } from "./AdminJobsPanel";
import { AdminMemberInstrumentsEditor } from "./AdminMemberInstrumentsEditor";

type Tab = "members" | "jobs" | "instruments" | "income" | "emails";
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
  payoutProvider?: string | null;
  payoutProviderLabel?: string;
  payoutEmail?: string | null;
  payoutAccountName?: string | null;
  payoutCountry?: string | null;
  hasStripe?: boolean;
  hasAltPayout?: boolean;
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
    fundsHeldCents?: number;
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
  series: SeriesDay[];
};

type SeriesDay = {
  date: string;
  amountCents: number;
  feesCents: number;
  count: number;
  jobs?: Array<{
    id: string;
    title: string;
    instrument: string;
    status: string;
    amountCents: number;
    creatorId: string;
    creatorName: string;
  }>;
};

/** Series dates are UTC day keys ("2026-09-08"); format without shifting the day. */
function formatDayKey(key: string) {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

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
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [openMemberId, setOpenMemberId] = useState<string | null>(null);
  const [adminJobs, setAdminJobs] = useState<AdminJobRow[] | null>(null);
  const [jobsReloadToken, setJobsReloadToken] = useState(0);
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
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingTab, setLoadingTab] = useState(false);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (
      t === "members" ||
      t === "jobs" ||
      t === "instruments" ||
      t === "income" ||
      t === "emails"
    )
      setTab(t);
    const p = searchParams.get("period");
    if (p === "7d" || p === "30d" || p === "90d" || p === "all") setPeriod(p);
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        if (res.status === 401) {
          router.push("/sign-in?next=/admin");
          return;
        }
        const body = await res.json().catch(() => null);
        if (!body?.profile?.isAdmin) {
          router.push("/producers");
          return;
        }
        setProfile(body.profile);
      })
      .catch(() => {
        router.push("/sign-in?next=/admin");
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
            router.push("/producers");
            return;
          }
          if (!res.ok) throw new Error("Could not load members");
          const body = await res.json();
          if (!cancelled) setMembers(body.members);
        } else if (tab === "jobs") {
          const res = await fetch("/api/admin/jobs");
          if (res.status === 403) {
            router.push("/producers");
            return;
          }
          if (!res.ok) throw new Error("Could not load jobs");
          const body = await res.json();
          if (!cancelled) setAdminJobs(body.jobs);
        } else if (tab === "instruments") {
          const res = await fetch("/api/admin/instruments");
          if (res.status === 403) {
            router.push("/producers");
            return;
          }
          if (!res.ok) throw new Error("Could not load instruments");
          const body = await res.json();
          if (!cancelled) setInstruments(body);
        } else if (tab === "emails") {
          // AdminEmailsPanel loads its own data.
        } else {
          const res = await fetch(`/api/admin/stats?period=${period}`);
          if (res.status === 403) {
            router.push("/producers");
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
  }, [profile, tab, period, router, jobsReloadToken]);

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

  async function resetMemberPayouts(m: Member) {
    const ok = window.confirm(
      `Clear payout setup for ${m.name} (${m.email})?\n\nThis unlinks Stripe and any PayPal/Wise details. They’ll need to set up payouts again.`
    );
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/members/${m.id}/reset-payouts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not reset payouts");
      setMembers((prev) =>
        prev
          ? prev.map((row) =>
              row.id === m.id
                ? {
                    ...row,
                    hasPayouts: false,
                    hasStripe: false,
                    hasAltPayout: false,
                    payoutProvider: null,
                    payoutProviderLabel: "Not set",
                    payoutEmail: null,
                    payoutAccountName: null,
                    payoutCountry: null,
                  }
                : row
            )
          : prev
      );
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not reset payouts");
    }
  }

  function changeTab(next: Tab) {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`/admin?${params.toString()}`, { scroll: false });
  }

  function changePeriod(next: Period) {
    setPeriod(next);
    setSelectedDay(null);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "income");
    params.set("period", next);
    router.replace(`/admin?${params.toString()}`, { scroll: false });
  }

  if (profile === undefined) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-5 py-16 sm:px-6">
          <div className="flex items-center justify-center py-24">
            <Spinner />
          </div>
        </main>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-5 pb-16 sm:px-6 sm:pb-24">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-accent">Admin</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">
              Operations
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Members, jobs, instruments, income, and emails.
            </p>
          </div>
          <SegmentedControl
            value={tab}
            onChange={changeTab}
            options={[
              { value: "members", label: "Members" },
              { value: "jobs", label: "Jobs" },
              { value: "instruments", label: "Instruments" },
              { value: "income", label: "Income" },
              { value: "emails", label: "Emails" },
            ]}
          />
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {loadingTab &&
        !(
          (tab === "members" && members) ||
          (tab === "jobs" && adminJobs) ||
          (tab === "instruments" && instruments) ||
          (tab === "income" && stats) ||
          tab === "emails"
        ) ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : null}

        {tab === "members" && members && (
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">
                {filteredMembers.length} of {members.length} members
              </p>
              <input
                type="search"
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                placeholder="Search name, email, instrument…"
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 outline-none ring-accent/30 placeholder:text-gray-400 focus:ring-2 sm:max-w-xs"
              />
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
              <table className="min-w-full bg-white text-left text-sm">
                <thead className="border-b border-gray-200 bg-white text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Member</th>
                    <th className="px-4 py-3 font-medium">Posted</th>
                    <th className="px-4 py-3 font-medium">Submitted</th>
                    <th className="px-4 py-3 font-medium">Won</th>
                    <th className="px-4 py-3 font-medium">Instruments</th>
                    <th className="px-4 py-3 text-center font-medium">Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredMembers.map((m) => {
                    const shown = m.instruments.slice(0, 2);
                    return (
                      <tr
                        key={m.id}
                        tabIndex={0}
                        role="button"
                        aria-label={`Open ${m.name}`}
                        onClick={() => setOpenMemberId(m.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setOpenMemberId(m.id);
                          }
                        }}
                        className="cursor-pointer bg-white align-middle hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40"
                      >
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-gray-900">
                            {m.name}
                            {m.isAdmin ? (
                              <span className="ml-2 rounded-full bg-accent-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                                Admin
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs text-gray-500">{m.email}</div>
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-gray-700">{m.jobsPosted}</td>
                        <td className="px-4 py-2.5 tabular-nums text-gray-700">{m.takesSubmitted}</td>
                        <td className="px-4 py-2.5 tabular-nums text-gray-700">{m.jobsWon}</td>
                        <td className="px-4 py-2.5">
                          {shown.length === 0 ? (
                            <span className="text-xs text-gray-400">None</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {shown.map((inst) => (
                                <span
                                  key={inst.id}
                                  className="whitespace-nowrap rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600"
                                >
                                  {inst.label}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <PayoutMark member={m} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {openMemberId &&
              (() => {
                const open = members.find((m) => m.id === openMemberId);
                if (!open) return null;
                return (
                  <MemberDetail
                    member={open}
                    locked={editingMemberId === open.id}
                    onClose={() => setOpenMemberId(null)}
                    onEditInstruments={() => setEditingMemberId(open.id)}
                    onResetPayouts={() => void resetMemberPayouts(open)}
                  />
                );
              })()}

            {editingMemberId &&
              (() => {
                const editing = members.find((m) => m.id === editingMemberId);
                if (!editing) return null;
                return (
                  <AdminMemberInstrumentsEditor
                    key={editing.id}
                    member={editing}
                    onClose={() => setEditingMemberId(null)}
                    onSaved={(instruments) => {
                      setMembers((prev) =>
                        prev
                          ? prev.map((m) =>
                              m.id === editing.id ? { ...m, instruments } : m
                            )
                          : prev
                      );
                      setEditingMemberId(null);
                    }}
                  />
                );
              })()}
          </section>
        )}

        {tab === "jobs" && adminJobs && (
          <AdminJobsPanel
            jobs={adminJobs}
            onChanged={() => setJobsReloadToken((n) => n + 1)}
          />
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
              <p className="text-sm text-gray-500">
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
              <p className="text-sm text-gray-500">
                Money on the platform and fees for the selected window.
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
              <StatCard
                label="Funds held"
                value={money(stats.income.fundsHeldCents ?? stats.income.escrowAuthorizedCents)}
                hint="Open jobs — paid, not picked yet"
              />
              <StatCard
                label="Picked volume"
                value={money(stats.income.volumeCapturedCents)}
                hint="Jobs that closed with a winner"
              />
              <StatCard
                label="Platform fees"
                value={money(stats.income.platformFeeEarnedCents)}
                hint="Gross 10%, before Stripe fees"
              />
              <StatCard label="Payments" value={`${stats.income.paymentCount}`} hint="In this period" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Jobs posted" value={`${stats.activity.jobsTotal}`} hint={`${stats.activity.jobsOpen} open`} />
              <StatCard label="Jobs picked" value={`${stats.activity.jobsAwarded}`} hint={`${stats.activity.jobsCancelled} cancelled`} />
              <StatCard label="Takes submitted" value={`${stats.activity.takesTotal}`} hint="Auditions in period" />
              <StatCard
                label="Members"
                value={`${stats.activity.membersTotal}`}
                hint={period === "all" ? "Total" : `${stats.activity.membersNew} new in period`}
              />
            </div>

            <AdminFinanceWaterfall period={period} />

            <div className="rounded-2xl border border-gray-100 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Daily volume
              </p>
              <MiniBars
                series={stats.series}
                selectedDate={selectedDay}
                onSelect={(date) => setSelectedDay((cur) => (cur === date ? null : date))}
              />
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                <span>Cancelled: {money(stats.income.cancelledCents)}</span>
                <span>Failed: {money(stats.income.failedCents)}</span>
                <span>Transferred: {money(stats.income.transferredCents)}</span>
              </div>
            </div>

            {selectedDay &&
              (() => {
                const day = stats.series.find((d) => d.date === selectedDay);
                if (!day) return null;
                return <DayJobsList day={day} onClose={() => setSelectedDay(null)} />;
              })()}
          </section>
        )}

        {tab === "emails" && <AdminEmailsPanel />}

        <p className="text-xs text-gray-400">
          <Link href="/producers" className="underline-offset-2 hover:underline">
            Back to my jobs
          </Link>
        </p>
      </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-gray-900">
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
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2.5">
        <h2 className="text-sm font-medium text-gray-800">{title}</h2>
        <span className="text-xs text-gray-400">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-sm text-gray-500">{empty}</p>
      ) : (
        <table className="min-w-full bg-white text-left text-sm">
          <thead className="border-b border-gray-200 bg-white text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Instrument</th>
              <th className="px-4 py-2.5 font-medium">Group</th>
              <th className="px-4 py-2.5 font-medium">Musicians</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {rows.map((row) => (
              <tr key={row.id} className="bg-white">
                <td className="px-4 py-2.5 text-gray-900">
                  {row.label}
                  {row.custom ? (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-gray-400">
                      Custom
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-2.5 text-gray-500">{row.groupLabel}</td>
                <td
                  className={`px-4 py-2.5 tabular-nums ${
                    emphasizeGap || row.musicianCount === 0
                      ? "font-medium text-amber-700"
                      : "text-gray-700"
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

type PayoutKind = "stripe" | "paypal" | "wise" | "none";

function payoutKind(member: Member): PayoutKind {
  if (member.hasAltPayout && member.payoutProvider === "paypal") return "paypal";
  if (member.hasAltPayout && member.payoutProvider === "wise") return "wise";
  if (member.hasStripe || member.payoutProvider === "stripe") return "stripe";
  return "none";
}

function payoutLabel(kind: PayoutKind) {
  if (kind === "stripe") return "Stripe";
  if (kind === "paypal") return "PayPal";
  if (kind === "wise") return "Wise";
  return "No payout";
}

function PayoutMark({ member }: { member: Member }) {
  const kind = payoutKind(member);
  const label = payoutLabel(kind);
  return (
    <span className="inline-flex" title={label} aria-label={label}>
      {kind === "stripe" ? <StripeMark /> : null}
      {kind === "paypal" ? <PayPalMark /> : null}
      {kind === "wise" ? <WiseMark /> : null}
      {kind === "none" ? <EmptyPayoutMark /> : null}
    </span>
  );
}

function StripeMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
      <rect width="24" height="24" rx="7" fill="#635BFF" />
      <path
        fill="#fff"
        d="M11.1 9.3c0-.6.5-.9 1.3-.9 1.2 0 2.6.4 3.6 1V6.7A9 9 0 0 0 12.4 6C9.9 6 8.2 7.3 8.2 9.5c0 3.5 4.8 2.9 4.8 4.4 0 .7-.6 1-1.5 1-1.3 0-2.9-.5-4.2-1.3v2.8A9.6 9.6 0 0 0 11.6 18c2.6 0 4.4-1.3 4.4-3.5 0-3.8-4.9-3.1-4.9-4.5Z"
      />
    </svg>
  );
}

function PayPalMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
      <rect width="24" height="24" rx="7" fill="#003087" />
      <path
        fill="#009CDE"
        d="M15.2 6.2h-4.1c-.3 0-.5.2-.6.5L9.2 16.4c0 .2.1.3.3.3h1.8c.3 0 .5-.2.6-.5l.4-1.6c.1-.3.3-.5.6-.5h1.3c2.3 0 3.6-1.1 4-3.3.2-.9 0-1.6-.5-2.1-.6-.6-1.6-.9-2.5-.9Zm.4 3.2c-.2 1.2-1.1 1.2-2 1.2h-.5l.5-2.1c0-.1.2-.2.3-.2h.3c.6 0 1.2 0 1.4.4.1.2.2.5 0 .7Z"
      />
      <path
        fill="#fff"
        d="M13.6 7.4H9.7c-.2 0-.4.2-.4.4L8.1 16.8c0 .2.1.3.3.3h2l.5-2.2c0-.2.2-.4.4-.4h1.2c2.2 0 3.5-1.1 3.8-3.2.2-.8 0-1.5-.5-2-.5-.5-1.5-.9-2.2-.9Zm.3 3.1c-.2 1.1-1 1.1-1.8 1.1h-.5l.4-2c0-.1.1-.2.3-.2h.2c.6 0 1.1 0 1.3.4.1.2.2.4.1.7Z"
      />
    </svg>
  );
}

function WiseMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
      <rect width="24" height="24" rx="7" fill="#9FE870" />
      <path fill="#163300" d="M6.2 7.2h4.2l1.6 3.3 1.6-3.3h4.2l-3.7 6.4 3.9 3.2h-4.3l-1.7-2.6-1.7 2.6H6l3.9-3.2-3.7-6.4Z" />
    </svg>
  );
}

function EmptyPayoutMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="#C8C7C2" strokeWidth="1.5" />
    </svg>
  );
}

function MemberDetail({
  member,
  locked = false,
  onClose,
  onEditInstruments,
  onResetPayouts,
}: {
  member: Member;
  locked?: boolean;
  onClose: () => void;
  onEditInstruments: () => void;
  onResetPayouts: () => void;
}) {
  const kind = payoutKind(member);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !locked) onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, locked]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-6"
      role="presentation"
      onClick={() => {
        if (!locked) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-detail-title"
        className="max-h-[min(40rem,calc(100dvh-1.5rem))] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
          <div>
            <h2 id="member-detail-title" className="text-lg font-medium text-gray-900">
              {member.name}
              {member.isAdmin ? (
                <span className="ml-2 rounded-full bg-accent-muted px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-accent">
                  Admin
                </span>
              ) : null}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">{member.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <dl className="grid grid-cols-4 gap-3 border-b border-gray-200 px-5 py-4 text-sm">
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-gray-400">Joined</dt>
            <dd className="mt-1 text-gray-900">{formatDate(member.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-gray-400">Posted</dt>
            <dd className="mt-1 tabular-nums text-gray-900">{member.jobsPosted}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-gray-400">Submitted</dt>
            <dd className="mt-1 tabular-nums text-gray-900">{member.takesSubmitted}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-gray-400">Won</dt>
            <dd className="mt-1 tabular-nums text-gray-900">{member.jobsWon}</dd>
          </div>
        </dl>

        <div className="border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <PayoutMark member={member} />
            <h3 className="text-sm font-medium text-gray-900">{payoutLabel(kind)}</h3>
          </div>
          {kind === "none" ? (
            <p className="mt-2 text-sm text-gray-500">No payout method on file.</p>
          ) : (
            <div className="mt-2 space-y-0.5 text-sm text-gray-600">
              {member.hasStripe && kind !== "stripe" ? <p>Stripe is also linked.</p> : null}
              {member.payoutEmail ? <p>{member.payoutEmail}</p> : null}
              {member.payoutAccountName ? <p>{member.payoutAccountName}</p> : null}
              {member.payoutCountry ? <p>{member.payoutCountry}</p> : null}
            </div>
          )}
          {member.hasPayouts ? (
            <button
              type="button"
              onClick={onResetPayouts}
              className="mt-3 text-sm font-medium text-amber-700 hover:underline"
            >
              Reset payout setup
            </button>
          ) : null}
        </div>

        <div className="px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-gray-900">
              Instruments
              {member.instruments.length > 0 ? (
                <span className="ml-1.5 font-normal text-gray-400">{member.instruments.length}</span>
              ) : null}
            </h3>
            <button
              type="button"
              onClick={onEditInstruments}
              className="text-sm font-medium text-accent hover:underline"
            >
              Edit
            </button>
          </div>
          {member.instruments.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">None listed.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {member.instruments.map((inst) => (
                <span
                  key={inst.id}
                  className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700"
                >
                  {inst.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniBars({
  series,
  selectedDate,
  onSelect,
}: {
  series: SeriesDay[];
  selectedDate: string | null;
  onSelect: (date: string) => void;
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
        const hasJobs = day.amountCents > 0;
        const selected = selectedDate === day.date;
        const dimmed = selectedDate !== null && !selected;
        return (
          <button
            key={day.date}
            type="button"
            disabled={!hasJobs}
            onClick={() => onSelect(day.date)}
            aria-label={`${formatDayKey(day.date)}: ${money(day.amountCents)}`}
            aria-pressed={selected}
            className={`group relative min-w-0 flex-1 rounded-t transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
              !hasJobs
                ? "cursor-default bg-accent/25"
                : selected
                  ? "cursor-pointer bg-accent ring-2 ring-accent/30"
                  : "cursor-pointer bg-accent/80 hover:bg-accent"
            }`}
            style={{ height: `${h}%`, opacity: dimmed ? 0.45 : 1 }}
          >
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg group-hover:block group-focus-visible:block">
              {formatDayKey(day.date)} · {money(day.amountCents)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function DayJobsList({ day, onClose }: { day: SeriesDay; onClose: () => void }) {
  const jobs = day.jobs ?? [];
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
        <h2 className="text-sm font-medium text-gray-800">
          {formatDayKey(day.date)} · {money(day.amountCents)} ·{" "}
          {jobs.length === 1 ? "1 job" : `${jobs.length} jobs`}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-medium text-gray-500 hover:text-gray-800"
        >
          Close
        </button>
      </div>
      {jobs.length === 0 ? (
        <p className="px-4 py-6 text-sm text-gray-500">No jobs on this day.</p>
      ) : (
        <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link
                href={`/admin/preview/producer/${job.creatorId}?job=${job.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {job.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {job.instrument} · {job.creatorName}
                  </p>
                </div>
                <span className="shrink-0 text-sm tabular-nums text-gray-700">
                  {money(job.amountCents)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
