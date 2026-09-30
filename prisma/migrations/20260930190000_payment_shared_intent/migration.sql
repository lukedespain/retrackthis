-- Several parts in one project share a single Stripe PaymentIntent.
DROP INDEX IF EXISTS "Payment_stripePaymentIntentId_key";
CREATE INDEX IF NOT EXISTS "Payment_stripePaymentIntentId_idx" ON "Payment"("stripePaymentIntentId");
