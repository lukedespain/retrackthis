# Review of Luke's fixes, September 20, 2026

A second adversarial review of `lukedespain/retrackthis`, covering everything Luke shipped
between the September 4 review (commit `7669afe`) and today (commit `43732ea`): 56 commits,
228 files, about 9,200 lines added. It checks Luke's call brief claim by claim, then attacks
the new code the same way the first review attacked the old code. This file is the plain-English
version. `D-critic-consolidated.md` beside it is the master list with file and line for every
finding, and the three raw reports (A, B, C) hold the evidence trail.

Nothing in the repo was changed. Luke's repo was pulled to the latest commit and read.

---

## Bottom line

**Grade: C+.** Real, good-faith progress on the cheap items. The expensive items untouched.
One claim wrong in a way that is breaking job posting today. Nothing has a test.

About half of the Day-1 list is truly closed, and those are real wins: strangers can no longer
list other people's takes, mint upload links, read the database with the public key, or award
themselves their own job from one account. The other half is partly done or done in a way that
won't last.

Three things matter today:

1. **The deadline cap is 3 days, not the 7 Luke's brief says.** Two constants disagree, one
   check is dead code, and the job form's own default (7 days) is rejected by the server. Any
   job that does get through also fires a duplicate "3 days left" email blast within seconds
   of the "new job" alert, because a 3-day job is already inside the 3-day reminder window.
2. **The money engine underneath wasn't touched.** A cancel can still record a captured charge
   as "refunded" with no refund. Two clicks a second apart can still pay one musician and record
   a different one as the winner. And card captures and payouts now run inside the public jobs
   page, triggered by whoever happens to load it. That last one is a regression: on September 4
   the page-load sweep could only release holds; now it can charge and pay.
3. **The new "hide the master until award" feature doesn't hide the work.** Producers get a
   full-length MP3 of every take by design, the WAV link is the MP3 link with the extension
   swapped on a bucket the code still forces public, and on Vercel the MP3 step most likely
   never runs at all, which hands producers the master outright.

The site still isn't safe for real money or for musicians' files. The fix list is short at the
top on purpose: fourteen one-line changes close or shrink most of the HIGH items in a day.

---

## What Luke got right

The review is blunt about gaps, so it's fair to be clear about the wins. These were attacked by
three reviewers and then re-attacked by the critic, and they held:

- **Takes listing is locked down.** Anonymous requests get 401, other musicians and other
  producers get 403, admins and the job's creator get through. The public job list no longer
  includes takes at all, only a count.
- **Buyer is not seller, everywhere it counts.** The guard lives in one shared place
  (`lib/jobActions.ts`), so the provisional pick, the finalize, and the automatic sweep all
  inherit it. Submitting a take to your own job is refused on the same route that handles
  replacements, so replacements inherit it too. Only the two-account version survives.
- **Upload signing requires a session and scopes the path to the user.**
- **Row-level security is on for all five tables**, done as a migration, which is the right
  layer. The anon key can no longer read or write them.
- **A retry after a lost Stripe response no longer double-pays.** Capture checks the intent's
  status first, and transfer checks for an existing transfer on the job before creating one.
- **Price and deadline can't be edited after posting.** The edit route rejects every payment
  field and has no deadline field at all.
- **Webhook signature verification, Connect account binding, and the confirmed-email check on
  admin bootstrap** all held.
- **Google sign-in exchanges the code server-side** with PKCE, so a forged callback can't mint
  a session.

Luke's instincts on where a fix should live were often right. The execution is what leaked.

---

## Scorecard: Luke's 14 claims

