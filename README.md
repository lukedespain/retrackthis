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
  transfers. Musicians onboard from **Dashboard → My submissions → Set up payouts**
  (Express Account Link; Accounts v2 with v1 fallback).
- **Email** — Resend. Musicians pick instrument filters in **Settings**; new
  matching jobs (on by default), new takes, and award/cancel outcomes send emails you can turn off.

## Stripe webhook (production)

Endpoint: `POST /api/webhooks/stripe` → `https://retrackthis.com/api/webhooks/stripe`

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. URL: `https://retrackthis.com/api/webhooks/stripe`
3. Events to send:
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `payment_intent.amount_capturable_updated`
   - `payment_intent.succeeded`
   - `account.updated`
4. Copy the endpoint **Signing secret** (`whsec_…`) into Vercel as `STRIPE_WEBHOOK_SECRET`
5. Ensure Vercel also has matching-mode keys:
   - `STRIPE_SECRET_KEY` (`sk_test_…` or `sk_live_…`)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_test_…` or `pk_live_…`) — required for the post-job card form (Stripe Elements)
6. Redeploy after changing env vars
7. In the webhook detail page, **Send test webhook** and confirm a `200` response

Posting a job collects a real card via Stripe Payment Element (authorize / hold only;
capture still happens when you pick a winner).
Local testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and put that CLI `whsec_` into `.env.local`.

Handlers sync `Payment.status` from PaymentIntent events and, for Connect,
save `User.stripeAccountId` when `account.updated` has `metadata.userId` and
`payouts_enabled` (account creation with that metadata lands in the Connect step).

## Email (Resend)

1. Create a [Resend](https://resend.com) account and verify `retrackthis.com`
2. Add to Vercel:
   - `RESEND_API_KEY` (`re_…`)
   - `RESEND_FROM` e.g. `RetrackThis <beth.t@example.com>`
3. Redeploy. Until these are set, job posting still works; emails are skipped.

Inbound (`hello@retrackthis.com` → `music@lukedespain.com`):

1. Resend → Domain → Enable receiving, wait until the MX record is **Verified**
2. Resend → Webhooks → Add `https://retrackthis.com/api/webhooks/resend` for `email.received`
3. Put the signing secret in Vercel as `RESEND_WEBHOOK_SECRET`
4. Redeploy
