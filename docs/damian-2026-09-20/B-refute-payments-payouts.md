# B. Red team: payments, escrow lifecycle, payouts (2026-09-20)
Reviewer model: Fable 5.1 (claude-fable-5-1)
Range attacked: 7669afe..43732ea
Files read (in full unless noted): `lib/jobActions.ts`, `app/api/jobs/[jobId]/select-winner/route.ts`, `app/api/jobs/[jobId]/cancel/route.ts`, `app/api/jobs/route.ts`, `app/api/jobs/[jobId]/route.ts`, `app/api/jobs/[jobId]/takes/route.ts`, `app/api/webhooks/stripe/route.ts`, `lib/stripe.ts`, `lib/stripeConnect.ts`, `lib/musicianPayouts.ts`, `lib/connectCountries.ts`, `lib/admin.ts`, `lib/db.ts`, `lib/jobPricing.ts`, `app/api/payouts/alt/route.ts`, `app/api/payouts/status/route.ts`, `app/api/stripe/connect/onboard/route.ts`, `app/api/admin/jobs/route.ts`, `app/api/admin/jobs/[jobId]/three-day-reminder/route.ts`, `app/api/admin/members/route.ts`, `app/api/admin/members/[userId]/reset-payouts/route.ts`, `app/api/admin/stats/route.ts` (money section), `prisma/schema.prisma`, `app/dashboard/CreatorView.tsx` (lines 140-330, 405-669), `lib/notify.ts` (award / deadline / three-day senders), `app/dashboard/PostJobForm.tsx` and `JobPricingFields.tsx` (deadline + price submit paths), `next.config.mjs`, README payment section, prior review `E-critic-consolidated.md` (money findings), and the diffs / messages of the money commits listed in the brief. Greps across `app/` and `lib/` for `refunds.`, `idempotency`, `waitUntil`, `$transaction(async`, `updateMany`, `pending_manual_payout`, `payoutEmail`, `stripeAccountId`, `isWinner`, `.remove(`, `maxDuration`, `cron`.

## Summary
CRITICAL 1, HIGH 3, MEDIUM 7, LOW 2 (13 findings). Three real improvements landed since Sept 4 (one-account self-dealing is closed, the deadline is capped server-side, and a retry no longer issues a second transfer), but the state machine underneath is the same non-atomic, non-refunding one, and the new features widen the blast radius: money now moves on an anonymous `GET /api/jobs`, on a single un-confirmed click, and into a manual-payout state that has no ledger, no paid marker and no refund path. Net: the money paths are somewhat safer against a solo attacker and somewhat riskier against ordinary operational failure.

## Findings (most severe first)

### [CRITICAL] B-1: Two free accounts still turn any card into a 90% Connect payout, now without waiting for a deadline   (reopens E-1, partially mitigated)
- Where: `app/api/jobs/[jobId]/takes/route.ts:139-144`; `lib/jobActions.ts:85-87, 242-244, 131, 195-203`; `app/api/jobs/[jobId]/select-winner/route.ts:26, 47-48, 64`; `app/api/jobs/route.ts:93-98`; `lib/stripeConnect.ts:128-132, 180-182`
- What: The Day-1 guard compares `musicianId === job.creatorId`, so the one-account version of E-1 is closed. Nothing else from E-1's fix list shipped: there is still no price ceiling, no payout delay for new accounts, no Stripe Customer for Radar, no dispute handler. Google SSO (`7e4aad1`) makes a second account a one-minute job. The new `finalize: true` path captures and transfers immediately, at any time, so the attacker no longer needs the job to age.
- Attack / failure scenario: Account A (card) posts a job with `priceCents: 500000` via the API (server only enforces the minimum). Account B (any Connect Express account, or PayPal/Wise, see B-6) submits any file as a take. A calls `POST /select-winner { takeId, finalize: true }` within seconds: `finalizeAward` captures $5,000 and transfers $4,500 to B. A disputes the charge as "service not provided." Stripe debits the platform (it is `losses_collector`); B's funds are already paid out. Loser: RetrackThis, full amount plus dispute fee.
- Evidence:
  ```
  takes/route.ts:139     if (job.creatorId === musicianId) {
  jobActions.ts:85       if (take.musicianId === job.creatorId) {
  jobs/route.ts:93       if (!Number.isFinite(priceCents) || priceCents < MIN_PRICE_CENTS) {      // no maximum
  select-winner:26,48    const forceFinalize = Boolean(body?.finalize);  …  const shouldFinalize = forceFinalize || pastDeadline;
  jobActions.ts:131      paymentIntent = await stripe.paymentIntents.capture(job.payment.stripePaymentIntentId);
  jobActions.ts:197-203  await stripe.transfers.create({ amount: payoutCents, … destination: musician.stripeAccountId!, … source_transaction: chargeId });
  stripeConnect.ts:130   fees_collector: "application", losses_collector: "application",
  stripeConnect.ts:181   fees: { payer: "application" }, losses: { payments: "application" },
  ```
