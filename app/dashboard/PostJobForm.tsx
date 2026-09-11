"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { FileUpload } from "@/components/FileUpload";
import { ReferenceTracksPlayer } from "@/components/ReferenceTracksPlayer";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useTheme } from "@/components/ThemeProvider";
import { AUDIO_FILE_ACCEPT } from "@/lib/constants";
import { displayLabelForInstrumentId, labelForInstrumentId } from "@/lib/instruments";
import { MUSICAL_KEYS } from "@/lib/musicalKeys";
import {
  MAX_DEADLINE_DAYS,
  MAX_DURATION_SECONDS,
  MIN_DURATION_SECONDS,
  MIN_PRICE_CENTS,
  SLIDER_MIN_USD,
} from "@/lib/jobPricing";
import { getStripe, hasStripePublishableKey } from "@/lib/stripeClient";
import { JobPricingFields } from "./JobPricingFields";
import { PostJobInstrumentPicker } from "./MusicianInstrumentsSettings";

function StripeAmountSync({ amount }: { amount: number }) {
  const elements = useElements();
  useEffect(() => {
    if (!elements) return;
    elements.update({ amount });
  }, [amount, elements]);
  return null;
}

export function PostJobForm({ onPosted, onCancel }: { onPosted: () => void; onCancel: () => void }) {
  const [priceDollars, setPriceDollars] = useState(SLIDER_MIN_USD);
  const priceCents = Math.max(
    MIN_PRICE_CENTS,
    Math.round((Number.isFinite(priceDollars) ? priceDollars : 0) * 100)
  );
  const { theme } = useTheme();

  const stripePromise = useMemo(() => getStripe(), []);
  const keyConfigured = hasStripePublishableKey();

  const elementsOptions = useMemo(
    () => ({
      mode: "payment" as const,
      amount: priceCents,
      currency: "usd",
      captureMethod: "manual" as const,
      paymentMethodCreation: "manual" as const,
      paymentMethodTypes: ["card"] as string[],
      appearance: {
        theme: (theme === "dark" ? "night" : "stripe") as "night" | "stripe",
        variables: {
          colorPrimary: "#5B4BFF",
          borderRadius: "12px",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
        },
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- amount synced below; theme remounts via key
    [theme]
  );

  return (
    <Card padding="md">
      <h3 className="text-base font-semibold text-gray-900">Post a new job</h3>
      <p className="mt-1 text-sm text-gray-500">
        Your payment is held until you pick a winner.
      </p>

      {keyConfigured ? (
        <Elements key={theme} stripe={stripePromise} options={elementsOptions}>
          <StripeAmountSync amount={priceCents} />
          <PostJobFormWithStripe
            priceDollars={priceDollars}
            onPriceChange={setPriceDollars}
            onPosted={onPosted}
            onCancel={onCancel}
          />
        </Elements>
      ) : (
        <>
          <Alert variant="warning" className="mt-6">
            Payment form can&apos;t load locally. Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to
            .env.local. You can still preview the job form below.
          </Alert>
          <PostJobFormInner
            priceDollars={priceDollars}
            onPriceChange={setPriceDollars}
            onPosted={onPosted}
            onCancel={onCancel}
            stripeReady={false}
          />
        </>
      )}
    </Card>
  );
}

function PostJobFormWithStripe(
  props: Omit<PostJobFormInnerProps, "stripeReady" | "stripe" | "elements">
) {
  const stripe = useStripe();
  const elements = useElements();
  return (
    <PostJobFormInner {...props} stripeReady stripe={stripe} elements={elements} />
  );
}

type PostJobFormInnerProps = {
  priceDollars: number;
  onPriceChange: (n: number) => void;
  onPosted: () => void;
  onCancel: () => void;
  stripeReady: boolean;
  stripe?: ReturnType<typeof useStripe>;
  elements?: ReturnType<typeof useElements>;
};

function PostJobFormInner({
  priceDollars,
  onPriceChange,
  onPosted,
  onCancel,
  stripeReady,
  stripe = null,
  elements = null,
}: PostJobFormInnerProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elementError, setElementError] = useState<string | null>(null);
  const [demoFileUrl, setDemoFileUrl] = useState<string | null>(null);
  const [backingFileUrl, setBackingFileUrl] = useState<string | null>(null);
  const [fixedTempo, setFixedTempo] = useState(true);
  const [instrumentId, setInstrumentId] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const durationUserSetRef = useRef(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [deadlineText, setDeadlineText] = useState(String(MAX_DEADLINE_DAYS));
  const [availableIds, setAvailableIds] = useState<Set<string>>(new Set());
  const [networkLoaded, setNetworkLoaded] = useState(false);

  const handlePriceChange = useCallback(
    (n: number) => {
      onPriceChange(n);
    },
    [onPriceChange]
  );

  const handleDurationChange = useCallback((seconds: number) => {
    durationUserSetRef.current = true;
    setDurationSeconds(seconds);
  }, []);

  useEffect(() => {
    if (!stripeReady) return;
    let cancelled = false;
    getStripe().then((s) => {
      if (!cancelled && !s) {
        setElementError(
          "Stripe failed to initialize. Check that NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is a valid pk_live_… key and redeploy."
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [stripeReady]);

  useEffect(() => {
    fetch("/api/instruments")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        const ids = new Set<string>((body?.available ?? []).map((item: { id: string }) => item.id));
        setAvailableIds(ids);
      })
      .catch(() => setAvailableIds(new Set()))
      .finally(() => setNetworkLoaded(true));
  }, []);

  const showNetworkGap =
    Boolean(instrumentId) && networkLoaded && !availableIds.has(instrumentId!);

  function collectInviteEmails() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return [];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Enter a valid invite email, or leave it blank.");
    }
    return [email];
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!instrumentId) {
      setError("Pick an instrument for this job.");
      return;
    }

    if (!demoFileUrl) {
      setError("Upload the part being retracked (e.g. vocal demo only).");
      return;
    }

    if (
      durationSeconds == null ||
      durationSeconds < MIN_DURATION_SECONDS ||
      durationSeconds > MAX_DURATION_SECONDS
    ) {
      setError("Set how long the musician will play (part length).");
      return;
    }

    if (!Number.isFinite(priceDollars) || priceDollars < SLIDER_MIN_USD) {
      setError(`Price must be at least $${SLIDER_MIN_USD}.`);
      return;
    }

    const deadlineCheck = Number(deadlineText);
    if (
      !Number.isFinite(deadlineCheck) ||
      deadlineCheck < 1 ||
      deadlineCheck > MAX_DEADLINE_DAYS
    ) {
      setError(`Deadline must be between 1 and ${MAX_DEADLINE_DAYS} days.`);
      return;
    }

    if (stripeReady && (!stripe || !elements)) {
      setError("Payment form is still loading. Try again in a moment.");
      return;
    }

    if (!stripeReady) {
      setError("Add your Stripe publishable key to .env.local before posting a job.");
      return;
    }

    setSubmitting(true);

    try {
      if (!stripe || !elements) {
        throw new Error("Payment form is still loading.");
      }

      const form = new FormData(e.currentTarget);
      const price = Number(form.get("price"));
      const deadlineDays = Math.min(
        MAX_DEADLINE_DAYS,
        Math.max(1, Math.round(Number(deadlineText)))
      );
      const bpmRaw = form.get("bpm");
      const musicalKeyRaw = String(form.get("musicalKey") ?? "").trim();
      const invites = collectInviteEmails();

      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message);
      }

      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        elements,
      });
      if (pmError || !paymentMethod) {
        throw new Error(pmError?.message ?? "Could not collect card details.");
      }

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          instrumentId,
          instrument: labelForInstrumentId(instrumentId),
          description: form.get("description"),
          demoFileUrl,
          backingFileUrl,
          priceCents: Math.round(price * 100),
          durationSeconds,
          musicalKey: musicalKeyRaw || null,
          bpm: fixedTempo ? Number(bpmRaw) : null,
          deadline: new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000).toISOString(),
          paymentMethodId: paymentMethod.id,
          inviteEmails: invites,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }

      onPosted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-8">
      <section className="space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">For musicians</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            What they hear, read, and lock to when recording.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            label="Title"
            name="title"
            placeholder="Upright bass for a jazz waltz"
            required
            className="sm:col-span-2"
          />

          <div className="sm:col-span-2 space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Reference tracks</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Upload the Part to retrack, and ideally the Bed so musicians can play along.
              </p>
            </div>
            <FileUpload
              label="Part"
              kind="demo"
              accept={AUDIO_FILE_ACCEPT}
              hint="Required. The isolated part to replace (demo vocal, scratch guitar, etc.). MP3 or WAV."
              onUploaded={(url, meta) => {
                setDemoFileUrl(url);
                const measured = meta?.durationSeconds;
                if (
                  !durationUserSetRef.current &&
                  typeof measured === "number" &&
                  measured >= MIN_DURATION_SECONDS &&
                  measured <= MAX_DURATION_SECONDS
                ) {
                  setDurationSeconds(Math.round(measured));
                }
              }}
            />
            <FileUpload
              label="Bed"
              kind="demo-backing"
              accept={AUDIO_FILE_ACCEPT}
              hint="Recommended. Background / instrumental without the Part."
              onUploaded={setBackingFileUrl}
            />
            {demoFileUrl && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">Preview</p>
                <p className="text-xs text-gray-500">
                  Same Part / Bed / Both player musicians get on the job.
                </p>
                <ReferenceTracksPlayer
                  partSrc={demoFileUrl}
                  backingSrc={backingFileUrl}
                  bpm={null}
                  allowDownload={false}
                />
              </div>
            )}
          </div>

          <Textarea
            label="Description"
            name="description"
            required
            rows={3}
            placeholder="What's the part? Feel, references, anything helpful?"
            className="sm:col-span-2"
          />

          <div className="sm:col-span-2 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:items-start">
            <div className="space-y-3 rounded-xl border border-gray-100 bg-surface px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">Fixed tempo</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    On = lock to BPM. Off = follow the demo freely.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={fixedTempo}
                  onClick={() => setFixedTempo((v) => !v)}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 ${
                    fixedTempo ? "bg-accent" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-150 ${
                      fixedTempo ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              {fixedTempo && (
                <Input
                  label="Tempo (BPM)"
                  name="bpm"
                  type="number"
                  min="1"
                  max="400"
                  step="1"
                  defaultValue="120"
                  required
                  placeholder="120"
                />
              )}
            </div>

            <div>
              <label
                htmlFor="musicalKey"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Key (optional)
              </label>
              <select
                id="musicalKey"
                name="musicalKey"
                defaultValue=""
                disabled={submitting}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-all duration-150 ease-out hover:border-gray-300 focus:border-accent focus:ring-2 focus:ring-accent/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:border-gray-600"
              >
                <option value="">No key / not sure</option>
                {MUSICAL_KEYS.map((key) => (
                  <option key={key.id} value={key.id}>
                    {key.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Pricing</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Instrument, length, and deadline shape the suggested budget.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <PostJobInstrumentPicker
              selectedId={instrumentId}
              onChange={setInstrumentId}
              disabled={submitting}
            />
          </div>

          {showNetworkGap && instrumentId && (
            <Alert variant="warning" className="sm:col-span-2">
              <p className="font-medium">
                Nobody in the network currently plays{" "}
                {displayLabelForInstrumentId(instrumentId)}.
              </p>
              <p className="mt-1.5">
                You can still post. Escrow holds until you award or cancel. Invite someone below if
                you already know a musician for this part.
              </p>
            </Alert>
          )}

          <JobPricingFields
            instrumentId={instrumentId}
            durationSeconds={durationSeconds}
            onDurationChange={handleDurationChange}
            deadlineText={deadlineText}
            onDeadlineTextChange={setDeadlineText}
            priceDollars={priceDollars}
            onPriceChange={handlePriceChange}
            disabled={submitting}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Payment</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Places money in escrow. Only charges when you pick a winner. Cancel the hold at any time.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-3.5 py-3 min-h-[48px]">
          {!stripeReady ? (
            <p className="text-sm text-gray-500">Payment fields appear when Stripe is configured.</p>
          ) : elementError ? (
            <Alert variant="error">{elementError}</Alert>
          ) : (
            <PaymentElement
              options={{
                layout: "tabs",
                paymentMethodOrder: ["card"],
                wallets: {
                  applePay: "never",
                  googlePay: "never",
                  link: "never",
                },
              }}
              onLoadError={(e) =>
                setElementError(e.error.message ?? "Payment form failed to load.")
              }
            />
          )}
        </div>
      </section>

      <section>
        <Input
          label="Invite someone (optional)"
          name="inviteEmail"
          type="email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder="musician@email.com"
          autoComplete="email"
          disabled={submitting}
          hint="We'll email them a link to submit on this job."
        />
      </section>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:gap-3">
        <Button
          type="submit"
          disabled={submitting || (stripeReady && (!stripe || !elements))}
          className="w-full sm:w-auto"
        >
          {submitting ? "Posting…" : "Post job"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} className="w-full sm:w-auto">
          Cancel
        </Button>
      </div>
    </form>
  );
}
