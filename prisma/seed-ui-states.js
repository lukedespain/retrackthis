const fs = require("fs");
const path = require("path");

// Reshape demo data so music@lukedespain.com can preview every UI state.
const envLocalPath = path.join(__dirname, "..", ".env.local");
for (const line of fs.readFileSync(envLocalPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)="?(.*?)"?$/);
  if (m) process.env[m[1]] = m[2];
}

const { PrismaClient } = require("@prisma/client");
const Stripe = require("stripe");

const db = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

const PLACEHOLDER_TAKE = "https://example-demo-files.test/placeholder-take.mp3";
const PLACEHOLDER_DEMO = "https://example-demo-files.test/placeholder-demo.mp3";

async function releasePayment(jobId) {
  const payment = await db.payment.findUnique({ where: { jobId } });
  if (!payment) return;
  if (payment.stripePaymentIntentId.startsWith("pi_fake")) {
    await db.payment.update({ where: { jobId }, data: { status: "cancelled" } });
    return;
  }
  try {
    await stripe.paymentIntents.cancel(payment.stripePaymentIntentId);
  } catch (err) {
    // Already canceled/captured — still sync our row
    console.warn("  (stripe cancel skipped for %s: %s)", jobId, err.message);
  }
  await db.payment.update({ where: { jobId }, data: { status: "cancelled" } });
}

async function markTransferred(jobId) {
  const payment = await db.payment.findUnique({ where: { jobId } });
  if (!payment) return;
  await db.payment.update({
    where: { jobId },
    data: { status: "transferred", platformFeeCents: Math.round(payment.amountCents * 0.1) },
  });
}

