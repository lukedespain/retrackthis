import { loadStripe, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

export function hasStripePublishableKey() {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  return Boolean(key && key.startsWith("pk_"));
}

export function getStripe() {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  if (!key || !key.startsWith("pk_")) {
    console.error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing or invalid");
    return Promise.resolve(null);
  }
  if (!stripePromise) {
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}
