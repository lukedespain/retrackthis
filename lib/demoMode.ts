// Demo Mode powers preview/staging deployments: a fixed signed-in user and
// seeded mock data, with no dependency on real Supabase Auth or Stripe.
//
// Enable it ONLY via NEXT_PUBLIC_DEMO_MODE="true" on a Vercel Preview
// deployment's environment variables (never Production) — see README for
// the full staging setup. Inert everywhere this env var isn't set.
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// Matches the id seeded by prisma/seed-demo.js.
export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";
