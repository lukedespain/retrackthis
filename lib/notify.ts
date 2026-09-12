import { appBaseUrl } from "@/lib/appUrl";
import { emailConfigured, sendEmail } from "@/lib/email";
import { formatCents, formatDeadline } from "@/lib/format";
import { jobMatchesAlertFilters } from "@/lib/instruments";
import { db } from "@/lib/db";

type JobLite = {
  id: string;
  title: string;
  instrument: string;
  instrumentId?: string | null;
  description: string;
  priceCents: number;
  deadline: Date;
  creatorId: string;
};

function jobUrl() {
  return `${appBaseUrl()}/musicians`;
}

function dashboardJobsUrl() {
  return `${appBaseUrl()}/producers`;
}

function dashboardSubmissionsUrl() {
  return `${appBaseUrl()}/musicians?tab=submissions`;
}

function snippet(text: string, max = 180) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

async function safeSend(label: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    console.error(`[notify] ${label}`, err);
  }
}

export async function notifyNewJobPosted(job: JobLite) {
  if (!emailConfigured()) return;

  const users = await db.user.findMany({
    where: {
      notifyJobAlerts: true,
      id: { not: job.creatorId },
      // Must have at least one profile instrument to receive matching alerts.
      NOT: { instruments: { isEmpty: true } },
    },
    select: { id: true, email: true, name: true, instruments: true },
  });

  const recipients = users.filter((user) =>
    jobMatchesAlertFilters(job.instrument, job.instrumentId, user.instruments)
  );

  await Promise.all(
    recipients.map((user) =>
      safeSend(`new-job ${job.id} → ${user.email}`, () =>
        sendEmail({
          to: user.email,
          subject: `New ${job.instrument} gig: ${job.title}`,
          heading: "A new job matches your instruments",
          bodyHtml: `<p style="margin:0 0 10px;">Hi ${escape(user.name.split(" ")[0] || "there")},</p>
            <p style="margin:0 0 10px;"><strong>${escape(job.title)}</strong> · ${escape(job.instrument)} · ${escape(formatCents(job.priceCents))} · ${escape(formatDeadline(job.deadline))}</p>
            <p style="margin:0;">${escape(snippet(job.description))}</p>`,
          ctaLabel: "View job",
          ctaHref: jobUrl(),
        })
      )
    )
  );
}

/** Email matching musicians who have not submitted yet that a job has ~3 days left. */
export async function notifyJobThreeDaysLeft(job: JobLite): Promise<number> {
  if (!emailConfigured()) return 0;

  const [users, takes] = await Promise.all([
    db.user.findMany({
      where: {
        notifyJobAlerts: true,
        id: { not: job.creatorId },
        NOT: { instruments: { isEmpty: true } },
      },
      select: { id: true, email: true, name: true, instruments: true },
    }),
    db.take.findMany({
      where: { jobId: job.id },
      select: { musicianId: true },
    }),
  ]);

  const submitted = new Set(takes.map((t) => t.musicianId));
  const recipients = users.filter(
    (user) =>
      !submitted.has(user.id) &&
      jobMatchesAlertFilters(job.instrument, job.instrumentId, user.instruments)
  );

  await Promise.all(
    recipients.map((user) =>
      safeSend(`three-day ${job.id} → ${user.email}`, () =>
        sendEmail({
          to: user.email,
          subject: `Only 3 days left to submit: ${job.instrument} job`,
          heading: "Only 3 days left to submit",
          bodyHtml: `<p style="margin:0 0 10px;">Hi ${escape(user.name.split(" ")[0] || "there")},</p>
            <p style="margin:0 0 10px;">Only 3 days left to submit to this <strong>${escape(job.instrument)}</strong> job:</p>
            <p style="margin:0 0 10px;"><strong>${escape(job.title)}</strong> · ${escape(formatCents(job.priceCents))} · ${escape(formatDeadline(job.deadline))}</p>
            <p style="margin:0;">${escape(snippet(job.description))}</p>`,
          ctaLabel: "View open jobs",
          ctaHref: jobUrl(),
        })
      )
    )
  );

  return recipients.length;
}

