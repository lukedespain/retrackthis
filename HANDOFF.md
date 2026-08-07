# Handoff to Cursor — frontend polish pass

This was built backend-first by Claude: full data model, API routes,
payment/escrow logic, and a **functional but intentionally minimal** UI to
prove the whole loop works. It does — sign up, post a job (real Stripe
escrow), submit takes, pick a winner (real capture + attempted transfer),
cancel for a refund, all tested against real Supabase + Stripe test mode.

**Update:** Cursor already did a first design pass (commit `3ff7a3f`,
"Apply a minimal Gumroad-style frontend design pass"). Claude reviewed it —
boundaries were respected (no backend/API/schema changes snuck in), and it's
good work: a real extended design system now lives in `components/ui/`
(`Card`, `Input`, `Textarea`, `EmptyState`, `RoleToggle`, `SegmentedControl`,
plus `Button`/`Badge` from before), `components/AuthLayout.tsx`,
`components/DashboardHeader.tsx`, and `components/Logo.tsx`. **Build on
these, don't reinvent them.** The repo now has a GitHub remote
(`github.com/lukedespain/retrackthis`, branch `main`) — commit and push
directly, no more local-only setup needed.

Tailwind is wired up with an extended theme (`accent`/`accent-muted`,
`surface`, `shadow-card`, custom radii — see `tailwind.config.ts`), and Inter
is loaded via `next/font`. Original brief was Gumroad/Figma-style
minimalism — lots of whitespace, one accent color, clean sans-serif. Keep
leaning into that.

## What's fair game to restyle/rebuild freely

- `app/(marketing)/page.tsx` — landing page
- `app/dashboard/**` — all the dashboard views, forms, cards
- `components/**` — anything here
- Layout, spacing, typography, color, empty states, loading states,
  micro-interactions — go wild

## What NOT to touch without checking with Claude first

- `prisma/schema.prisma` — the data model
- Anything under `app/api/**` — API routes, especially payment/escrow logic
- `lib/stripe.ts`, `lib/jobActions.ts` — payment flow
- `lib/supabaseServer.ts`, `middleware.ts` — auth/session handling

Every mutating API route derives the acting user from the session (never a
client-supplied id), so forms should just call the routes as-is — no need to
pass `creatorId`/`musicianId` anywhere in a request body.

## Done since the last handoff

- ~~Role switcher placement~~ — done. Creator/Musician is now a pill toggle
  next to the username (`components/DashboardHeader.tsx`,
  `components/ui/RoleToggle.tsx`), and "Open jobs / My submissions" mirrors
  the same pattern one level down in the musician view.

## Known open items (from a product conversation, not yet built)

1. **"My contacts" — a musician rolodex.** Idea: let a creator notify
   musicians they've worked with before when posting a new job — a way to
   assemble a repeat remote team over time, while the open marketplace
   stays the discovery/onboarding path for people who don't have that
   network yet. **Not scoped — needs a product decision before it's built,
   not just a UI mockup:**
   - What counts as "worked with"? Anyone who ever submitted a take on your
     job, or only people you actually picked as a winner?
   - Does an invited job still run through the normal open submit-and-pick
     flow, or become a private direct-hire? (Leaning toward "still open" —
     bypassing the pool entirely risks recreating the same
     new-musician-can't-get-visibility problem this product is trying to
     avoid vs. Fiverr/Upwork.)
   - This implies a real notification channel (email at minimum) that
     doesn't exist yet — that's infrastructure, not just a feature flag.

   Bring this back to Claude for the data model / notification approach
   once the product questions above are answered.

2. **Real card collection.** `PostJobForm.tsx` currently sends Stripe's
   published test-mode PaymentMethod token (`pm_card_visa`) instead of a
   real card — there's no Stripe Elements integration yet. Needed before
   this can work with anything beyond Stripe test mode.

3. **Real Stripe Connect onboarding.** Seeded musicians have fake/test
   `stripeAccountId` values. Building real onboarding also hit a snag worth
   knowing about: this Stripe account has Accounts v1 disabled (Stripe's
   pushing everyone to a newer v2 Accounts API), so account creation needs
   the v2 API, not the v1 helpers most Stripe examples still show.

4. **Deployment.** Still local-only — no hosting, no domain wiring yet.

## Local setup

See `README.md`. Test accounts: `alex@example.com` / `jamie@example.com` /
`sam@example.com`, password `testpass123` for all three. Alex has both
roles and owns the seeded demo jobs; Jamie and Sam are musicians with takes
already submitted on those jobs.
