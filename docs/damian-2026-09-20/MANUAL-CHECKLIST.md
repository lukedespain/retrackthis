# Luke — manual checklist (before / with charge-upfront deploy)

Things that cannot be done from code alone. Check these off before calling the release done.

## Stripe Dashboard (live mode)

- [x] **Webhook endpoint** `https://retrackthis.com/api/webhooks/stripe` includes at least:
  - [x] `checkout.session.completed` ← **required for pay-upfront** (done 2026-09-20; no redeploy)
  - [x] `checkout.session.expired` (done 2026-09-20; no redeploy)
  - [ ] `payment_intent.succeeded`
  - [ ] `payment_intent.payment_failed`
  - [ ] `payment_intent.canceled`
  - [ ] `payment_intent.amount_capturable_updated` (legacy holds still open)
  - [ ] `charge.refunded`
  - [ ] `account.updated`
  - [ ] Later: `charge.dispute.created`, `charge.dispute.closed`
- [ ] “Listen to events on **connected accounts**” is ON for Connect events you care about
- [ ] No stale test-mode-only endpoint still pointed at production
- [ ] Confirm live `STRIPE_WEBHOOK_SECRET` in Vercel matches this endpoint’s signing secret
- [ ] Optional: Radar rules / velocity limits (Damian D-1)
- [ ] Optional: decide BNPL off for v1 (Damian recommends skip)

## Vercel

- [ ] Deploy only after code PR is ready (do **not** promote a preview that has `DEMO_MODE=true`)
- [ ] `STRIPE_SECRET_KEY` / `DATABASE_URL` scoped so Preview cannot use live money + prod DB (Damian D-22)
- [ ] Production `DATABASE_URL` is Supabase **pooler** `:6543` with `pgbouncer=true` (+ `connection_limit` as needed)
- [x] Add `CRON_SECRET` (Production env; set 2026-09-20, no redeploy yet). Luke: 16-character password he will remember — value is **not** stored in this repo. Vercel Cron calls `GET /api/cron/jobs` hourly with `Authorization: Bearer $CRON_SECRET`. Without it, deadline finalize/refund/reminders do not run after the payment code ships.
- [ ] Apply Prisma migration `20260921040000_award_cancel_claims` **with** the charge-upfront deploy (`AWARDING` / `CANCELLING` + `moneyClaimedAt`) — not before keyboard award

## Supabase

- [ ] Auth → Email: **Confirm email** ON; **Secure email change** ON (Damian D-19)
- [ ] Google provider redirect allowlist includes `https://retrackthis.com/auth/callback`
- [ ] RLS migration applied (already done once — re-verify Advisors empty for “RLS Disabled in Public”)
- [ ] Decide: turn **Data API** off if unused (Damian D-17)
- [ ] Storage `audio-files`: note it is still public until private-bucket epic (Damian D-11) — product risk, not a Checkout blocker

## Product / founder decisions (write down before go-live)

- [ ] **Cancel / refund policy:** full refund forever vs free-cancel window then fee absorbed / passed through (Stripe keeps ~2.9%+$0.30 on refunds)
- [ ] **Preview policy:** full-length MP3 OK vs clipped/watermarked (Damian: worst combo = charge upfront + free full masters + free cancel)
- [ ] **Price ceiling:** currently $500 server-side — confirm number
- [ ] **Accept or fix D-3 race** before live (atomic award claim)
- [x] Keyboard gig: Aaron submitted; Luke reviewed takes as usable. Bryon still needs **End gig & pay** while hold still alive (legacy escrow) — deploy blocker

## Smoke test after deploy (test mode first if possible)

- [ ] Post job → lands on Stripe Checkout → pay → returns to `/producers` → job is **Open**
- [ ] Abandon Checkout → job stays **Awaiting payment** → Finish payment / Discard draft works
- [ ] Cancel open paid job → Stripe shows refund; admin payment status `refunded`
- [ ] Award → Connect transfer (or pending_manual_payout) without a second card capture
- [ ] Webhook logs show `checkout.session.completed` processed (no stuck PENDING_PAYMENT)

## Do not merge yet

- [ ] Demo Mode branch (`NEXT_PUBLIC_DEMO_MODE`) without runtime production kill-switch (Damian D-22)
