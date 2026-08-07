const fs = require("fs");
const path = require("path");

// Additive demo jobs for browsing tag variety — does not wipe existing data.
const envLocalPath = path.join(__dirname, "..", ".env.local");
for (const line of fs.readFileSync(envLocalPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)="?(.*?)"?$/);
  if (m) process.env[m[1]] = m[2];
}

const { PrismaClient } = require("@prisma/client");
const Stripe = require("stripe");

const db = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

const DEMO_MARKER = "[demo-variety]";

const JOBS = [
  {
    title: "Warm Rhodes chords for a neo-soul ballad",
    instrument: "Keys",
    description: `${DEMO_MARKER} Soft electric piano voicings under a vocal demo. Keep it sparse.`,
    priceCents: 9000,
    bpm: 72,
    days: 10,
  },
  {
    title: "Punchy kick and snare for a trap beat",
    instrument: "Drums",
    description: `${DEMO_MARKER} Replace the programmed kit with live one-shots feel. Hard-hitting.`,
    priceCents: 12000,
    bpm: 140,
    days: 4,
  },
  {
    title: "Breathy lead vocal ad-libs",
    instrument: "Vocals",
    description: `${DEMO_MARKER} Stacked oh's and yeah's for the last chorus. Match the demo key.`,
    priceCents: 15000,
    bpm: null,
    days: 14,
  },
  {
    title: "Cello countermelody for a film cue",
    instrument: "Cello",
    description: `${DEMO_MARKER} Long tones that bloom into a short melodic answer. Intimate room sound.`,
    priceCents: 20000,
    bpm: 66,
    days: 7,
  },
  {
    title: "Saxophone hook for an indie pop chorus",
    instrument: "Saxophone",
    description: `${DEMO_MARKER} Catchy 4-bar hook, slightly overdriven. Think early Springsteen meets modern indie.`,
    priceCents: 8500,
    bpm: 118,
    days: 6,
  },
  {
    title: "Muted trumpet for a noir jazz intro",
    instrument: "Trumpet",
    description: `${DEMO_MARKER} Smoke-filled club vibe. Flexible time is fine; follow the piano.`,
    priceCents: 11000,
    bpm: null,
    days: 9,
  },
  {
    title: "Fingerstyle acoustic guitar verse",
    instrument: "Acoustic Guitar",
    description: `${DEMO_MARKER} Capo 2, Travis-picking pattern. Leave space for vocals.`,
    priceCents: 6500,
    bpm: 96,
    days: 2,
  },
  {
    title: "Analog synth arpeggio bed",
    instrument: "Synth",
    description: `${DEMO_MARKER} Soft square-wave arp, stereo width welcome. Lock to the click.`,
    priceCents: 5500,
    bpm: 124,
    days: 12,
  },
  {
    title: "Violin harmony line over a folk chorus",
    instrument: "Violin",
    description: `${DEMO_MARKER} Simple thirds above the melody. Dry-ish, close mic.`,
    priceCents: 7000,
    bpm: 88,
    days: 8,
  },
  {
    title: "Banjo roll for a bluegrass breakdown",
    instrument: "Banjo",
    description: `${DEMO_MARKER} Fast forward roll. Tempo is fixed — stay on the click.`,
    priceCents: 4500,
    bpm: 160,
    days: 5,
  },
];

async function authorizedPaymentIntent(amountCents) {
  return stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    payment_method: "pm_card_visa",
    capture_method: "manual",
    confirm: true,
    automatic_payment_methods: { enabled: true, allow_redirects: "never" },
  });
}

async function main() {
  const creator =
    (await db.user.findUnique({ where: { email: "music@lukedespain.com" } })) ||
    (await db.user.findUnique({ where: { email: "alex@example.com" } }));

  if (!creator) {
    throw new Error("No creator user found (tried music@lukedespain.com, alex@example.com)");
  }

  // Remove previous variety batch so re-running stays idempotent
  const old = await db.job.findMany({
    where: { creatorId: creator.id, description: { contains: DEMO_MARKER } },
    select: { id: true },
  });
  if (old.length) {
    const ids = old.map((j) => j.id);
    await db.payment.deleteMany({ where: { jobId: { in: ids } } });
    await db.take.deleteMany({ where: { jobId: { in: ids } } });
    await db.job.deleteMany({ where: { id: { in: ids } } });
    console.log("Cleared %d previous demo-variety jobs", old.length);
  }

  const inDays = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

  for (const job of JOBS) {
    const pi = await authorizedPaymentIntent(job.priceCents);
    await db.job.create({
      data: {
        creatorId: creator.id,
        title: job.title,
        instrument: job.instrument,
        description: job.description,
        demoFileUrl: "https://example-demo-files.test/placeholder-demo.mp3",
        priceCents: job.priceCents,
        bpm: job.bpm,
        deadline: inDays(job.days),
        status: "OPEN",
        payment: {
          create: {
            stripePaymentIntentId: pi.id,
            amountCents: job.priceCents,
            platformFeeCents: 0,
            status: "authorized",
          },
        },
      },
    });
    console.log("  + %s (%s, %s)", job.title, job.instrument, job.bpm ? `${job.bpm} BPM` : "flexible");
  }

  console.log("\nAdded %d open jobs for %s", JOBS.length, creator.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
