import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

// Platform takes a cut of each awarded job. Tune this later —
// Gumroad-style marketplaces typically land somewhere around 5-15%.
export const PLATFORM_FEE_PERCENT = 10;

export function calcPlatformFeeCents(amountCents: number) {
  return Math.round(amountCents * (PLATFORM_FEE_PERCENT / 100));
}
