import type Stripe from "stripe";
import { isAltPayoutProvider } from "@/lib/connectCountries";
import { db } from "@/lib/db";
import { calcPlatformFeeCents, stripe } from "@/lib/stripe";

/**
 * Read-only money breakdown for the admin Income tab.
 * Stripe balance transactions are the source of truth for gross, card fees,
 * refunds, Connect transfers, and Stripe's own fees. The DB only fills in what
 * Stripe can't see: PayPal/Wise payouts sent outside Stripe, and money still
 * held for open jobs (not ours yet).
 */
export type FinanceBreakdown = {
  mode: "live" | "test";
  since: string | null;
  grossCents: number;
  refundsCents: number;
  processingFeesCents: number;
  musicianPayouts: {
    totalCents: number;
    stripeTransfersCents: number;
    manualPaidCents: number;
    manualPendingCents: number;
    manualPendingCount: number;
  };
  connectFeesCents: number;
  otherStripeCents: number;
  heldForOpenJobsCents: number;
  netRevenueCents: number;
  /** What 10% of picked jobs "should" be, for comparison with the real net. */
  expectedPlatformFeeCents: number;
  withdrawnToBankCents: number;
  transactionCount: number;
};

const CHARGE_TYPES = new Set(["charge", "payment"]);
const REFUND_TYPES = new Set(["refund", "payment_refund", "payment_failure_refund"]);
const TRANSFER_TYPES = new Set([
  "transfer",
  "transfer_cancel",
  "transfer_failure",
  "transfer_refund",
]);
const BANK_PAYOUT_TYPES = new Set(["payout", "payout_cancel", "payout_failure"]);

function isConnectFee(txn: Stripe.BalanceTransaction) {
  return /connect|account|payout/i.test(txn.description ?? "");
}

export async function loadFinanceBreakdown(since: Date | null): Promise<FinanceBreakdown> {
  const [txns, allTransfers] = await Promise.all([
    stripe.balanceTransactions
      .list({
        limit: 100,
        ...(since ? { created: { gte: Math.floor(since.getTime() / 1000) } } : {}),
      })
      .autoPagingToArray({ limit: 10_000 }),
    // All-time, so a job charged in this window but transferred later still matches.
    stripe.transfers.list({ limit: 100 }).autoPagingToArray({ limit: 10_000 }),
  ]);
  // Transfers are grouped by job id when we pay a musician through Connect.
  const stripeTransferGroups = new Set(
    allTransfers.map((t) => t.transfer_group).filter((g): g is string => Boolean(g))
  );

  let grossCents = 0;
  let refundsCents = 0;
  let processingFeesCents = 0;
  let stripeTransfersCents = 0;
  let connectFeesCents = 0;
  let otherStripeCents = 0;
  let withdrawnToBankCents = 0;

  for (const txn of txns) {
    if (CHARGE_TYPES.has(txn.type)) {
      grossCents += txn.amount;
      processingFeesCents += txn.fee;
    } else if (REFUND_TYPES.has(txn.type)) {
      // Refund amounts are negative; a refund can also carry (or return) a fee.
      refundsCents += -txn.amount;
      processingFeesCents += txn.fee;
    } else if (TRANSFER_TYPES.has(txn.type)) {
      // Outgoing transfers are negative; reversals/failures come back positive.
      stripeTransfersCents += -txn.amount;
      connectFeesCents += txn.fee;
    } else if (txn.type === "stripe_fee") {
      if (isConnectFee(txn)) connectFeesCents += -txn.net;
      else otherStripeCents += -txn.net;
    } else if (BANK_PAYOUT_TYPES.has(txn.type)) {
      // Moving our balance to our own bank isn't a cost.
      withdrawnToBankCents += -txn.amount;
      otherStripeCents += txn.fee;
    } else {
      // Disputes, adjustments, application fees, etc. Positive net = money in.
      otherStripeCents += -txn.net;
    }
  }

  const createdFilter = since ? { createdAt: { gte: since } } : {};
  const payments = await db.payment.findMany({
    where: {
      job: { isTest: false },
      status: { in: ["captured", "transferred", "pending_manual_payout"] },
      ...createdFilter,
    },
    select: {
      jobId: true,
      amountCents: true,
      platformFeeCents: true,
      status: true,
      job: {
        select: {
          status: true,
          takes: {
            where: { isWinner: true },
            take: 1,
            select: { musician: { select: { payoutProvider: true } } },
          },
        },
      },
    },
  });

  let manualPaidCents = 0;
  let manualPendingCents = 0;
  let manualPendingCount = 0;
  let heldForOpenJobsCents = 0;
  let expectedPlatformFeeCents = 0;

  for (const p of payments) {
    const fee = p.platformFeeCents || calcPlatformFeeCents(p.amountCents);
    const musicianShare = p.amountCents - fee;
    const jobStatus = p.job.status;

    if (p.status === "captured" && (jobStatus === "OPEN" || jobStatus === "AWARDING")) {
      heldForOpenJobsCents += p.amountCents;
      continue;
    }

    const picked = jobStatus === "AWARDED";
    if (!picked) continue;
    expectedPlatformFeeCents += fee;

    if (p.status === "pending_manual_payout" || p.status === "captured") {
      // Owed to the musician but not sent yet (PayPal/Wise, or a Stripe transfer still pending).
      manualPendingCents += musicianShare;
      manualPendingCount += 1;
    } else if (
      p.status === "transferred" &&
      isAltPayoutProvider(p.job.takes[0]?.musician.payoutProvider) &&
      !stripeTransferGroups.has(p.jobId)
    ) {
      // PayPal/Wise winner marked paid: sent outside Stripe, so Stripe never saw it.
      // Stripe winners are already counted from transfer balance transactions,
      // including ones sent by hand from the Dashboard without our transfer_group.
      manualPaidCents += musicianShare;
    }
  }

  const musicianPayoutsCents = stripeTransfersCents + manualPaidCents + manualPendingCents;
  const netRevenueCents =
    grossCents -
    refundsCents -
    processingFeesCents -
    musicianPayoutsCents -
    connectFeesCents -
    otherStripeCents -
    heldForOpenJobsCents;

  return {
    mode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live") ? "live" : "test",
    since: since?.toISOString() ?? null,
    grossCents,
    refundsCents,
    processingFeesCents,
    musicianPayouts: {
      totalCents: musicianPayoutsCents,
      stripeTransfersCents,
      manualPaidCents,
      manualPendingCents,
      manualPendingCount,
    },
    connectFeesCents,
    otherStripeCents,
    heldForOpenJobsCents,
    netRevenueCents,
    expectedPlatformFeeCents,
    withdrawnToBankCents,
    transactionCount: txns.length,
  };
}