| Claim | Verdict | What's actually true |
|---|---|---|
| #1 Takes listing auth | Fixed | Session plus creator-or-admin. Done. |
| #2 Upload signer | Partial | Auth and per-user path, yes. "File types restricted" isn't true: `application/octet-stream` is on the allowlist, which is any file. And the bucket is now forced public on every sign call, which is worse than before. |
| #3 Buyer is not seller | Fixed | Both paths, shared helper. The two-account variant needs the price ceiling and payout delay that were also in the Day-1 list and didn't ship. |
| #5 Relative `next` param | Reopened | The shared helper blocks the obvious tricks but a tab or newline after the first slash gets through (reproduced). The new Google callback doesn't use the helper at all and has a weaker copy that lets `/\evil.com` through. |
| #6 Storage URL prefix | Fixed, with a gap | Applied on all three write paths, but the check is "our bucket," not "your folder," so a user can point at another user's file. The client-supplied preview link is never tied to the master. |
| #7 Seed script guards | Reopened | The guard is a hostname denylist that misses Supabase's direct host, so a developer's normal `.env.local` slips it. The `testpass123` fallback is still in the code. |
| #8 Deadline validation | Wrong | Effective cap is 3 days, the 7-day check can't fire, the form default is rejected. |
| #9 Admin confirmed email | Fixed | Same logic written twice; works while "Confirm email" is on in Supabase. |
| #10 Webhook status guards | Reopened | Two of four events have an allowed-from list; the other two don't. The claimed "transitions hardened" part wasn't done. |
| #11 Instruments and errors | Partial | Instruments route fixed. Error sanitizing was applied to one route; five others still echo raw Stripe, Prisma, and Supabase text. |
| RLS lockdown | Fixed, fragile | Covers today's five tables. No default privileges, so the next table Prisma creates is exposed again. |
| Google SSO | Feature, fine | Works; see #5 for the callback gap. |
| hello@ reply-to | Fixed | Done. |
| DB pool fix | Fixed, needs runtime check | Config-only, lives in Vercel. Migrations through the transaction pooler will need a `directUrl`. |

Of the 37 findings from September 4: 6 closed, 15 partly closed, 16 still open.

---

## What's still open, or new, grouped by cause

Plain language. IDs refer to `D-critic-consolidated.md`.

**Money engine (the same root cause as September 4, now with more paths into it)**
- D-1, CRITICAL: two free accounts (Google makes the second one free) can charge any card any
  amount, pay 90% to their own bank within a minute via "End gig and pay," then dispute. No price
  ceiling, no payout delay, and RetrackThis eats the dispute.
- D-2, HIGH: cancel after a capture still marks the job cancelled with no refund. There's no
  refund code anywhere in the app.
- D-3, HIGH: no lock on job status during money moves. Dashboard load versus click can both
  finalize with different takes.
- D-4, HIGH: captures and transfers now run inside the anonymous jobs page, unbounded, no
  timeout set. Fifty visitors at once means fifty copies of the same finalize racing.
- D-5, D-6, D-7, D-9: auto-finalize only runs when someone loads the board; webhooks still
  check-then-write; no price integer check, no idempotency keys; every post-deadline button is a
  pay button with no confirm step.
- D-8, MEDIUM: the PayPal and Wise path charges the creator against an unverified email, then
  parks the money in a state with no ledger, no "paid" marker, no refund path, and no admin
  notification. It also returns the musician's payout email to the producer.

**Storage and previews (the September 4 public-bucket problem, now with a feature built on it)**
- D-11, HIGH: full-length MP3 previews by design, WAV path derivable, bucket forced public,
  preview step most likely broken on Vercel so masters are handed out directly.
- D-12, HIGH: storage check is bucket-wide; preview link never tied to master. Audition one
  file, get paid for another.
- D-13, D-14, D-15: the transcoder can be pointed at anyone's file and burns 300 seconds of
  CPU per call; any file type is accepted; a pending take can be swapped between audition and
  click.

**The deadline cap (D-10, HIGH):** 3 days not 7, dead code, form default rejected, double
email blast per job.

**Auth and admin hygiene:** open-redirect bypass via tab character (D-16); RLS won't cover the
next table (D-17); seed guard misses the direct host (D-18); admin predicate duplicated (D-19);
still no rate limiting and five routes echo raw errors (D-20); admin payout reset has no audit
trail (D-21); the unmerged "Demo Mode" branch makes every visitor a signed-in user on the
strength of one build-time env var with no production kill switch (D-22).

**Smaller:** reminder sweeps duplicate under concurrent loads (D-23); no security headers
(D-25); public job list still returns full rows (D-26); a September 5 migration re-subscribed
users who had turned job alerts off (D-28); a build cache file is committed and an unused ffmpeg
wrapper is a dependency (D-27).

---

## The two incidents, explained

