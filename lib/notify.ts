import { appBaseUrl } from "@/lib/appUrl";
import { emailConfigured, sendEmail } from "@/lib/email";
import { formatCents, formatDeadline } from "@/lib/format";
import { jobMatchesAlertFilters } from "@/lib/instruments";
import { db } from "@/lib/db";

type JobLite = {
  id: string;
  title: string;
  instrument: string;
  description: string;
  priceCents: number;
  deadline: Date;
  creatorId: string;
};

function jobUrl() {
  return `${appBaseUrl()}/jobs`;
}

function dashboardJobsUrl() {
  return `${appBaseUrl()}/dashboard`;
}

function dashboardSubmissionsUrl() {
  return `${appBaseUrl()}/dashboard?tab=submissions`;
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
    },
    select: { id: true, email: true, name: true, notifyInstruments: true },
  });

  const recipients = users.filter((user) =>
    jobMatchesAlertFilters(job.instrument, user.notifyInstruments)
  );

  await Promise.all(
    recipients.map((user) =>
      safeSend(`new-job ${job.id} → ${user.email}`, () =>
        sendEmail({
          to: user.email,
          subject: `New ${job.instrument} gig: ${job.title}`,
          heading: "A new job matches your alerts",
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

export async function notifyCreatorTakeSubmitted(opts: {
  job: { id: string; title: string; creatorId: string };
  musicianName: string;
}) {
  if (!emailConfigured()) return;

  const creator = await db.user.findUnique({
    where: { id: opts.job.creatorId },
    select: { email: true, name: true, notifyTakeSubmitted: true },
  });
  if (!creator?.notifyTakeSubmitted) return;

  await safeSend(`take-submitted ${opts.job.id}`, () =>
    sendEmail({
      to: creator.email,
      subject: `New take on “${opts.job.title}”`,
      heading: "Someone submitted a take",
      bodyHtml: `<p style="margin:0 0 10px;">Hi ${escape(creator.name.split(" ")[0] || "there")},</p>
        <p style="margin:0;">${escape(opts.musicianName)} submitted a take on <strong>${escape(opts.job.title)}</strong>.</p>`,
      ctaLabel: "Review takes",
      ctaHref: dashboardJobsUrl(),
    })
  );
}

export async function notifyMusicianAwarded(opts: {
  musicianId: string;
  jobTitle: string;
}) {
  if (!emailConfigured()) return;

  const musician = await db.user.findUnique({
    where: { id: opts.musicianId },
    select: { email: true, name: true, notifyTakeOutcome: true },
  });
  if (!musician?.notifyTakeOutcome) return;

  await safeSend(`awarded ${opts.musicianId}`, () =>
    sendEmail({
      to: musician.email,
      subject: `You were selected for “${opts.jobTitle}”`,
      heading: "Your take was selected",
      bodyHtml: `<p style="margin:0 0 10px;">Hi ${escape(musician.name.split(" ")[0] || "there")},</p>
        <p style="margin:0;">The creator picked your take on <strong>${escape(opts.jobTitle)}</strong>. Payout is on the way to your Stripe Express account.</p>`,
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