async function main() {
  const luke = await db.user.findUnique({ where: { email: "music@lukedespain.com" } });
  const alex = await db.user.findUnique({ where: { email: "alex@example.com" } });
  const jamie = await db.user.findUnique({ where: { email: "jamie@example.com" } });
  const sam = await db.user.findUnique({ where: { email: "sam@example.com" } });
  if (!luke || !alex || !jamie || !sam) throw new Error("Missing seed users");

  const byTitle = async (title, creatorId = luke.id) =>
    db.job.findFirst({ where: { title, creatorId } });

  // --- Creator "My jobs" for Luke ---
  // Keep OPEN (marketplace + creator open list)
  const keepOpenTitles = [
    "Warm Rhodes chords for a neo-soul ballad",
    "Punchy kick and snare for a trap beat",
    "Breathy lead vocal ad-libs",
    "Cello countermelody for a film cue",
  ];

  // CANCELLED
  for (const title of [
    "Banjo roll for a bluegrass breakdown",
    "Analog synth arpeggio bed",
    "Muted trumpet for a noir jazz intro",
  ]) {
    const job = await byTitle(title);
    if (!job || job.status === "CANCELLED") continue;
    await releasePayment(job.id);
    await db.job.update({ where: { id: job.id }, data: { status: "CANCELLED" } });
    console.log("CANCELLED:", title);
  }

  // AWARDED (with takes from jamie/sam so Luke can expand "view takes")
  for (const { title, winnerId, loserId } of [
    { title: "Saxophone hook for an indie pop chorus", winnerId: jamie.id, loserId: sam.id },
    { title: "Violin harmony line over a folk chorus", winnerId: sam.id, loserId: jamie.id },
  ]) {
    const job = await byTitle(title);
    if (!job) continue;
    await db.take.deleteMany({ where: { jobId: job.id } });
    await db.take.create({
      data: {
        jobId: job.id,
        musicianId: winnerId,
        audioFileUrl: PLACEHOLDER_TAKE,
        note: "Winning take (demo).",
        isWinner: true,
      },
    });
    await db.take.create({
      data: {
        jobId: job.id,
        musicianId: loserId,
        audioFileUrl: PLACEHOLDER_TAKE,
        note: "Runner-up take (demo).",
        isWinner: false,
      },
    });
    await db.job.update({ where: { id: job.id }, data: { status: "AWARDED" } });
    await markTransferred(job.id);
    console.log("AWARDED:", title);
  }

  // Polish the vocals job copy
  const vocals = await byTitle("Breathy lead vocal ad-libs");
  if (vocals) {
    await db.job.update({
      where: { id: vocals.id },
      data: {
        title: "Lead vocal for a folk chorus",
        instrument: "Vocals",
        description:
          "[demo-variety] Clear lead vocal over the acoustic demo. Flexible tempo. Stack a soft double on the last chorus if you like.",
        bpm: null,
      },
    });
    console.log("Updated vocal job:", vocals.id);
  }

  // --- Jobs Luke can submit on as musician (owned by Alex) ---
  // Move a few of Luke's remaining opens to Alex, then create Luke takes in varied states.
  async function ensureAlexJob(title) {
    let job = await db.job.findFirst({ where: { title, creatorId: alex.id } });
    if (job) return job;
    const fromLuke = await byTitle(title);
    if (fromLuke) {
      job = await db.job.update({
        where: { id: fromLuke.id },
        data: { creatorId: alex.id, status: "OPEN" },
      });
      console.log("Transferred to Alex:", title);
      return job;
    }
    return null;
  }

  // Pending submission (open job owned by Alex so Luke can submit as musician)
  const pendingJob = await ensureAlexJob("Fingerstyle acoustic guitar verse");
  if (pendingJob) {
    await db.take.deleteMany({ where: { jobId: pendingJob.id, musicianId: luke.id } });
    await db.take.create({
      data: {
        jobId: pendingJob.id,
        musicianId: luke.id,
        audioFileUrl: PLACEHOLDER_TAKE,
        note: "Capo 2, nylon strings. Pending review.",
        isWinner: false,
      },
    });
    await db.job.update({ where: { id: pendingJob.id }, data: { status: "OPEN" } });
    console.log("Luke PENDING on:", pendingJob.title);
  }

  // Fresh Alex jobs dedicated to Luke's submission states
  async function upsertAlexDemoJob({ title, instrument, priceCents, bpm, days }) {
    let job = await db.job.findFirst({ where: { title, creatorId: alex.id } });
    const deadline = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    if (!job) {
      const pi = await stripe.paymentIntents.create({
        amount: priceCents,
        currency: "usd",
        payment_method: "pm_card_visa",
        capture_method: "manual",
        confirm: true,
        automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      });
      job = await db.job.create({
        data: {
          creatorId: alex.id,
          title,
          instrument,
          description: `[demo-variety] Demo job for UI state previews.`,
          demoFileUrl: PLACEHOLDER_DEMO,
          priceCents,
          bpm,
          deadline,
          status: "OPEN",
          payment: {
            create: {
              stripePaymentIntentId: pi.id,
              amountCents: priceCents,
              platformFeeCents: 0,
              status: "authorized",
            },
          },
        },
      });
      console.log("Created Alex job:", title);
    }
    return job;
  }

  const won = await upsertAlexDemoJob({
    title: "Harmony vocal stack for a pop bridge",
    instrument: "Vocals",
    priceCents: 9500,
    bpm: 100,
    days: 5,
  });
  await db.take.deleteMany({ where: { jobId: won.id } });
  await db.take.create({
    data: {
      jobId: won.id,
      musicianId: luke.id,
      audioFileUrl: PLACEHOLDER_TAKE,
      note: "Soft thirds under the lead. You picked this one!",
      isWinner: true,
    },
  });
  await db.take.create({
    data: {
      jobId: won.id,
      musicianId: jamie.id,
      audioFileUrl: PLACEHOLDER_TAKE,
      note: "Other vocalist take.",
      isWinner: false,
    },
  });
  await db.job.update({ where: { id: won.id }, data: { status: "AWARDED" } });
  await markTransferred(won.id);
  console.log("Luke SELECTED on:", won.title);

  const lost = await upsertAlexDemoJob({
    title: "Electric guitar riff for a rock chorus",
    instrument: "Electric Guitar",
    priceCents: 8000,
    bpm: 128,
    days: 3,
  });
  await db.take.deleteMany({ where: { jobId: lost.id } });
  await db.take.create({
    data: {
      jobId: lost.id,
      musicianId: luke.id,
      audioFileUrl: PLACEHOLDER_TAKE,
      note: "Gritty amp take. Not selected.",
      isWinner: false,
    },
  });
  await db.take.create({
    data: {
      jobId: lost.id,
      musicianId: sam.id,
      audioFileUrl: PLACEHOLDER_TAKE,
      note: "Winner take.",
      isWinner: true,
    },
  });
  await db.job.update({ where: { id: lost.id }, data: { status: "AWARDED" } });
  await markTransferred(lost.id);
  console.log("Luke NOT SELECTED on:", lost.title);

  const cancelledSub = await upsertAlexDemoJob({
    title: "Ukulele strum for a kids song",
    instrument: "Ukulele",
    priceCents: 4000,
    bpm: null,
    days: 8,
  });
  await db.take.deleteMany({ where: { jobId: cancelledSub.id } });
  await db.take.create({
    data: {
      jobId: cancelledSub.id,
      musicianId: luke.id,
      audioFileUrl: PLACEHOLDER_TAKE,
      note: "Submitted before the job was cancelled.",
      isWinner: false,
    },
  });
  await releasePayment(cancelledSub.id);
  await db.job.update({ where: { id: cancelledSub.id }, data: { status: "CANCELLED" } });
  console.log("Luke JOB CANCELLED on:", cancelledSub.title);

  // Pending on transferred acoustic guitar (Alex) + upright bass already exists
  if (pendingJob) {
    // already created above
  }

  // Extra open vocal on Alex for Open jobs browse (not Luke's)
  const openVocal = await upsertAlexDemoJob({
    title: "Soft falsetto hook for an R&B verse",
    instrument: "Vocals",
    priceCents: 13000,
    bpm: 78,
    days: 11,
  });
  await db.job.update({ where: { id: openVocal.id }, data: { status: "OPEN" } });
  await db.take.deleteMany({ where: { jobId: openVocal.id } });
  console.log("Open vocal browse job:", openVocal.title);

  // Ensure Luke's keep-open jobs are OPEN (after rename, folk vocal is the vocals job)
  const lukeOpenTitles = [
    "Warm Rhodes chords for a neo-soul ballad",
    "Punchy kick and snare for a trap beat",
    "Lead vocal for a folk chorus",
    "Breathy lead vocal ad-libs",
    "Cello countermelody for a film cue",
  ];
  for (const title of lukeOpenTitles) {
    const job = await db.job.findFirst({ where: { title, creatorId: luke.id } });
    if (job && job.status !== "OPEN") {
      await db.job.update({ where: { id: job.id }, data: { status: "OPEN" } });
    }
  }

  // Summary
  const open = await db.job.count({ where: { status: "OPEN" } });
  const lukeCreator = await db.job.groupBy({
    by: ["status"],
    where: { creatorId: luke.id },
    _count: true,
  });
  const lukeTakes = await db.take.findMany({
    where: { musicianId: luke.id },
    include: { job: { select: { title: true, status: true } } },
  });
  console.log("\nOpen jobs total:", open);
  console.log("Luke creator jobs by status:", lukeCreator);
  console.log(
    "Luke takes:",
    lukeTakes.map((t) => ({
      title: t.job.title,
      jobStatus: t.job.status,
      winner: t.isWinner,
    }))
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
