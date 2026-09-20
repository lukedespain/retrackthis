// Seeds the Demo Mode preview database with mock data — no real Supabase
// Auth or Stripe calls, just fake ids and fake payment intent ids. Run this
// against the Preview-only database (see README), never against production.
// The user id below must match lib/demoMode.ts's DEMO_USER_ID.
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001";
const MOCK_MUSICIAN_ID = "00000000-0000-0000-0000-000000000002";
const MOCK_MUSICIAN_2_ID = "00000000-0000-0000-0000-000000000003";

async function main() {
  await db.payment.deleteMany();
  await db.take.deleteMany();
  await db.job.deleteMany();
  await db.user.deleteMany();

  const alex = await db.user.create({
    data: {
      id: MOCK_USER_ID,
      email: "alex@example.com",
      name: "Alex Rivera",
      role: ["CREATOR", "MUSICIAN"],
      instruments: ["bass", "guitar"],
    },
  });

  const jamie = await db.user.create({
    data: {
      id: MOCK_MUSICIAN_ID,
      email: "jamie@example.com",
      name: "Jamie Chen",
      role: ["MUSICIAN"],
      instruments: ["bass"],
    },
  });

  const sam = await db.user.create({
    data: {
      id: MOCK_MUSICIAN_2_ID,
      email: "sam@example.com",
      name: "Sam Okafor",
      role: ["MUSICIAN"],
      stripeAccountId: "acct_fake_sam_onboarded",
      instruments: ["guitar", "cello"],
    },
  });

  const inDays = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
  const fakePayment = (amountCents) => ({
    create: {
      stripePaymentIntentId: `pi_fake_${Math.random().toString(36).slice(2)}`,
      amountCents,
      platformFeeCents: 0,
      status: "authorized",
    },
  });

  const bassJob = await db.job.create({
    data: {
      creatorId: alex.id,
      title: "Upright bass for a jazz waltz",
      instrument: "Upright Bass",
      description:
        "3/4 time, walking bass line over a ii-V-I in F. Demo has a scratch MIDI part. Swing feel please.",
      demoFileUrl: "https://example-demo-files.test/jazz-waltz-demo.mp3",
      priceCents: 7500,
      bpm: 140,
      deadline: inDays(5),
      status: "OPEN",
      payment: fakePayment(7500),
    },
  });

  await db.job.create({
    data: {
      creatorId: alex.id,
      title: "Funky slap bass line for a pop chorus",
      instrument: "Bass Guitar",
      description: "Upbeat, percussive slap bass for an 8-bar chorus. Reference: 70s funk.",
      demoFileUrl: "https://example-demo-files.test/pop-chorus-demo.mp3",
      priceCents: 5000,
      bpm: 108,
      deadline: inDays(3),
      status: "OPEN",
      payment: fakePayment(5000),
    },
  });

  const variety = [
    { title: "Warm Rhodes chords for a neo-soul ballad", instrument: "Keys", description: "Soft electric piano voicings under a vocal demo. Keep it sparse.", priceCents: 9000, bpm: 72, days: 10 },
    { title: "Punchy kick and snare for a trap beat", instrument: "Drums", description: "Replace the programmed kit with a live one-shots feel. Hard-hitting.", priceCents: 12000, bpm: 140, days: 4 },
    { title: "Breathy lead vocal ad-libs", instrument: "Vocals", description: "Stacked oh's and yeah's for the last chorus. Match the demo key.", priceCents: 15000, bpm: null, days: 14 },
    { title: "Cello countermelody for a film cue", instrument: "Cello", description: "Long tones that bloom into a short melodic answer. Intimate room sound.", priceCents: 20000, bpm: 66, days: 7 },
    { title: "Saxophone hook for an indie pop chorus", instrument: "Saxophone", description: "Catchy 4-bar hook, slightly overdriven.", priceCents: 8500, bpm: 118, days: 6 },
  ];

  for (const job of variety) {
    await db.job.create({
      data: {
        creatorId: alex.id,
        title: job.title,
        instrument: job.instrument,
        description: job.description,
        demoFileUrl: "https://example-demo-files.test/placeholder-demo.mp3",
        priceCents: job.priceCents,
        bpm: job.bpm,
        deadline: inDays(job.days),
        status: "OPEN",
        payment: fakePayment(job.priceCents),
      },
    });
  }

  const guitarJob = await db.job.create({
    data: {
      creatorId: alex.id,
      title: "Acoustic guitar fingerpicking intro",
      instrument: "Acoustic Guitar",
      description: "16-bar fingerpicked intro, dropped D tuning.",
      demoFileUrl: "https://example-demo-files.test/intro-demo.mp3",
      priceCents: 6000,
      bpm: null,
      deadline: inDays(-1),
      status: "AWARDED",
    },
  });

  await db.take.create({
    data: {
      jobId: bassJob.id,
      musicianId: jamie.id,
      audioFileUrl: "https://example-demo-files.test/takes/jamie-bass-take.mp3",
      note: "Went for a laid-back swing feel, let me know if you want it more on top of the beat.",
    },
  });

  await db.take.create({
    data: {
      jobId: bassJob.id,
      musicianId: sam.id,
      audioFileUrl: "https://example-demo-files.test/takes/sam-bass-take.mp3",
      note: "Recorded on my upright with a Neumann KM184, added a bit of walking chromaticism in bar 5.",
    },
  });

  await db.take.create({
    data: {
      jobId: guitarJob.id,
      musicianId: sam.id,
      audioFileUrl: "https://example-demo-files.test/takes/sam-guitar-take.mp3",
      note: "Nylon string, close-mic'd.",
      isWinner: true,
    },
  });

  await db.payment.create({
    data: {
      jobId: guitarJob.id,
      stripePaymentIntentId: "pi_fake_awarded_already",
      amountCents: 6000,
      platformFeeCents: 600,
      status: "transferred",
    },
  });

  console.log("Mock data seeded. Preview user id:", alex.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