- Confidence: high. Every line on the path was read; the only barrier is a second email address.
- Fix direction: Enforce `priceCents <= SLIDER_MAX_USD * 100` and `Number.isInteger` server-side; attach a Stripe Customer at post so Radar can score; hold transfers for first-time or unverified musicians (or transfer on a delay) and handle `charge.dispute.created`. The buyer≠seller check is necessary but is not a fraud control.

### [HIGH] B-2: Cancel after a capture still writes CANCELLED with no refund; early finalize and the lazy sweep add new ways to land there   (E-8 unchanged, reopens)
- Where: `lib/jobActions.ts:378-404, 185-192, 206-214`; `app/api/jobs/[jobId]/cancel/route.ts:23-27`; `app/api/jobs/route.ts:248-252, 270-284`; `app/dashboard/CreatorView.tsx:233`
- What: `cancelJobAndRefund` still swallows `payment_intent_unexpected_state`, which Stripe returns for a *succeeded* PI as well as a cancelled one, then unconditionally writes `CANCELLED` / `cancelled`. There is no `stripe.refunds.create` anywhere in `app/` or `lib/` (grep). Every path where `finalizeAward` captures and then fails to reach its final `$transaction` leaves the job OPEN with the creator's money captured: transfer rejected (restricted Connect account, cross-border refusal, see Unverified 1), `chargeIdFromIntent` returning null (502 at :186-191), the DB write at :206 failing, or Vercel terminating the anonymous `GET /api/jobs` mid-sweep (the sweep is awaited inside the request and the route sets no `maxDuration`).
- Attack / failure scenario: Producer clicks "End gig & pay this one" on a take that was never provisionally picked. Capture succeeds, `transfers.create` throws, the route returns 502. Job is OPEN and `isWinner` is still false for every take. Path A: the producer sees the error and clicks "Cancel & refund" (button enabled, `disabled={cancelling || editing}`), the job goes CANCELLED, no refund, musician unpaid, creator charged, UI says refunded. Path B needs no click: at deadline + 72h the anonymous sweep sees `takes.length === 0` and calls `cancelJobAndRefund` itself, producing the same state automatically. Loser: the creator (charged for nothing), then the platform when the creator disputes.
- Evidence:
  ```
  jobActions.ts:383      if (!job || job.status !== "OPEN") return;
  jobActions.ts:387-391  await stripe.paymentIntents.cancel(job.payment.stripePaymentIntentId);
                         } catch (err) {
                           // Already canceled/captured on Stripe's side - still sync our records.
                           const code = (err as { code?: string })?.code;
                           if (code !== "payment_intent_unexpected_state") throw err;
  jobActions.ts:395-398  db.job.update({ where: { id: job.id }, data: { status: "CANCELLED" } }),
                         … db.payment.update({ where: { id: job.payment.id }, data: { status: "cancelled" } })
  cancel/route.ts:27     await cancelJobAndRefund(job.id);
  jobs/route.ts:270-274  job.status === "OPEN" && job.takes.length === 0 && new Date(job.deadline).getTime() + CANCEL_GRACE_PERIOD_MS < now
  jobs/route.ts:281      void cancelJobAndRefund(job.id).catch(…)
  grep "refunds."        (no matches in app/ or lib/)
  ```
- Confidence: high. Same code as Sept 4 plus two new callers into the trap.
- Fix direction: In `cancelJobAndRefund`, retrieve the PI first; on `requires_capture` cancel; on `succeeded` either refuse and flag to admin or `refunds.create` and record `refunded`; never write `cancelled` over a succeeded PI. Persist `stripeChargeId` at capture time so the "captured but unrecorded" state is visible.

