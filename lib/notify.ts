import { appBaseUrl } from "@/lib/appUrl";
import { emailConfigured, sendEmail } from "@/lib/email";
import { formatCents, formatDeadline } from "@/lib/format";
import { musicianFacingPriceCents } from "@/lib/jobPricing";
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
  isTest?: boolean;
  createdAt?: Date | string;
};

function shownPay(job: JobLite) {
  return formatCents(musicianFacingPriceCents(job));
}

function jobUrl() {
  return `${appBaseUrl()}/musicians`;
}

function dashboardJobsUrl() {
  return `${appBaseUrl()}/producers`;
}

function dashboardSubmissionsUrl() {
  return `${appBaseUrl()}/submissions`;
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

export async function notifyNewJobPosted(job: JobLite): Promise<number> {
  if (!emailConfigured()) return 0;

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
            <p style="margin:0 0 10px;"><strong>${escape(job.title)}</strong> · ${escape(job.instrument)} · ${escape(shownPay(job))} · ${escape(formatDeadline(job.deadline))}</p>
            <p style="margin:0;">${escape(snippet(job.description))}</p>`,
          ctaLabel: "View job",
          ctaHref: jobUrl(),
        })
      )
    )
  );

  return recipients.length;
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
            <p style="margin:0 0 10px;"><strong>${escape(job.title)}</strong> · ${escape(shownPay(job))} · ${escape(formatDeadline(job.deadline))}</p>
            <p style="margin:0;">${escape(snippet(job.description))}</p>`,
          ctaLabel: "View open jobs",
          ctaHref: jobUrl(),
        })
      )
    )
  );

  return recipients.length;
}

/**
 * Deadline pushed out: tell matching musicians there's more time, and tell
 * anyone who already submitted they can still update their take.
 * Sent one at a time to stay under Resend's rate limit.
 */
export async function notifyJobDeadlineExtended(job: JobLite, extraDays: number): Promise<number> {
  if (!emailConfigured()) return 0;

  const [alertUsers, takes] = await Promise.all([
    db.user.findMany({
      where: {
        notifyJobAlerts: true,
        id: { not: job.creatorId },
        NOT: { instruments: { isEmpty: true } },
      },
      select: { id: true, email: true, name: true, instruments: true },
    }),
    db.take.findMany({
      where: { jobId: job.id, musicianId: { not: job.creatorId } },
      select: {
        musician: { select: { id: true, email: true, name: true, notifyTakeOutcome: true } },
      },
    }),
  ]);

  const recipients = new Map<string, { email: string; name: string; submitted: boolean }>();
  for (const { musician } of takes) {
    if (!musician.notifyTakeOutcome) continue;
    recipients.set(musician.id, { email: musician.email, name: musician.name, submitted: true });
  }
  for (const user of alertUsers) {
    if (recipients.has(user.id)) continue;
    if (!jobMatchesAlertFilters(job.instrument, job.instrumentId, user.instruments)) continue;
    recipients.set(user.id, { email: user.email, name: user.name, submitted: false });
  }

  const timeLeft = formatDeadline(job.deadline).toLowerCase();
  const timeLeftLine = /^(1 day|less)/.test(timeLeft)
    ? `There’s now ${timeLeft} to submit.`
    : `There are now ${timeLeft} to submit.`;
  let sent = 0;
  for (const user of recipients.values()) {
    const nextStep = user.submitted
      ? `You’ve already sent a take, and you can still go in and update or replace your submission and takes any time before the new deadline.`
      : `If timing was the only thing holding you back, now’s a good window to learn the part and send a take.`;
    await safeSend(`deadline-extended ${job.id} → ${user.email}`, () =>
      sendEmail({
        to: user.email,
        subject: `More time to submit: ${job.title}`,
        heading: "This job just got more time",
        bodyHtml: `<p style="margin:0 0 10px;">Hi ${escape(user.name.split(" ")[0] || "there")},</p>
          <p style="margin:0 0 10px;">The producer added ${extraDays === 1 ? "1 more day" : `${extraDays} more days`} to <strong>${escape(job.title)}</strong> (${escape(job.instrument)} · ${escape(shownPay(job))}). ${escape(timeLeftLine)}</p>
          <p style="margin:0 0 10px;">${nextStep}</p>
          <p style="margin:0;">Once the new deadline passes, the producer still has the usual 48 hours to make the pick.</p>`,
        ctaLabel: user.submitted ? "Update your take" : "View job",
        ctaHref: jobUrl(),
      })
    );
    sent += 1;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  return sent;
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
            <p style="margin:0 0 10px;"><strong>${escape(opts.job.title)}</strong> · ${escape(opts.job.instrument)} · ${escape(shownPay(opts.job))}</p>
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

/** Deadline ended - producer has 48h to pick (or we auto-pick / refund). */
export async function notifyProducerDeadlineReached(opts: {
  creatorId: string;
  jobId: string;
  jobTitle: string;
  musicianName: string | null;
  finalizeBy: Date;
}) {
  if (!emailConfigured()) return;

  const creator = await db.user.findUnique({
    where: { id: opts.creatorId },
    select: { email: true, name: true },
  });
  if (!creator) return;

  const favoriteLine = opts.musicianName
    ? `You currently have <strong>${escape(opts.musicianName)}</strong> favorited.`
    : `You don’t have a favorite yet - pick one before the window ends, or the job cancels and you’re refunded.`;

  await safeSend(`deadline-finalize ${opts.jobId}`, () =>
    sendEmail({
      to: creator.email,
      subject: `48 hours to pick a take for “${opts.jobTitle}”`,
      heading: "Your gig deadline just ended",
      bodyHtml: `<p style="margin:0 0 10px;">Hi ${escape(creator.name.split(" ")[0] || "there")},</p>
        <p style="margin:0 0 10px;">Submissions are closed on <strong>${escape(opts.jobTitle)}</strong>. ${favoriteLine}</p>
        <p style="margin:0;">You have <strong>48 hours</strong> to pick a take. If you don’t, we’ll pick your saved favorite by <strong>${escape(formatDeadline(opts.finalizeBy))}</strong> if you don’t act.</p>`,
      ctaLabel: "Pick a take",
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
      subject: `Your take was picked for “${opts.jobTitle}”`,
      heading: "Your take was picked",
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
            <p style="margin:0;"><strong>${escape(opts.jobTitle)}</strong> was cancelled, so no take will be picked.</p>`,
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
