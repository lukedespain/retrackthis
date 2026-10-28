/**
 * One-shot: make MP3 stream previews for jobs posted before Job.demoPreviewUrl /
 * Job.backingPreviewUrl existed, so players stop loading full-length WAV beds.
 * Only fills empty preview fields; the original files are never touched.
 * Covers jobs that are still live (open, awarding, or waiting on payment).
 * Run with: npx tsx --env-file=.env.local scripts/backfill-job-previews.ts [--dry-run]
 */
import { PrismaClient } from "@prisma/client";
import { jobFilePreviewUrl } from "../lib/jobPreviews";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const db = new PrismaClient();
  const jobs = await db.job.findMany({
    where: {
      status: { in: ["OPEN", "AWARDING", "PENDING_PAYMENT"] },
      OR: [{ demoPreviewUrl: null }, { backingFileUrl: { not: null }, backingPreviewUrl: null }],
    },
    select: { id: true, title: true, demoFileUrl: true, backingFileUrl: true, demoPreviewUrl: true, backingPreviewUrl: true },
    orderBy: { createdAt: "desc" },
  });
  console.log(`${jobs.length} job(s) to check${dryRun ? " (dry run)" : ""}`);

  for (const job of jobs) {
    if (dryRun) {
      console.log(`- ${job.id} ${job.title}`);
      continue;
    }
    const data: { demoPreviewUrl?: string; backingPreviewUrl?: string } = {};
    if (!job.demoPreviewUrl) {
      const url = await jobFilePreviewUrl(job.demoFileUrl);
      if (url) data.demoPreviewUrl = url;
    }
    if (job.backingFileUrl && !job.backingPreviewUrl) {
      const url = await jobFilePreviewUrl(job.backingFileUrl);
      if (url) data.backingPreviewUrl = url;
    }
    if (Object.keys(data).length > 0) {
      await db.job.update({ where: { id: job.id }, data });
    }
    console.log(`- ${job.id} ${job.title}: ${Object.keys(data).join(", ") || "nothing to add (already light, or failed)"}`);
  }

  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
