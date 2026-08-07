# retrackthis.com — a marketplace for real musicians to retrack demo parts

Creators upload a demo (e.g. a MIDI bass line). Musicians submit their own
recorded take of the part. The creator picks a favorite. The winning
musician gets paid.

## Status

The core loop is built and tested end-to-end against real Supabase Postgres,
Supabase Storage, Supabase Auth, and Stripe test mode: sign up, post a job
(real escrow hold), submit takes, pick a winner (real capture), cancel for a
refund. See `HANDOFF.md` for what's intentionally left undone and where to
pick up next.

## Data model (see `prisma/schema.prisma`)

- **User** — `role`: CREATOR and/or MUSICIAN (every account gets both).
  `id` matches the Supabase Auth user id. Musicians have a `stripeAccountId`
  (Stripe Connect) so they can receive payouts.
- **Job** — posted by a creator. Has a demo file, description of the part
  needed, a price, a deadline, and a status (`OPEN` → `AWARDED` /
  `CANCELLED`).
- **Take** — a musician's submitted recording against a Job.
- **Payment** — created when a Job is posted (the charge/hold) and
  captured/transferred when a winner is selected.

## Payment flow (the important part — don't change without flagging it)

1. Creator posts a Job → we create a Stripe **PaymentIntent** for the price
   and **authorize but don't capture** it (`capture_method: manual`). This
   is the escrow: the creator's card is verified and the funds are held,
   but not charged yet.
2. Musicians submit Takes — free to do, no payment involved.
3. Creator selects a winner → we **capture** the PaymentIntent, then use
   **Stripe Connect transfers** to pay the winning musician's connected
   account (minus the platform fee).
4. Creator can cancel an OPEN job any time for a full refund (releases the
   PaymentIntent hold). If a deadline passes with no winner chosen, the same
   thing happens automatically after a 72-hour grace period (see
   `lib/jobActions.ts` — a lazy sweep on `GET /api/jobs`, not a real cron job).

This is what makes it feel like a "real gig" to musicians (the money is
provably there) without real money moving until a winner is picked.

Every mutating API route derives the acting user from the Supabase Auth
session (`lib/supabaseServer.ts`) — never from a client-supplied id.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase + Stripe keys
npx prisma migrate dev
node prisma/seed.js          # creates 3 real, pre-confirmed test accounts
npm run dev
```

Test accounts (password `testpass123` for all): `alex@example.com`
(creator + musician, owns the seeded demo jobs), `jamie@example.com` and
`sam@example.com` (musicians with takes submitted on Alex's jobs).

Supabase email confirmation should be **off** for local dev (Dashboard →
Authentication → Providers → Email → "Confirm email") — Supabase's test
email sender is rate-limited and will block repeated sign-ups otherwise.

## Stack

- **Next.js (App Router)** — one codebase, frontend + API routes
- **Prisma + Postgres** (Supabase) — schema/ORM
- **Supabase Storage** — demo + take audio files, direct-to-browser upload
  via signed URLs (`app/api/uploads/sign`), 20MB server-enforced cap
- **Supabase Auth** — email/password via `@supabase/ssr`, session cookies
  refreshed in `middleware.ts`
- **Stripe** — escrow via manual-capture PaymentIntents, payouts via Connect
  transfers (Connect *onboarding* isn't built yet — see `HANDOFF.md`)