### [HIGH] B-3: Still no atomic status claim; concurrent finalizes can pay one musician and record another as the winner   (E-9 unchanged)
- Where: `lib/jobActions.ts:60-73, 75-80, 141-157, 195-214, 263-266`; `app/api/jobs/route.ts:249`; `app/dashboard/CreatorView.tsx:43, 433-436`
- What: `finalizeAward` reads `job.status`, then makes 2-4 Stripe calls, then writes unconditionally. Grep for `updateMany` shows only `take.updateMany` on `isWinner`; no `job.updateMany` with a status precondition exists. The "skip transfer if one exists" check at :195 was added for retries but, combined with the unconditional winner write at :207-209, it creates a wrong-person outcome when two finalizes run with different takes.
- Attack / failure scenario: Job has provisional winner T2 and just crossed `finalizeAutoAt`. Producer opens the dashboard (its `GET /api/jobs?mine=true` runs `finalizeDueAwards()` → `finalizeAward(jobId)` → T2) and clicks "Switch & pay this submission" on T1 (`finalizeAward(jobId, T1)`). Interleaving: producer's call captures and transfers to T1's musician; sweep's call retrieves `succeeded`, sees the prior transfer in `transfers.list`, skips creating one, and writes `isWinner = T2`, `AWARDED`, `transferred` after the producer's write. Result: T1's musician has the money, T2 is recorded as winner, T2's musician receives the "you were selected" email (:216-220) and T2's master files unlock to the producer (`takes` GET `:289`). Second interleaving (finalize vs creator cancel): capture, then `cancelJobAndRefund` swallows the cancel error and writes CANCELLED after the award write → CANCELLED job, musician paid, creator charged, creator told it was refunded.
- Evidence:
  ```
  jobActions.ts:71       if (job.status !== "OPEN") { return { ok: false, … } }          // read only, no claim
  jobActions.ts:195-196  const prior = await stripe.transfers.list({ transfer_group: job.id, limit: 1 });
                         if (prior.data.length === 0) {
  jobActions.ts:207-209  db.take.updateMany({ where: { jobId: job.id, isWinner: true }, data: { isWinner: false } }),
                         db.take.update({ where: { id: take.id }, data: { isWinner: true } }),
                         db.job.update({ where: { id: job.id }, data: { status: "AWARDED" } }),
  jobs/route.ts:249      await finalizeDueAwards();        // runs on every GET, including ?mine=true
  ```
  Sub-note: the "already finalized" branch at :141-157 also assigns whatever `takeId` was passed without checking it matches the paid take, and `findFirst({ isWinner: true })` at :77 has no `orderBy`, so two interleaved provisional picks (:263-266, two separate serverless instances) can leave two winners and the sweep pays an arbitrary one.
