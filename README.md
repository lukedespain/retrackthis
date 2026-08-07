# retrackthis.com — a marketplace for real musicians to retrack demo parts

Creators upload a demo (e.g. a MIDI bass line). Musicians submit their own
recorded take of the part. The creator picks a favorite. The winning
musician gets paid.

## How to use this with Cursor

This repo is scaffolded backend-first: data model, API routes, and business
logic (job creation, take submission, winner selection, Stripe payout) are
already stubbed out. Open this folder in Cursor and point it at `/app` —
Cursor is good at:

- Building out the actual page UI (`app/(marketing)/page.tsx`,
  `app/dashboard/**`) against the API routes below
- Wiring up an audio player/waveform component for demos and takes
- Styling — you mentioned Figma/Gumroad as references, so lean minimal:
  lots of whitespace, one accent color, system font stack or a single
  clean sans (e.g. Inter)

Come back to me (Claude) for: schema changes, new API routes, payment/
escrow logic, auth rules, anything server-side or data-model-shaped.

## Data model (see `prisma/schema.prisma`)

- **User** — `role`: CREATOR | MUSICIAN (a person can be both). Musicians
  have a `stripeAccountId` (Stripe Connect) so they can receive payouts.
- **Job** — posted by a creator. Has a demo file, description of the part
  needed, a price, a deadline, and a status (`OPEN` → `AWARDED` /
  `CANCELLED`).
- **Take** — a musician's submitted recording against a Job.
- **Payment** — created when a Job is posted (the charge/hold) and
  captured/transferred when a winner is selected.

## Payment flow (the important part)

1. Creator posts a Job → we create a Stripe **PaymentIntent** for the price
   and **authorize but don't capture** it (`capture_method: manual`). This
   is the escrow: the creator's card is verified and the funds are held,
   but not charged yet.
2. Musicians submit Takes — free to do, no payment involved.
3. Creator selects a winner → we **capture** the PaymentIntent, then use
   **Stripe Connect transfers** to pay the winning musician's connected
   account (minus your platform fee).
4. If a Job's deadline passes with no winner chosen, cancel the
   PaymentIntent (releases the hold, creator isn't charged).

This is what makes it feel like a "real gig" to musicians (the money is
provably there) without you touching real money until a winner is picked.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase + Stripe keys
npx prisma migrate dev
npm run dev
```

## Stack

- **Next.js (App Router)** — one codebase, frontend + API routes
- **Prisma + Postgres** (Supabase's Postgres works well) — schema/ORM
- **Supabase Storage** — demo + take audio files
- **Supabase Auth** — login/signup
- **Stripe Connect** — musician payouts, escrow via manual capture
