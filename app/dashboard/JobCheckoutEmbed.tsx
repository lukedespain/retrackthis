"use client";

import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripeClient";

export function JobCheckoutEmbed({
  clientSecret,
  amountLabel,
  onSaveForLater,
  onDiscard,
  onPostAsTest,
  postingTest = false,
}: {
  clientSecret: string;
  amountLabel?: string;
  onSaveForLater?: () => void;
  onDiscard?: () => void;
  onPostAsTest?: () => void;
  postingTest?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-4">
        <h3 className="text-base font-semibold text-gray-900">Pay to post this gig</h3>
        <p className="mt-1 text-sm text-gray-500">
          {amountLabel
            ? `Secure checkout for ${amountLabel}. Card, Apple Pay, Link, and other methods Stripe enables.`
            : "Secure checkout - card, Apple Pay, Link, and other methods Stripe enables."}{" "}
          The musician is paid when you make the pick.
        </p>
      </div>
      <div className="min-h-[420px] px-2 py-3 sm:px-4">
        <EmbeddedCheckoutProvider stripe={getStripe()} options={{ clientSecret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
      {(onSaveForLater || onDiscard || onPostAsTest) && (
        <div className="flex flex-col gap-2 border-t border-gray-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          {onPostAsTest ? (
            <button
              type="button"
              onClick={onPostAsTest}
              disabled={postingTest}
              className="text-left text-sm font-medium text-accent underline-offset-2 hover:underline disabled:opacity-50"
            >
              {postingTest ? "Posting test…" : "Post as a test job instead"}
            </button>
          ) : null}
          {onSaveForLater ? (
            <button
              type="button"
              onClick={onSaveForLater}
              className="text-left text-sm font-medium text-accent underline-offset-2 hover:underline"
            >
              Save as draft - finish payment later
            </button>
          ) : (
            <span />
          )}
          {onDiscard ? (
            <button
              type="button"
              onClick={onDiscard}
              className="text-left text-sm font-medium text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline sm:text-right"
            >
              Discard draft
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
