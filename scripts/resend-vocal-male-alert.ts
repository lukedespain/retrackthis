/**
 * One-shot: re-send new-job alert for Bryon's lead vocal (now Vocals · Male).
 * Run with: npx vercel env run -e production -- npx tsx scripts/resend-vocal-male-alert.ts
 */
import { PrismaClient } from "@prisma/client";
import { emailConfigured, sendEmail } from "../lib/email";
import { formatCents, formatDeadline } from "../lib/format";
import { jobMatchesAlertFilters } from "../lib/instruments";
import { appBaseUrl } from "../lib/appUrl";

const JOB_ID = "cmud4ywxy0001uikswfxwk7mw";

async function main() {
  console.log("emailConfigured?", emailConfigured());
  console.log("RESEND_API_KEY present?", Boolean(process.env.RESEND_API_KEY));
  if (!emailConfigured()) {
    throw new Error("RESEND_API_KEY missing - run via vercel env run -e production");
  }

  const db = new PrismaClient();
  const job = await db.job.findUnique({ where: { id: JOB_ID } });
  if (!job) throw new Error(`Job ${JOB_ID} not found`);

  const users = await db.user.findMany({
    where: {
      notifyJobAlerts: true,
      id: { not: job.creatorId },
      NOT: { instruments: { isEmpty: true } },
    },
    select: { id: true, email: true, name: true, instruments: true },
  });

  const recipients = users.filter((user) =>
    jobMatchesAlertFilters(job.instrument, job.instrumentId, user.instruments)
  );

  console.log(
    "Recipients:",
    recipients.map((r) => r.email)
  );

  const results: Array<{ email: string; ok: boolean; error?: string }> = [];
  for (const user of recipients) {
    try {
      await sendEmail({
        to: user.email,
        subject: `New ${job.instrument} gig: ${job.title}`,
        heading: "A new job matches your instruments",
        bodyHtml: `<p style="margin:0 0 10px;">Hi ${escape(user.name.split(" ")[0] || "there")},</p>
          <p style="margin:0 0 10px;"><strong>${escape(job.title)}</strong> · ${escape(job.instrument)} · ${escape(formatCents(job.priceCents))} · ${escape(formatDeadline(job.deadline))}</p>
          <p style="margin:0;">${escape(snippet(job.description))}</p>`,
        ctaLabel: "View job",
        ctaHref: `${appBaseUrl()}/musicians`,
      });
      results.push({ email: user.email, ok: true });
      console.log("sent →", user.email);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ email: user.email, ok: false, error: message });
      console.error("failed →", user.email, message);
    }
  }

  console.log(
    "done",
    results.filter((r) => r.ok).length,
    "ok /",
    results.length,
    "total"
  );
  await db.$disconnect();
}

function snippet(text: string, max = 180) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

function escape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