- Confidence: high on the mechanism; medium on frequency (needs two requests inside one Stripe round-trip; the dashboard's own GET makes it more likely than it looks).
- Fix direction: Before any Stripe call, `db.job.updateMany({ where: { id, status: "OPEN" }, data: { status: "AWARDING" } })` and abort unless `count === 1`; same claim in `cancelJobAndRefund`. Persist `stripeTransferId` and the paid `takeId` in the same write, and refuse to record a winner that differs from the paid take.

### [HIGH] B-4: Anonymous `GET /api/jobs` now captures cards and issues transfers, sequentially, unbounded, inside the request   (E-14 unchanged; escalated from cancels to payouts)
- Where: `app/api/jobs/route.ts:236-252, 277-285, 289-293`; `lib/jobActions.ts:277-312`; `next.config.mjs` (no `maxDuration`; only `app/api/uploads/preview/route.ts:7` sets one)
- What: The sweep has no auth, no lock, no batch limit and no cron. `finalizeDueAwards` loads every OPEN job with a winner and calls `finalizeAward` for each in a loop, each doing `retrieve`, `capture`, `transfers.list`, `transfers.create`, a `$transaction` and an email, all awaited before the job list is returned. The cancel sweep is still `void` fire-and-forget on a serverless runtime.
- Attack / failure scenario: (a) Anyone can choose the exact moment other people's cards are captured by loading the board once `finalizeAutoAt` passes; (b) fifty parallel anonymous GETs → fifty concurrent `finalizeAward` calls per due job → the B-3 races on demand, plus Stripe rate limiting; (c) three due jobs at once push the request past Vercel's function timeout, the marketplace listing 504s for everyone, and a job killed between capture and the DB write lands in B-2; (d) a killed `void cancelJobAndRefund` leaves a job hidden from browse but OPEN. Losers: creators (charged mid-failure), musicians (unpaid), the platform (listing down).
- Evidence:
  ```
  jobs/route.ts:236-237  export async function GET(req: NextRequest) {
                           let where … = { status: "OPEN" };           // no session required
  jobs/route.ts:248-249  try { await finalizeDueAwards(); }
  jobActions.ts:279-284  const candidates = await db.job.findMany({ where: { status: "OPEN", takes: { some: { isWinner: true } }, payment: { isNot: null } }, …
  jobActions.ts:298-300  for (const job of due) { try { const result = await finalizeAward(job.id);
  jobs/route.ts:281      void cancelJobAndRefund(job.id).catch((err) => {
  ```
- Confidence: high.
- Fix direction: Move all sweeps to a Vercel Cron (or a signed internal route), claim rows atomically (`updateMany OPEN → AWARDING` with a `LIMIT`), process a bounded batch per run, and drop the sweeps from the public GET entirely.

### [MEDIUM] B-5: `pending_manual_payout` is a dead end: no amount, no destination snapshot, no paid marker, no refund path   (NEW)
- Where: `lib/jobActions.ts:159-183`; `app/api/jobs/[jobId]/select-winner/route.ts:69-78`; `app/api/admin/jobs/route.ts:34-56`; `app/api/admin/stats/route.ts:77-84`; `app/api/payouts/alt/route.ts:57-67`; `app/api/admin/members/[userId]/reset-payouts/route.ts:69-78`; `prisma/schema.prisma:118-127`
- What: When the winner uses PayPal or Wise, the creator's card is captured in full and `Payment.status` becomes `pending_manual_payout`. That is the whole record. `payoutCents` is computed at :107 and never stored; the destination email, provider and account name are returned once in the HTTP response to the producer and never persisted; the admin jobs list shows only the status string; the stats route excludes the state from captured volume and fee totals; nothing can mark it paid; and the musician can overwrite `payoutEmail` at any time with no notice.
- Attack / failure scenario: Two founders both open the admin panel, both see "pending_manual_payout", both PayPal the musician: double payout with no record to catch it. Or: an admin runs "Reset payout setup" on the member (it wipes `payoutEmail`) before paying, and the destination is gone. Or: the musician's account is taken over the day after the award and `POST /api/payouts/alt` points the payout at the attacker's PayPal; the admin pays the address on file. Or: nobody pays; the state is indistinguishable from paid forever. In every case the creator has already been charged and there is no refund path.
- Evidence:
  ```
  jobActions.ts:164-167  db.payment.update({ where: { id: job.payment.id }, data: { status: "pending_manual_payout", platformFeeCents } }),
  select-winner:77       message: `Awarded. Pay ${formatPayoutProviderLabel(result.provider)} manually. Funds are captured on the platform.`,
  admin/jobs/route.ts:51 paymentStatus: job.payment?.status ?? null,        // no winner id, no payout amount
  admin/stats:79         if (p.status === "captured" || p.status === "transferred") {   // pending_manual_payout not counted
  payouts/alt:57-66      await db.user.update({ where: { id: userId }, data: { … payoutEmail: email, … stripeAccountId: null } });
  schema.prisma:122-125  stripePaymentIntentId String  amountCents Int  platformFeeCents Int  status String   // no payout ledger fields
  ```
- Confidence: high.
- Fix direction: Add a `Payout` row (jobId, takeId, musicianId, provider, destination snapshot, amountCents, status, paidAt, paidBy, externalRef) written in the same transaction as the award; an admin-only "mark paid" endpoint; block `payouts/alt` changes while a payout is pending (or record the change); include the state in stats.

### [MEDIUM] B-6: The "payouts required" gate is satisfied by any made-up PayPal email, and awards capture the creator against that unverified destination   (NEW; weakens 1a383a2)
- Where: `app/api/payouts/alt/route.ts:41-67`; `lib/musicianPayouts.ts:25-32, 58-68`; `app/api/jobs/[jobId]/takes/route.ts:97-109`; `lib/jobActions.ts:90-104, 131, 159-168`
- What: Stripe Connect readiness is a KYC'd, Stripe-verified state. The alt path is a regex on an email and a two-character name, available to any signed-in account in any of the 35 listed countries including the US. Once set, `getMusicianPayoutSnapshot` reports `ready: true`, the takes gate passes, and at award time `finalizeAward` skips `assertMusicianPayoutsReady` and captures the full amount to the platform.
- Attack / failure scenario: A musician (or the second account in B-1) posts `{ country: "US", provider: "paypal", email: "x@example.com", accountName: "ab" }`, submits takes freely, and is awarded. The creator is charged; the admin tries to pay an address nobody owns or a mule; the platform is now the money transmitter to an unverified recipient with no refund path back to the creator. The commit's stated intent ("takes API rejects submits until Connect is ready") no longer holds.
- Evidence:
  ```
  payouts/alt:44         if (!email || !looksLikeEmail(email)) {
  payouts/alt:50         if (!accountName || accountName.length < 2) {
  musicianPayouts.ts:58  if (altReady(user)) { return { ready: true, status: "ready", …
  takes/route.ts:97-98   const payout = await getMusicianPayoutSnapshot(musicianId);  if (!payout.ready) {
  jobActions.ts:95       if (!altPayout) { … await assertMusicianPayoutsReady(musician.stripeAccountId); }   // skipped for alt
  ```
- Confidence: high.
- Fix direction: Treat alt payouts as "pending admin verification" until a founder confirms the destination (or restrict alt to non-Connect countries as the commit message implies); do not capture until the destination is confirmed, or capture only after the creator acknowledges a manual payout.

### [MEDIUM] B-7: Price still has no server ceiling or integer check; the hold is still created before validation completes   (E-13 unchanged; ceiling half of E-1)
- Where: `app/api/jobs/route.ts:59, 93-98, 162-176, 184-208`
- What: `priceCents` is checked only against the minimum. Stripe receives `Math.round(priceCents)` while Prisma receives the raw value for an `Int` column, so a non-integer authorizes the card and then fails the DB write. The PI still carries no `metadata` and no idempotency key, so an orphaned hold cannot be traced or de-duplicated.
- Attack / failure scenario: `priceCents: 250000.5` → Stripe holds $2,500.01, `db.job.create` throws, the creator sees a 500 and a pending charge on their card for a week with no job behind it; "try again" stacks another. `priceCents: 5000000` → a $50,000 hold is accepted by the code (see B-1).
- Evidence:
  ```
  jobs/route.ts:93       if (!Number.isFinite(priceCents) || priceCents < MIN_PRICE_CENTS) {
  jobs/route.ts:165      amount: Math.round(priceCents),
  jobs/route.ts:193      priceCents,                       // raw, into Int column
  jobs/route.ts:164-171  paymentIntent = await stripe.paymentIntents.create({ … confirm: true, … });   // no metadata, no idempotencyKey
  ```
- Confidence: high.
- Fix direction: `Number.isInteger(priceCents) && priceCents <= MAX_PRICE_CENTS`; add `metadata: { creatorId }` and a client-nonce idempotency key; on DB failure `paymentIntents.cancel` in a `catch`.

### [MEDIUM] B-8: Auto-finalize is traffic-dependent and only protects jobs posted after Sept 19; a dead hold still leaves the job OPEN and accepting takes   (E-11 and E-15 partial; the violin incident is still reachable)
- Where: `lib/jobActions.ts:16-34, 113-129, 277-295`; `app/api/jobs/route.ts:126-137, 249`; `app/api/admin/jobs/route.ts:13`; `app/api/webhooks/stripe/route.ts:42-44, 77-105`; `app/api/jobs/[jobId]/takes/route.ts:135-150`
- What: For new jobs the arithmetic works (effective deadline ≤ 3 days, finalize ≤ day 4, cancel ≤ day 6, hold dies day 7) but only if someone loads the job board or admin panel in the window; there is no cron. Jobs posted before `3dddf6e` (the "at-risk keyboard job") keep 7-day deadlines: with no provisional pick the cancel sweep fires at day 10, three days after Stripe auto-cancels the PI. The `payment_intent.canceled` webhook still writes only `Payment.status`, so the job stays OPEN and takes are accepted through day 7. When the producer then picks, `13c663e` closes the job as CANCELLED and the musician is unpaid: the exact violin sequence.
- Attack / failure scenario: Legacy keyboard job, deadline day 7, hold expires day 7 (or earlier if the issuer releases sooner). Musicians submit on days 5-7. Producer picks on day 7: `finalizeAward` retrieves `canceled`, cancels the job, emails everyone. Musicians did the work for nothing; producer cannot pay even if they want to.
- Evidence:
  ```
  jobActions.ts:24       export const AUTH_HOLD_SAFE_MS = 6 * 24 * 60 * 60 * 1000;
  jobActions.ts:33       return new Date(Math.min(afterGrace, beforeHoldDies));
  jobActions.ts:113      if (paymentIntent.status === "canceled" || job.payment.status === "cancelled") {   // closes as CANCELLED, no award
  webhook:42-43          case "payment_intent.canceled": await syncPaymentFromIntent(…, "cancelled");   // Payment only
  takes/route.ts:136     if (!job || job.status !== "OPEN") {                                            // never reads payment.status
  (no vercel.json; only triggers are jobs/route.ts:249 and admin/jobs/route.ts:13)
  ```
- Confidence: high on code; medium on the keyboard job's exact dates (not visible from code).
- Fix direction: Cron-driven sweep (B-4); on `payment_intent.canceled` for an OPEN job, transition the job and notify in the same handler; make `takes` POST refuse unless `payment.status === "authorized"`; for the one legacy job, have the producer "End gig & pay" now or re-post.

### [MEDIUM] B-9: Webhook writes are still check-then-write, `canceled`/`payment_failed` have no allowed-from guard, and the PI id still has no unique index   (E-12 partially fixed)
- Where: `app/api/webhooks/stripe/route.ts:38-44, 46-58, 82-104`; `prisma/schema.prisma:122`; `prisma/migrations/*` (no unique index on `stripePaymentIntentId`)
- What: `amount_capturable_updated` and `succeeded` now carry `onlyIfIn`, which does protect `transferred` and `pending_manual_payout` from those two events. `canceled` and `payment_failed` carry no such guard; only the `transferred` sentinel at :95 stops them, so they can overwrite `pending_manual_payout` and `captured`. The read/decide/write sequence is unchanged and the column is still not unique, so a duplicate `Payment` row or a dashboard "resend" still lands on `findFirst`.
- Attack / failure scenario: Reachability through Stripe is low (a succeeded PI does not emit `canceled`), so the practical exposure is a webhook replay or a duplicate row racing an award and downgrading `captured` to `failed` between the capture and the final `$transaction`; the admin dashboard then misreports and, in B-2, the "already finalized" branch at `jobActions.ts:141` does not fire.
- Evidence:
  ```
  webhook:42-44          case "payment_intent.canceled": await syncPaymentFromIntent(event.data.object as Stripe.PaymentIntent, "cancelled");   // no opts
  webhook:82-84          const payment = await db.payment.findFirst({ where: { stripePaymentIntentId: pi.id } });
  webhook:101-104        await db.payment.update({ where: { id: payment.id }, data: { status: nextStatus } });
  schema.prisma:122      stripePaymentIntentId String
  ```
- Confidence: high on code; low on real-world trigger frequency.
- Fix direction: One `updateMany({ where: { stripePaymentIntentId, status: { in: allowedFrom } }, data })` per event with explicit allowed-from lists for all four events; `@unique` on the column; store `event.id` in a processed-events table.

### [MEDIUM] B-10: One un-confirmed click captures and transfers with no undo, and after the deadline every button is a pay button   (NEW, product-level)
- Where: `app/dashboard/CreatorView.tsx:602-656` (no `confirm(` anywhere in the file); `app/api/jobs/[jobId]/select-winner/route.ts:47-48`; no refund path (B-2)
- What: Every non-winner take shows "End gig & pay this one" next to "Choose this submission" with identical `disabled` state; after the deadline the only control on each take is "Choose & pay this submission". The server forces finalize past the deadline regardless of the `finalize` flag. There is no confirmation dialog, no amount shown on the button, and no refund or reversal path once the transfer has run.
- Attack / failure scenario: A producer auditioning ten takes on a phone mis-taps the primary button on the wrong card. The card is captured and 90% is transferred to the wrong musician in one round trip. The producer's only recourse is support, and support's only tool is the Stripe dashboard (reverse transfer + refund by hand, neither reflected in the DB).
- Evidence:
  ```
  CreatorView.tsx:642-654   <Button size="sm" onClick={onFinalize} disabled={disabled} …>  … "End gig & pay this one"
  CreatorView.tsx:604-621   {pastDeadline ? ( <Button size="sm" onClick={onFinalize} … "Choose & pay this submission"
  select-winner:47-48       const pastDeadline = new Date(job.deadline).getTime() <= Date.now();  const shouldFinalize = forceFinalize || pastDeadline;
  ```
- Confidence: high.
- Fix direction: A confirm step that shows the musician's name and the amount; consider a short server-side undo window (capture now, transfer after N minutes) once B-3's claim exists.

### [MEDIUM] B-11: Reminder sweeps are publicly triggerable and mark-after-send, so concurrent GETs duplicate every blast   (E-14 / E-23 family; NEW code)
- Where: `lib/jobActions.ts:318-373, 411-456`; `lib/notify.ts:105-106`; `app/api/jobs/route.ts:255, 290`; `app/api/admin/jobs/[jobId]/three-day-reminder/route.ts:29-37`
- What: Both reminder sweeps run on every anonymous GET, select on `…SentAt: null`, send, and only then write the timestamp. `notifyJobThreeDaysLeft` fans out with `Promise.all` over every matching musician who has not submitted. No money moves, but the sweeps share the request budget with B-4 and the emails are the product's main musician touchpoint.
- Attack / failure scenario: Fire 30 parallel GETs the minute a job crosses the 3-day mark: every matching musician gets up to 30 copies, the producer gets 30 "time to finalize" emails, Resend rate limits trip, and the award emails in B-3 are delayed or dropped. The admin route re-sends on every POST with no "already sent" check (admin-only, so LOW on its own).
- Evidence:
  ```
  jobActions.ts:444-448  const recipients = await notifyJobThreeDaysLeft(job);
                         await db.job.update({ where: { id: job.id }, data: { threeDayReminderSentAt: new Date() } });
  jobActions.ts:355-365  await notifyProducerDeadlineReached({…});  await db.job.update({ … finalizeReminderSentAt: new Date() });
  notify.ts:105-106      await Promise.all( recipients.map((user) =>
  ```
- Confidence: high.
- Fix direction: Claim first (`updateMany({ where: { id, threeDayReminderSentAt: null }, data: { threeDayReminderSentAt: now } })` and skip unless `count === 1`), then send; move to the cron from B-4.

### [LOW] B-12: The form's default 7-day deadline is rejected by the server, whose effective cap is 3 days   (INFO-grade code/UI mismatch, but it sits on the hold math)
- Where: `app/api/jobs/route.ts:126-137`; `app/dashboard/PostJobForm.tsx:148, 259-262`; `app/dashboard/JobPricingFields.tsx:223`; `lib/jobPricing.ts:14`
- What: `deadline + 72h > now + 6d` rejects any deadline more than 3 days out, so the `MAX_DEADLINE_DAYS = 7` check at :138-144 never binds and the UI's default of 7 (and its "Maximum 7 days" hint) fails with "Deadline is too far out". Not a money bug, but the obvious "fix" (loosening the server window) would reopen E-15, and the pricing multiplier still treats 7 days as baseline.
- Evidence:
  ```
  jobs/route.ts:128-129  const maxWindowMs = 6 * 24 * 60 * 60 * 1000;
                         if (deadlineDate.getTime() + CANCEL_GRACE_PERIOD_MS > Date.now() + maxWindowMs) {
  PostJobForm.tsx:148    const [deadlineText, setDeadlineText] = useState(String(MAX_DEADLINE_DAYS));
  JobPricingFields.tsx:223  info={`Maximum ${MAX_DEADLINE_DAYS} days. Card holds last about a week from posting …`}
  ```
- Confidence: high on the arithmetic (not run against production).
- Fix direction: Derive one constant (`MAX_DEADLINE_DAYS = 3` while holds are the escrow) and use it in both places; keep the server as the source of truth.

### [LOW] B-13: A pending take's content can be swapped after the producer auditioned it, and replaced masters are orphaned in public storage   (a9d6e83, NEW)
- Where: `app/api/jobs/[jobId]/takes/route.ts:186-222`; grep `.remove(` (no storage deletion anywhere)
- What: Replacement is blocked once `isWinner` is set and once the job leaves OPEN, which holds for the provisional-pick flow. It is not blocked for the direct "End gig & pay this one" flow (no provisional pick, so `existing.isWinner` is false until the final transaction), and the deleted `TakeFile` rows' objects stay at their public URLs.
- Attack / failure scenario: Musician uploads a strong take, producer auditions it, musician replaces it with a different performance (same take id) seconds before or during the producer's finalize; the producer pays for content they did not hear. The "replaced" email fires, but after the money has moved. Separately, every replaced master remains downloadable by URL forever.
- Evidence:
  ```
  takes/route.ts:191     if (existing.isWinner) { return … "This take was already selected and can’t be replaced." …
  takes/route.ts:196     await tx.takeFile.deleteMany({ where: { takeId: existing.id } });     // rows only
  ```
- Confidence: medium (the race window is one request; the orphaning is certain).
- Fix direction: Record the `TakeFile` ids the producer is paying for in the finalize write and refuse if they changed; remove replaced objects from storage (or move them to a private prefix).

## Controls that held (what I attacked and could NOT break, with file:line)
- Buyer≠seller on every award path: takes POST `takes/route.ts:139-144` (runs before the replacement branch at :186, so replacement inherits it); provisional pick `jobActions.ts:242-244`; finalize `jobActions.ts:85-87`; the sweep goes through `finalizeAward`, so it inherits :85. No admin award route exists (`app/api/admin/*` has no select-winner). Only the two-account variant survives (B-1).
- Price and deadline cannot be edited: `app/api/jobs/[jobId]/route.ts:33-48` rejects any payment key; the `data` shape at :50-56 has no `deadline`, so PATCH cannot push a deadline past the hold.
- Deadline is bounded server-side on POST: `jobs/route.ts:119-144` (future, ≤ 6d minus grace, ≤ 7d). Tighter than the UI (B-12) but safe.
- Late `amount_capturable_updated` / `succeeded` cannot regress `transferred` or `pending_manual_payout`: `webhook:48-50, 55-57` (`onlyIfIn`) and `:95`.
- `account.updated` no longer overwrites an existing `stripeAccountId`: `webhook:127-134` (E-25 closed on the webhook side).
- A retry after a lost capture response does not double-capture: `jobActions.ts:112, 130-132` retrieve-then-branch. A retry after a lost transfer response does not double-transfer: `jobActions.ts:195-204` (`transfers.list` by `transfer_group`). The concurrent double-transfer is bounded by Stripe's per-`source_transaction` cap (relied on, not proven here; see Unverified 5).
- No interactive `$transaction` spans a Stripe call: the only `$transaction(async` is `takes/route.ts:195-208` (DB-only). All Stripe calls in `finalizeAward` happen outside the batch transactions. `connection_limit=1` therefore cannot deadlock a money path on its own.
- Admin-only routes are gated by `requireAdmin()` on the first line: `reset-payouts:16`, `three-day-reminder:10`, `admin/jobs:9`, `admin/members:10`. `getAdminUser` requires a confirmed email before bootstrapping from the allowlist (`lib/admin.ts:39-47`).
- Masters unlock only when `job.status === "AWARDED" && take.isWinner` (`takes/route.ts:285-289`); a provisional pick does not leak WAVs.
- The cancel sweep skips jobs with a recorded winner: `jobs/route.ts:270-275`. (It does not skip jobs whose finalize failed before the winner write; that is B-2 path B.)
- A picked take cannot be replaced: `takes/route.ts:191`. A take cannot be submitted or replaced after the deadline or on a non-OPEN job: `:136, :145`.
- Upload signing requires a session: `app/api/uploads/sign/route.ts:32-35` (E-4 closed).
- The `payouts/alt` route cannot change `stripeAccountId` to an attacker-chosen value (it only nulls it, `:65`), and the onboard route only creates accounts with `metadata.userId` of the caller (`onboard:79-84`), so a musician cannot point Stripe transfers at someone else's Connect account.

## Unverified suspicions (needs Stripe/Supabase/Vercel evidence)
1. Cross-border transfers to Accounts-v2 recipients with `merchant.card_payments` requested (`aedfb08`). A US platform's `transfers.create` to a GB/EEA account under a full service agreement may be refused by Stripe. If so, every non-US award captures and then throws, landing in B-2 on every UK/EU musician. Test in test mode with a GB Express account before the next UK award.
2. Stripe's 7-day authorization window is an upper bound, not a guarantee; some issuers and non-card methods enabled under `automatic_payment_methods` release sooner. `AUTH_HOLD_SAFE_MS = 6d` assumes the full window. Check the PI's `latest_charge.payment_method_details` and Stripe's per-method auth limits for what is actually enabled in the Dashboard.
3. Vercel `maxDuration` on the current plan for `GET /api/jobs`. With two or three due jobs plus emails the sweep can exceed 10 s. Check function logs for 504s on `/api/jobs`.
4. `DATABASE_URL` actually uses port 6543 with `pgbouncer=true&connection_limit=1`; the code only asserts it in a comment (`lib/db.ts:3-5`). Also confirm Prisma's `$transaction([...])` batches are executing as single transactions through PgBouncer transaction mode (they should; interactive transactions are the risky kind and there is only the DB-only one).
5. Stripe's rejection of a second `transfers.create` whose cumulative amount against one `source_transaction` exceeds the charge. Both reviews rely on it to bound B-3's concurrent case; confirm in test mode and do not rely on it for correctness.
6. Whether `transfers.list({ transfer_group })` returns transfers that were later reversed in the Dashboard. If it does (expected), a reversed wrong-person transfer permanently blocks the retry at `jobActions.ts:195-204` and the correct musician can never be paid through the app.
7. The live webhook endpoint subscribes to `payment_intent.canceled`, `payment_intent.succeeded`, `payment_intent.amount_capturable_updated`, `payment_intent.payment_failed` and `account.updated` in live mode, and there is no second endpoint from the test era still delivering.
8. Which production jobs predate `3dddf6e` (Sept 19) and still carry a 7-day deadline (B-8). Query `Job.createdAt < '2026-09-19' AND status = 'OPEN'`.

## Notes for the critic (design-level)
- The planned Stripe Checkout capture-on-post makes B-2 a blocker rather than a corner case: every cancellation becomes a refund of settled money, so `refunds.create`, a `refunded` state, and refund-failure handling must exist before that ships. It also lengthens the dispute window (charged on day 0, cancelled on day 6, refunded, then disputed anyway) and makes the platform a custodian of all open-job funds; the same non-atomic state machine will be holding real balances instead of holds.
- PayPal/Wise manual payouts turn the platform into the payer of record to recipients it has not verified (Stripe did KYC on Connect; nobody does it here). That is an AML / 1099 / sanctions exposure on top of B-5 and B-6, and it is enabled for US musicians too, not only for non-Connect countries as the commit message says.
- Full-length MP3 previews (`lib/audioPreview.ts` sets only `-b:a`, no `-t`) are served to the producer before payment, and the producer can cancel any OPEN job for a full refund at any time (`cancel/route.ts`), including after auditioning every take. A producer can harvest usable demos for free; only the masters are gated. That is a marketplace-economics decision, not a bug, but it interacts with B-10 (musicians already bear the risk) and belongs in front of all three founders.
- One `finalizeAward` serves three callers with three trust levels (producer POST, anonymous GET sweep, admin GET). The function cannot tell who invoked it. Splitting "claim" from "execute" (B-3, B-4) and moving execution to a cron would make the producer route the only interactive money path.
- `Payment.status` is a free-text `String`. A Prisma enum for it and a `Payout` table (B-5) are the cheapest way to make the next review able to enumerate states instead of grepping for literals.
