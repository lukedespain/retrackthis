"use client";

import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripeClient";

export function JobCheckoutEmbed({
  clientSecret,
  amountLabel,
  onDiscard,
}: {
  clientSecret: string;
  amountLabel?: string;
  onDiscard?: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Pay to post this gig</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {amountLabel
            ? `Secure checkout for ${amountLabel}. Card, Apple Pay, Link, and other methods Stripe enables.`
            : "Secure checkout — card, Apple Pay, Link, and other methods Stripe enables."}{" "}
          The musician is paid when you pick a winner. Cancel anytime before that for a refund.
        </p>
      </div>
      <div className="min-h-[420px] px-2 py-3 sm:px-4">
        <EmbeddedCheckoutProvider stripe={getStripe()} options={{ clientSecret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
      {onDiscard ? (
        <div className="border-t border-gray-100 px-5 py-3 dark:border-gray-800">
          <button
            type="button"
            onClick={onDiscard}
            className="text-sm font-medium text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline dark:text-gray-400 dark:hover:text-gray-200"
          >
            Cancel and discard this draft
          </button>
        </div>
      ) : null}
    </div>
  );
}
