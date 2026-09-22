import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter } from "@/components/MarketingFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { PLATFORM_FEE_PERCENT } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Through-lines · Retrack This",
  description:
    "Producer and musician through-lines: what happens today on Retrack This, side by side.",
  robots: { index: false, follow: false },
};

function OneLiner({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border-l-4 border-gray-900 bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-800">
      <span className="font-semibold text-gray-900">One-sentence version. </span>
      {children}
    </p>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h3 className="border-b-2 border-gray-900 pb-1.5 text-base font-semibold tracking-tight text-gray-900">
        {title}
      </h3>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-gray-700">{children}</div>
    </section>
  );
}

function StatusTable({
  rows,
}: {
  rows: Array<{ pill: string; meaning: string; code?: string }>;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-left text-xs sm:text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="px-3 py-2 font-medium">Pill</th>
            {rows.some((r) => r.code) && <th className="px-3 py-2 font-medium">Code</th>}
            <th className="px-3 py-2 font-medium">Meaning</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.pill}>
              <td className="px-3 py-2 font-semibold text-gray-900">{row.pill}</td>
              {rows.some((r) => r.code) && (
                <td className="px-3 py-2 font-mono text-[11px] text-gray-500">{row.code}</td>
              )}
              <td className="px-3 py-2 text-gray-700">{row.meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Flow({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 font-mono text-[11px] leading-relaxed text-gray-800 sm:text-xs">
      {children}
    </pre>
  );
}

function Callout({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "yes" | "no" | "edit";
  children: React.ReactNode;
}) {
  const border =
    tone === "yes"
      ? "border-emerald-600"
      : tone === "no"
        ? "border-red-700"
        : tone === "edit"
          ? "border-amber-500 bg-amber-50/80"
          : "border-gray-300";
  return (
    <div className={`rounded-lg border border-gray-200 border-l-4 ${border} px-3.5 py-3 text-sm leading-relaxed text-gray-800`}>
      {children}
    </div>
  );
}

function ProducerThroughLine() {
  return (
    <article className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Producer</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">
          Through-line - what happens today
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Charge-upfront Checkout · editable working doc for meetings and community email.
        </p>
      </header>

      <OneLiner>
        Producer fills out a gig → pays up front at checkout → musicians submit until the deadline →
        producer favorites takes (no early close) → after the deadline they have 48 hours to award a
        musician. No award in time with a favorite → we auto-award it. No favorite → refund.
      </OneLiner>

      <Section id="producer-status" title="1. Status pills">
        <StatusTable
          rows={[
            {
              pill: "Draft",
              code: "PENDING_PAYMENT",
              meaning: "Saved gig, not paid yet. Private. Edit, finish payment, or discard.",
            },
            {
              pill: "Open",
              code: "OPEN",
              meaning: "Paid and live. Musicians can submit. Edit refs/title (not price), cancel+refund, favorite takes.",
            },
            {
              pill: "Paying",
              code: "PAYING",
              meaning: "Payout in progress (brief). Retry if stuck.",
            },
            {
              pill: "Awarded",
              code: "AWARDED",
              meaning: "Winner paid (or marked for manual PayPal/Wise). Masters unlock.",
            },
            {
              pill: "Cancelled",
              code: "CANCELLED",
              meaning: "Closed with no award. If money was taken → refunded. Unpaid discard can restore as Draft.",
            },
          ]}
        />
      </Section>

      <Section id="producer-happy" title="2. Happy path">
        <Flow>{`START: Producer clicks “Post a job”
  │
  ├─ Fill form (title, refs, instrument, price, deadline days open, optional invite)
  │
  ├─ “Post job & pay” → Draft job + Stripe Embedded Checkout
  │     ├─ Pay succeeds → webhook → Job = Open, payment = captured
  │     │     → emails: matching musicians + optional invite
  │     ├─ Close without paying → stays Draft (private)
  │     └─ Discard draft → Cancelled (no charge); can Restore
  │
  └─ While Open (until deadline - cannot close early):
        Musicians submit takes (free; need payouts set up)
        │
        ├─ “Favorite this submission” → private; can switch
        ├─ “Cancel & refund” → refund → Cancelled
        └─ Deadline hits → “48 hours to award” email
              ├─ “Award this submission” → transfer → Awarded
              ├─ Has favorite, 48h passes → cron auto-awards
              └─ No favorite, 48h passes → cron Cancel & refund`}</Flow>
      </Section>

      <Section id="producer-branches" title="3. Branches that matter">
        <Callout tone="yes">
          <strong>Discard draft (never paid).</strong> No Stripe charge. Job Cancelled. Restore as
          draft works if never paid. Nothing emailed to musicians.
        </Callout>
        <Callout tone="yes">
          <strong>Cancel open job (already paid).</strong> Full refund via Stripe. Musicians who
          submitted get a cancelled email.
        </Callout>
        <Callout tone="edit">
          <strong>Product cost note.</strong> Stripe keeps ~2.9%+$0.30 on refunds. Lean proposal:
          on cancel, refund the job amount minus Stripe&apos;s cut (no upfront cancel fee) so the
          platform doesn&apos;t lose money on cancels. Still needs a one-line policy in Terms +
          community email.
        </Callout>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Deadline hits:</strong> Submissions close. 48h to award. Favorite → auto-award if
            idle. No favorite → auto refund.
          </li>
          <li>
            <strong>No early “End gig &amp; pay”.</strong> Full submit window stays honest.
          </li>
          <li>
            <strong>Cron is daily</strong> on Hobby - 48h cleanup may wait until the next run. Award
            clicks are instant.
          </li>
          <li>
            Musician must have Stripe Connect ready or PayPal/Wise on file. Platform fee ~
            {PLATFORM_FEE_PERCENT}%.
          </li>
        </ul>
        <Callout tone="edit">
          <strong>Extend deadline?</strong> Not today. Edit job changes title, description, refs,
          tempo - not price, not deadline.
        </Callout>
        <Callout tone="edit">
          <strong>Unhappy with takes?</strong> Before award: Cancel &amp; refund, or wait out 48h with
          no favorite. After Awarded: support/admin only.
        </Callout>
      </Section>
    </article>
  );
}

function MusicianThroughLine() {
  return (
    <article className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Musician</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">
          Through-line - what happens today
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Companion to the producer path · same product, other seat.
        </p>
      </header>

      <OneLiner>
        Musician signs up → sets payouts in Settings → browses Open jobs → listens Part/Bed/Both →
        submits takes for free (need payouts ready) → waits through the deadline → if awarded, gets
        paid and masters unlock; if not, nothing is owed.
      </OneLiner>

      <Section id="musician-status" title="1. Status pills (My submissions)">
        <StatusTable
          rows={[
            {
              pill: "Pending",
              meaning: "Submitted and waiting. Stays Pending through the deadline and award window - favorites stay private to the producer.",
            },
            {
              pill: "Awarded",
              meaning: "Won. Money moved (or queued for manual PayPal/Wise). Masters unlock.",
            },
            {
              pill: "Not selected",
              meaning: "Job awarded to someone else. No payout.",
            },
            {
              pill: "Job cancelled",
              meaning: "Producer cancelled / refunded, or cron refunded with no winner.",
            },
          ]}
        />
        <p className="text-xs text-gray-500">
          Only Open jobs appear on the browse board. Drafts stay invisible. We never show Picked /
          Favorite to musicians.
        </p>
      </Section>

      <Section id="musician-happy" title="2. Happy path">
        <Flow>{`START: Musician creates an account (email or Google)
  │
  ├─ Settings → Payouts
  │     ├─ Stripe Connect → bank onboarding in a new tab
  │     └─ PayPal / Wise (alt) where preferred / needed
  │           → required before submit is allowed
  │
  ├─ Instruments (optional; helps matching emails)
  │
  ├─ Browse Open jobs
  │     ├─ Listen: Part / Bed / Both
  │     └─ Submit (free) - up to 3 takes + notes / MIDI
  │           → one submission per job; can replace while Open
  │
  └─ After deadline:
        ├─ Awarded (or cron auto-award) → Selected → pay + masters
        ├─ Someone else wins → Not selected
        └─ Cancel / no favorite refund → Job cancelled`}</Flow>
      </Section>

      <Section id="musician-branches" title="3. Branches that matter">
        <Callout tone="no">
          <strong>Payouts not ready.</strong> Submit is blocked until Stripe Connect is ready or
          PayPal/Wise is on file. Stripe opens in a new tab from Settings.
        </Callout>
        <Callout tone="yes">
          <strong>While waiting.</strong> Replace files while Open. Favorites are private to the
          producer. Previews stream as lighter MP3s; WAV masters unlock only for the winner after
          Awarded.
        </Callout>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Platform fee ~{PLATFORM_FEE_PERCENT}% comes out of the job price; musician gets the rest.
          </li>
          <li>Stripe Express transfers automatically when Connect is ready.</li>
          <li>
            PayPal / Wise → Awarded with <code className="rounded bg-gray-100 px-1 text-xs">pending_manual_payout</code> until a founder pays by hand.
          </li>
          <li>Self-award (same account posting and winning) is blocked.</li>
        </ul>
        <Callout tone="edit">
          <strong>Musician email shared with producer on award?</strong> Still TODO - not automatic
          in-product yet.
        </Callout>
        <Callout tone="edit">
          <strong>Unhappy after winning?</strong> No self-serve reverse. Support / admin only. License
          to the producer kicks in on award (see Terms).
        </Callout>
      </Section>
    </article>
  );
}

export default function ThroughLinePage() {
  return (
    <div className="min-h-screen bg-[#f7f6f3]">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-5 pb-16 sm:px-6 sm:pb-24">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Through-lines
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-500 sm:text-base">
            Producer and musician paths as the product works today - same page for meetings, email
            drafting, and a shared mental model.
          </p>
          <p className="mt-3 text-xs text-gray-400">
            Source HTML:{" "}
            <code className="rounded bg-white/80 px-1.5 py-0.5">docs/PRODUCER-THROUGH-LINE.html</code>
            {" · "}
            <code className="rounded bg-white/80 px-1.5 py-0.5">docs/MUSICIAN-THROUGH-LINE.html</code>
            {" · "}
            <Link href="/faq" className="underline underline-offset-2 hover:text-gray-700">
              FAQ
            </Link>
          </p>
        </div>

        <nav
          aria-label="Jump to role"
          className="sticky top-0 z-10 -mx-5 mt-8 flex gap-2 border-b border-gray-200/80 bg-[#f7f6f3]/95 px-5 py-3 backdrop-blur sm:-mx-6 sm:px-6"
        >
          <a
            href="#producer"
            className="rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-gray-800 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
          >
            Producer
          </a>
          <a
            href="#musician"
            className="rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-gray-800 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
          >
            Musician
          </a>
        </nav>

        <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-8">
          <div
            id="producer"
            className="scroll-mt-20 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7"
          >
            <ProducerThroughLine />
          </div>
          <div
            id="musician"
            className="scroll-mt-20 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7"
          >
            <MusicianThroughLine />
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
