"use client";

import { useState } from "react";
import { AudioUpload } from "@/components/AudioUpload";
import { Button } from "@/components/ui/Button";

export function PostJobForm({ onPosted, onCancel }: { onPosted: () => void; onCancel: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoFileUrl, setDemoFileUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const priceDollars = Number(form.get("price"));
    const deadlineDays = Number(form.get("deadlineDays"));

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          instrument: form.get("instrument"),
          description: form.get("description"),
          demoFileUrl: demoFileUrl ?? "https://example-demo-files.test/placeholder-demo.mp3",
          priceCents: Math.round(priceDollars * 100),
          deadline: new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000).toISOString(),
          // Stripe's published test-mode PaymentMethod token — stands in for
          // a real card collected via Stripe Elements (real card collection
          // comes with real Connect onboarding, still deferred).
          paymentMethodId: "pm_card_visa",
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
    <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 p-6">
      <h3 className="text-base font-medium text-gray-900">Post a new job</h3>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <Field label="Title" name="title" placeholder="Upright bass for a jazz waltz" required className="col-span-2" />
        <Field label="Instrument" name="instrument" placeholder="Upright Bass" required />
        <Field label="Price (USD)" name="price" type="number" min="1" step="1" placeholder="75" required />
        <div className="col-span-2">
          <label className="text-sm font-medium text-gray-700">Description</label>
          <textarea
            name="description"
            required
            rows={3}
            placeholder="What's the part? Tempo, feel, any references?"
            className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div className="col-span-2">
          <AudioUpload label="Demo file" kind="demo" onUploaded={setDemoFileUrl} />
        </div>
        <Field label="Deadline (days from now)" name="deadlineDays" type="number" min="1" defaultValue="7" required />
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Posting…" : "Post job"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  className = "",
  ...props
}: { label: string; name: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        name={name}
        className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent"
        {...props}
      />
    </div>
  );
}