**The violin job.** Luke's brief reports that a violin job's Stripe hold expired at 7 days, the
job was cancelled, and he's recovering the payment with a one-time Payment Link. This is
exactly finding E-15 from September 4: a 7-day hold against a 7-day-plus-grace schedule. The
fix that shipped (cap deadlines) is the right stopgap, but it shipped with the wrong number.

**The keyboard job.** Posted before the cap, so it's still on the old timer. The critic's
runtime checks include the exact query to find it and the exact Stripe call to see whether its
hold is still alive. If it is, the producer should pick and finalize now. If not, the next pick
will close it as cancelled and it has to be reposted.

---

## On the proposed Checkout capture-on-post change

Luke wants the founders' opinion on replacing card holds with charging the card at post time
(Stripe Checkout: card, Apple Pay, Link). The critic's view, in short:

**Yes, do it, and use it as the vehicle for the state-machine work rather than bolting it on.**
It removes the 7-day timer entirely, which is the root of the violin incident and of every
stopgap since. It's how every comparable marketplace works. It protects the musician, who's the
party this site is built by and for: their money is already in the platform's balance when they
start recording.

What it trades away has to be decided, not discovered: cancellation becomes a real refund of
settled money, and Stripe keeps its processing fee on refunds, so "cancel for a full refund"
costs the platform about 3% plus 30 cents every time. Disputes get longer and stranger. The
platform becomes custodian of every open job's funds, which is a question for a lawyer once.
And the two-account cash-out gets no slower unless a payout delay, a price ceiling, and a dispute
handler ship in the same change.

The hosted Checkout page isn't essential; the existing Payment Element with automatic capture
gets the same result and Apple Pay and Link are configuration. What is essential, in the same
change: the atomic status claim, idempotency keys, persisted charge and transfer and refund IDs,
webhook handlers for `checkout.session.completed`, `charge.refunded`, and
`charge.dispute.created`, and a real refund path. Skip BNPL in the first version. And decide the
preview policy at the same time, because charging real money up front while giving away
full-length MP3s and free cancellation is the worst combination of both.

The alternative (save the card at post, charge at award) avoids refunds and custody, but it
moves the failure to the moment the musician has already done the work, which is the wrong
party to expose.

---

## How this review was run

Verify, refute, critic. Four fresh-context Fable 5.1 reviewers, each given only the code, the
September 4 findings, and Luke's claims, never this conversation:

| Pass | Job | File |
|---|---|---|
| A | Verify each of the 14 claims at file and line; status of all 37 September 4 findings | `A-verify-day1-claims.md` |
| B | Red team the money paths: escrow, finalize, payouts, webhooks, sweeps | `B-refute-payments-payouts.md` |
| C | Red team auth, storage, and every new route and page | `C-refute-auth-storage-surface.md` |
| D | Critic: merge, re-rank, spot-check every CRITICAL and HIGH, re-attack every "held" claim, hunt gaps, grade | `D-critic-consolidated.md` |

44 raw findings became 27. The critic disputed or downgraded six (it lowered the "master gate"
finding from CRITICAL to HIGH because the full-length MP3 is handed out by design anyway,
lowered the transcoder finding because the binary is most likely absent, and rejected a claim
about absolute paths in the committed build file). It upgraded one composition and marked one
"partial" as "reopened" because Luke's own wording claimed the half that wasn't done. Eleven
findings are new, introduced by the 56 commits. The session model (also Fable 5.1) re-read the
deadline cap, the bucket flag, the preview path derivation, the redirect helper, and the takes
and buyer-seller guards at the cited lines before writing this. All held.

No runtime fell back to a cheaper model. Roughly one million subagent tokens across the four
passes.

---

## What happens next

1. Luke gets the fix report (`LUKE-FIX-LIST.pdf` beside this file): fourteen one-liners for
   today, the escrow state machine as one reviewed change for week one, storage and previews for
   week two, abuse and admin after that, and a minimum test list.
2. The founders decide on the call: the price ceiling number, the cancellation policy under
   capture-on-post, the preview policy (clip length or watermark versus full-length), and the
   conditions for ever merging Demo Mode.
3. Luke runs the eight runtime checks in the fix report and reports back one line each. Check
   one settles whether production is even running this code.
4. When this batch lands, the same verify, refute, critic sweep runs again on the diff.
