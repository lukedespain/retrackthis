# Damian Sept 20 review — triage for charge-upfront deploy

Sources (in this folder):
- `REVIEW-SUMMARY.md` — plain English
- `D-critic-consolidated.md` — master findings D-1…D-28
- `A` / `B` / `C` — evidence trail
- `LUKE-FIX-LIST.html` — ordered fix list

**Rule:** Do not push/deploy charge-upfront until this file’s “Ship with Checkout” column is closed or explicitly deferred by founders.

---

## Damian’s Checkout opinion (agrees — with conditions)

Charge-at-post **is** the right product move (kills the 7-day hold timer). He says it must **not** be bolted on alone. Same change should carry the money state-machine work, or at least the items marked **BLOCKER** below.

---

## Scoreboard vs our uncommitted Checkout work

| ID | Severity | Damian ask | Our status (2026-09-20 working tree) | Before live deploy? |
|---|---|---|---|---|
| D-1 | CRITICAL | Price ceiling + later payout delay / Radar / disputes | Ceiling + integer check **done** on `POST /api/jobs`. Delay / dispute / Radar **not** | Ceiling: ship. Rest: **defer** (track) |
| D-2 | HIGH | Cancel must `refunds.create` on succeeded PI | **Done** in `cancelJobAndRefund` | Ship |
| D-3 | HIGH | Atomic `OPEN → AWARDING` claim before Stripe | **Done** locally (`claimJobForAward`, 30s resume, capture/transfer/refund idempotency keys). Migration `20260921040000` not applied. | Ship with deploy |
| D-4 | HIGH | Move sweeps off public `GET /api/jobs` → cron | **Done** locally: `GET /api/cron/jobs` + hourly `vercel.json`. Needs `CRON_SECRET` on Vercel. | Ship with deploy |
| D-5 | MED | Cron + cancel webhook closes job; takes need good payment | Cron calls the same sweeps. `checkout.session.expired` abandons unpaid drafts. | Ship |
| D-6 | MED | Webhook `updateMany` + `@unique` PI + onboard claim | `@unique` **done**; `checkout.session.completed` **done**; expired session **done**. Disputes still later. | Unique + checkout events enough to ship |
| D-7 | MED | Integer + ceiling + metadata + idempotency | Ceiling/integer/metadata **done**. Checkout, capture, transfer, and refund use idempotency keys. | Ship |
| D-8 | MED | Payout ledger; don’t return payout email to creator | Email leak **removed** from select-winner JSON. Ledger still later. | Email: ship. Ledger: week-1 |
| D-9 | MED | Confirm step on pay buttons | **Not done** | Nice-to-have |
| D-10 | HIGH | 3-day cap while on holds; reminder skip | Checkout uses **7-day** cap. Reminder skip for short / brand-new jobs **done**. | Ship |
| D-11–15 | HIGH/MED | Private bucket / preview policy / owner paths | Out of scope for this money cutover | **Later epic** (founders decide preview policy) |
| D-16 | MED | `safeInternalPath` + callback | **Done** (URL parse + control chars + callback uses helper) | Ship |
| D-17 | MED | Default privileges revoke | **Not done** | Soon (migration) |
| D-18 | MED | Seed allowlist | Partial (denylist still) | Soon |
| D-19–21 | MED/LOW | Admin hygiene, rate limits, audit | Partial / not | Later |
| D-22 | MED | Demo Mode branch kill-switch | Don’t merge Demo Mode | Manual: never promote DEMO_MODE |
| D-23 | LOW | Claim-then-send reminders | **Not done** | With D-10 reminder fix |
| D-25–28 | LOW | Headers, DTO, consent flip | Not | Later |

---

## Minimum “considered + safe enough” for *this* deploy

If founders accept shipping Checkout **without** full Week-1 state machine:

### Must close in code (this PR)
1. Refund path (D-2) — done  
2. Price ceiling + integer (D-1/D-7) — done  
3. `PENDING_PAYMENT` + activate only when paid — done  
4. `checkout.session.completed` (+ confirm-checkout fallback) — done  
5. Unique PI id — done  
6. Reminder skip for short / just-created jobs (D-10 blast) — done  
7. Stop returning musician payout email on select-winner (D-8 quick) — done  
8. Soften FAQ/Terms for pay-upfront — done  
9. Atomic award claim (D-3) — done locally; apply migration `20260921040000` with the deploy  
10. Sweeps on cron only (D-4) — done locally; set `CRON_SECRET` before relying on it  

### Explicitly defer (track, do not pretend closed)
- Storage / previews (D-11…)  
- Payout ledger (D-8 full)  
- Dispute handler + payout delay (D-1 rest)  
- Rate limits (D-20)  
- Confirm step on pay buttons (D-9)  

---

## Luke manual checklist

See `MANUAL-CHECKLIST.md` in this folder.