export async function notifyJobInvites(opts: {
  job: JobLite;
  creatorName: string;
  emails: string[];
}) {
  if (!emailConfigured() || opts.emails.length === 0) return;

  const signUpHref = `${appBaseUrl()}/sign-up?next=${encodeURIComponent("/musicians")}`;

  await Promise.all(
    opts.emails.map((email) =>
      safeSend(`job-invite ${opts.job.id} → ${email}`, () =>
        sendEmail({
          to: email,
          subject: `${opts.creatorName} invited you to a ${opts.job.instrument} gig on Retrack This`,
          heading: "You're invited to submit a take",
          bodyHtml: `<p style="margin:0 0 10px;">Hi there,</p>
            <p style="margin:0 0 10px;"><strong>${escape(opts.creatorName)}</strong> posted a job and invited you to send a take:</p>
            <p style="margin:0 0 10px;"><strong>${escape(opts.job.title)}</strong> · ${escape(opts.job.instrument)} · ${escape(formatCents(opts.job.priceCents))}</p>
            <p style="margin:0;">${escape(snippet(opts.job.description))}</p>
            <p style="margin:12px 0 0;">Create a free account (or sign in), browse jobs, and submit your take.</p>`,
          ctaLabel: "View open jobs",
          ctaHref: signUpHref,
          includeSettingsFooter: false,
        })
      )
    )
  );
}

export async function notifyCreatorTakeSubmitted(opts: {
  job: { id: string; title: string; creatorId: string };
  musicianName: string;
  replaced?: boolean;
}) {
  if (!emailConfigured()) return;

  const creator = await db.user.findUnique({
    where: { id: opts.job.creatorId },
    select: { email: true, name: true, notifyTakeSubmitted: true },
  });
  if (!creator?.notifyTakeSubmitted) return;

  const replaced = Boolean(opts.replaced);
  await safeSend(`take-submitted ${opts.job.id}`, () =>
    sendEmail({
      to: creator.email,
      subject: replaced
        ? `Updated take on “${opts.job.title}”`
        : `New take on “${opts.job.title}”`,
      heading: replaced ? "A musician updated their take" : "Someone submitted a take",
      bodyHtml: `<p style="margin:0 0 10px;">Hi ${escape(creator.name.split(" ")[0] || "there")},</p>
        <p style="margin:0;">${escape(opts.musicianName)} ${
          replaced ? "replaced their take" : "submitted a take"
        } on <strong>${escape(opts.job.title)}</strong>.</p>`,
      ctaLabel: "Review takes",
      ctaHref: dashboardJobsUrl(),
    })
  );
}

export async function notifyMusicianAwarded(opts: {
  musicianId: string;
  jobTitle: string;
  payoutProvider?: string;
}) {
  if (!emailConfigured()) return;

  const musician = await db.user.findUnique({
    where: { id: opts.musicianId },
    select: { email: true, name: true, notifyTakeOutcome: true },
  });
  if (!musician?.notifyTakeOutcome) return;

  const provider = opts.payoutProvider;
  const payoutLine =
    provider === "paypal" || provider === "wise"
      ? `We’ll send your payout to your ${provider === "paypal" ? "PayPal" : "Wise"} account shortly.`
      : "Payout is on the way to your Stripe Express account.";

  await safeSend(`awarded ${opts.musicianId}`, () =>
    sendEmail({
      to: musician.email,
      subject: `You were selected for “${opts.jobTitle}”`,
      heading: "Your take was selected",
      bodyHtml: `<p style="margin:0 0 10px;">Hi ${escape(musician.name.split(" ")[0] || "there")},</p>
        <p style="margin:0;">The creator picked your take on <strong>${escape(opts.jobTitle)}</strong>. ${escape(payoutLine)}</p>`,
      ctaLabel: "See submissions",
      ctaHref: dashboardSubmissionsUrl(),
    })
  );
}

export async function notifyMusiciansJobCancelled(opts: {
  jobId: string;
  jobTitle: string;
}) {
  if (!emailConfigured()) return;

  const takes = await db.take.findMany({
    where: { jobId: opts.jobId },
    include: { musician: { select: { email: true, name: true, notifyTakeOutcome: true } } },
  });

  const seen = new Set<string>();
  await Promise.all(
    takes.map((take) => {
      if (!take.musician.notifyTakeOutcome) return Promise.resolve();
      if (seen.has(take.musician.email)) return Promise.resolve();
      seen.add(take.musician.email);
      return safeSend(`cancelled ${opts.jobId} → ${take.musician.email}`, () =>
        sendEmail({
          to: take.musician.email,
          subject: `Job cancelled: “${opts.jobTitle}”`,
          heading: "A job you submitted to was cancelled",
          bodyHtml: `<p style="margin:0 0 10px;">Hi ${escape(take.musician.name.split(" ")[0] || "there")},</p>
            <p style="margin:0;"><strong>${escape(opts.jobTitle)}</strong> was cancelled. Your take won’t be awarded.</p>`,
          ctaLabel: "Browse open jobs",
          ctaHref: jobUrl(),
        })
      );
    })
  );
}

function escape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
