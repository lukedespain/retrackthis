# Retrack This — run costs (one-pager)

**As of:** Sep 22, 2026 · for founders / ops  
**Purpose:** What’s on the card each month, what’s free, and what scales with usage.

---

## Monthly subscriptions (product infra)

| Service | Plan | Amount | Notes |
|--------|------|--------|--------|
| **Supabase** | Pro | **~$26.89**/mo | ~$25 list + tax. Started ~Sep 10, 2026. DB + Auth + Storage. |
| **Google Workspace** | Business Starter · 1 user (`hello@`) | **$8.40**/user/mo | List price (flexible plan). Tax may appear on the invoice. Paid service after trial (~**Nov 1, 2026**). |
| **Vercel** | Hobby | **$0** | Hosts the Next.js app. Upgrade to Pro only if we outgrow Hobby (cron/build limits). |

**Subtotal once Workspace bills:** ≈ **$35.30**/mo (+ any Workspace tax).

---

## Annual / one-time

| Service | Amount | Next |
|--------|--------|------|
| **Domain** (`retrackthis.com` via Squarespace) | **$11.25**/yr | Renews **Aug 7, 2027** |

---

## Free (for now)

| Service | Status |
|--------|--------|
| **GitHub** | Free |
| **Resend** (transactional email) | Free tier — watch send volume before ads scale |
| **Slack** | Free |
| **Stripe** | No monthly fee — pay-per-charge (see below) |

---

## Usage-based (not a subscription)

| Item | Cost | Notes |
|------|------|--------|
| **Stripe processing** | ~**2.9% + $0.30** per successful US card charge | Scales with job volume. Stripe also keeps a cut on **refunds**. |
| **Platform fee (product)** | **10%** of job price | Ours — taken at award from the paid amount; not an Infra bill. |
| **Cursor / AI tokens** | Personal / shared tooling | Absorbed outside Retrack This OpEx for now. |

---

## Rough yearly picture (infra only)

| Line | Estimate |
|------|----------|
| Supabase × 12 | ~$323 |
| Google Workspace × 12 (from when paid) | ~$101 |
| Domain | $11.25 |
| **Total** | **~$435–450**/yr |

Does **not** include Stripe fees, Cursor, or future Vercel/Resend upgrades.

---

## When something would jump

1. **Resend paid** — if alert/award email volume blows the free tier (ads / big beta).
2. **Vercel Pro** — if Hobby cron/build limits block product needs.
3. **More Workspace seats** — each extra user ≈ +$8.40/mo.
4. **Supabase** — storage/egress if audio volume grows a lot (watch dashboard).

---

## Owner checklist

- [ ] Confirm Workspace first paid invoice date + tax line (Admin → Billing).
- [ ] Confirm Supabase renew day-of-month on the card.
- [ ] Domain calendar reminder: **Aug 2027**.
- [ ] After ads: re-check Resend usage + Vercel Hobby limits.

---

*Source of truth for product money movement (jobs/fees) stays in Admin → Income and Stripe Dashboard — this page is SaaS/ops only.*
