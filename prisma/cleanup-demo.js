/**
 * Remove seed/demo marketplace content from the database.
 * Keeps real accounts (e.g. music@lukedespain.com, ljdespain@gmail.com).
 *
 * Usage:
 *   node prisma/cleanup-demo.js           # dry run
 *   node prisma/cleanup-demo.js --apply   # delete for real
 */
const fs = require("fs");
const path = require("path");

const envLocalPath = path.join(__dirname, "..", ".env.local");
for (const line of fs.readFileSync(envLocalPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)="?(.*?)"?$/);
  if (m) process.env[m[1]] = m[2];
}

const { createClient } = require("@supabase/supabase-js");
const { PrismaClient } = require("@prisma/client");
const Stripe = require("stripe");

const db = new PrismaClient();
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" })
  : null;

const APPLY = process.argv.includes("--apply");
const DEMO_MARKER = "[demo-variety]";
const PLACEHOLDER_HOST = "example-demo-files.test";
const SEED_EMAILS = ["alex@example.com", "jamie@example.com", "sam@example.com"];
const KEEP_EMAILS = new Set([
  "music@lukedespain.com",
  "ljdespain@gmail.com",
]);

async function releasePayment(payment) {
  if (!payment) return;
  if (!stripe || payment.stripePaymentIntentId.startsWith("pi_fake")) {
    return;
  }
  if (!["authorized", "failed"].includes(payment.status)) {
    return;
  }
  try {
    await stripe.paymentIntents.cancel(payment.stripePaymentIntentId);
    console.log("  cancelled Stripe PI", payment.stripePaymentIntentId);
  } catch (err) {
    console.warn("  Stripe cancel skipped:", payment.stripePaymentIntentId, err.message);
  }
}

async function deleteJobs(jobs) {
  if (!jobs.length) return;
  for (const job of jobs) {
    if (job.payment) await releasePayment(job.payment);
  }
  const ids = jobs.map((j) => j.id);
  await db.payment.deleteMany({ where: { jobId: { in: ids } } });
  await db.take.deleteMany({ where: { jobId: { in: ids } } });
  await db.job.deleteMany({ where: { id: { in: ids } } });
  console.log("Deleted %d jobs", ids.length);
}

async function main() {
  console.log(APPLY ? "APPLY mode — will delete\n" : "DRY RUN — pass --apply to delete\n");

  const seedUsers = await db.user.findMany({
    where: { email: { in: SEED_EMAILS } },
    select: { id: true, email: true, name: true },
  });
  const seedIds = seedUsers.map((u) => u.id);

  const demoJobs = await db.job.findMany({
    where: {
      OR: [
        // Explicit demo-variety batch
        { description: { contains: DEMO_MARKER } },
        // Anything owned by seed test accounts
        ...(seedIds.length ? [{ creatorId: { in: seedIds } }] : []),
        // Placeholder audio demos, but never wipe real-user jobs
        // (e.g. Payment Test) even if a fallback URL slipped in.
        {
          AND: [
            { demoFileUrl: { contains: PLACEHOLDER_HOST } },
            { creator: { email: { notIn: [...KEEP_EMAILS] } } },
          ],
        },
      ],
    },
    include: { payment: true, creator: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
  });

  const placeholderTakes = await db.take.findMany({
    where: {
      OR: [
        { audioFileUrl: { contains: PLACEHOLDER_HOST } },
        ...(seedIds.length ? [{ musicianId: { in: seedIds } }] : []),
      ],
    },
    include: { job: { select: { id: true, title: true } }, musician: { select: { email: true } } },
  });

  console.log("Seed users (%d):", seedUsers.length);
  for (const u of seedUsers) console.log("  -", u.email, u.name);

  console.log("\nDemo/placeholder/seed-owned jobs (%d):", demoJobs.length);
  for (const j of demoJobs) {
    console.log(
      "  - [%s] %s | %s | %s | creator=%s",
      j.status,
      j.title,
      j.instrument,
      j.id,
      j.creator.email
    );
  }

  console.log("\nPlaceholder/seed takes (%d):", placeholderTakes.length);
  for (const t of placeholderTakes) {
    console.log("  - take on \"%s\" by %s", t.job.title, t.musician.email);
  }

  if (!APPLY) {
    console.log("\nNo changes made. Re-run with --apply to delete the above.");
    return;
  }

  // Delete demo jobs (cascades their takes/payments)
  await deleteJobs(demoJobs);

  // Any leftover placeholder takes on real jobs
  const leftoverTakes = await db.take.findMany({
    where: {
      OR: [
        { audioFileUrl: { contains: PLACEHOLDER_HOST } },
        ...(seedIds.length ? [{ musicianId: { in: seedIds } }] : []),
      ],
    },
  });
  if (leftoverTakes.length) {
    await db.take.deleteMany({ where: { id: { in: leftoverTakes.map((t) => t.id) } } });
    console.log("Deleted %d leftover placeholder/seed takes", leftoverTakes.length);
  }

  // Delete seed users from app DB
  if (seedIds.length) {
    await db.take.deleteMany({ where: { musicianId: { in: seedIds } } });
    await db.user.deleteMany({ where: { id: { in: seedIds } } });
    console.log("Deleted %d seed users from app DB", seedIds.length);
  }

  // Delete seed users from Supabase Auth
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    for (const u of seedUsers) {
      if (KEEP_EMAILS.has(u.email)) continue;
      const { error } = await admin.auth.admin.deleteUser(u.id);
      if (error) console.warn("  Auth delete failed for", u.email, error.message);
      else console.log("  Auth deleted", u.email);
    }
  } else {
    console.warn("Skipping Supabase Auth deletes (missing service role env)");
  }

  console.log("\nCleanup complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
