const fs = require("fs");
const path = require("path");

// Prisma's seed runner doesn't load .env.local — parse it ourselves so we
// have the Supabase service-role key and Stripe key available.
const envLocalPath = path.join(__dirname, "..", ".env.local");
for (const line of fs.readFileSync(envLocalPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)="?(.*?)"?$/);
  if (m) process.env[m[1]] = m[2];
}

const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@supabase/supabase-js");
const Stripe = require("stripe");

const db = new PrismaClient();
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

const TEST_PASSWORD = "testpass123";

// Creates (or recreates) a real, pre-confirmed Supabase Auth account so the
// seed data can be logged into directly — no email confirmation needed.
async function ensureAuthUser(email) {
  const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const match = existing.users.find((u) => u.email === email);
  if (match) {
    await supabaseAdmin.auth.admin.deleteUser(match.id);
  }
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user.id;
}

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
  await db.payment.deleteMany();
  await db.take.deleteMany();
  await db.job.deleteMany();
  await db.user.deleteMany();

  const [alexId, jamieId, samId] = await Promise.all([
    ensureAuthUser("alex@example.com"),
    ensureAuthUser("jamie@example.com"),
    ensureAuthUser("sam@example.com"),
  ]);

  const alex = await db.user.create({
    data: { id: alexId, email: "alex@example.com", name: "Alex Rivera", role: ["CREATOR", "MUSICIAN"] },
  });

  const jamie = await db.user.create({
    data: {
      id: jamieId,
      email: "jamie@example.com",
      name: "Jamie Chen",
      role: ["MUSICIAN"],
      stripeAccountId: null, // hasn't finished Connect onboarding yet
    },
  });

  const sam = await db.user.create({
    data: {
      id: samId,
      email: "sam@example.com",
      name: "Sam Okafor",
      role: ["MUSICIAN"],
      stripeAccountId: "acct_fake_sam_onboarded", // pretend onboarding is done
    },
  });

  const inDays = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

  const bassPi = await authorizedPaymentIntent(7500);
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
      payment: {
        create: { stripePaymentIntentId: bassPi.id, amountCents: 7500, platformFeeCents: 0, status: "authorized" },
      },
    },
  });

  const slapPi = await authorizedPaymentIntent(5000);
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
      payment: {
        create: { stripePaymentIntentId: slapPi.id, amountCents: 5000, platformFeeCents: 0, status: "authorized" },
      },
    },
  });

  // Extra open jobs so instrument / tempo / price / due tags have variety in the UI.
  const variety = [
    {
      title: "Warm Rhodes chords for a neo-soul ballad",
      instrument: "Keys",
      description: "Soft electric piano voicings under a vocal demo. Keep it sparse.",
      priceCents: 9000,
      bpm: 72,
      days: 10,
    },
    {
      title: "Punchy kick and snare for a trap beat",
      instrument: "Drums",
      description: "Replace the programmed kit with a live one-shots feel. Hard-hitting.",
      priceCents: 12000,
      bpm: 140,
      days: 4,
    },
    {
      title: "Breathy lead vocal ad-libs",
      instrument: "Vocals",
      description: "Stacked oh's and yeah's for the last chorus. Match the demo key.",
      priceCents: 15000,
      bpm: null,
      days: 14,
    },
    {
      title: "Cello countermelody for a film cue",
      instrument: "Cello",
      description: "Long tones that bloom into a short melodic answer. Intimate room sound.",
      priceCents: 20000,
      bpm: 66,
      days: 7,
    },
    {
      title: "Saxophone hook for an indie pop chorus",
      instrument: "Saxophone",
      description: "Catchy 4-bar hook, slightly overdriven.",
      priceCents: 8500,
      bpm: 118,
      days: 6,
    },
    {
      title: "Muted trumpet for a noir jazz intro",
      instrument: "Trumpet",
      description: "Smoke-filled club vibe. Flexible time is fine; follow the piano.",
      priceCents: 11000,
      bpm: null,
      days: 9,
    },
  ];

  for (const job of variety) {
    const pi = await authorizedPaymentIntent(job.priceCents);
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

  // Already-awarded job predates this seed run, so its PaymentIntent is a
  // fake placeholder — fine, since nothing here calls Stripe on it again.
  await db.payment.create({
    data: {
      jobId: guitarJob.id,
      stripePaymentIntentId: "pi_fake_awarded_already",
      amountCents: 6000,
      platformFeeCents: 600,
      status: "transferred",
    },
  });

  console.log("Seeded real Supabase Auth accounts (password: %s):", TEST_PASSWORD);
  console.log("  alex@example.com  (creator + musician) ->", alex.id);
  console.log("  jamie@example.com (musician)           ->", jamie.id);
  console.log("  sam@example.com   (musician)           ->", sam.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
