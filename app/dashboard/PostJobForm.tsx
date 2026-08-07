"use client";

import { useState } from "react";
import { AudioUpload } from "@/components/AudioUpload";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

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
    <Card padding="md">
      <h3 className="text-base font-semibold text-gray-900">Post a new job</h3>
      <p className="mt-1 text-sm text-gray-500">
        Your payment will be held in escrow until you pick a winner.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            label="Title"
            name="title"
            placeholder="Upright bass for a jazz waltz"
            required
            className="sm:col-span-2"
          />
          <Input label="Instrument" name="instrument" placeholder="Upright Bass" required />
          <Input
            label="Price (USD)"
            name="price"
            type="number"
            min="1"
            step="1"
            placeholder="75"
            required
          />
          <Textarea
            label="Description"
            name="description"
            required
            rows={3}
            placeholder="What's the part? Tempo, feel, any references?"
            className="sm:col-span-2"
          />
          <div className="sm:col-span-2">
            <AudioUpload label="Demo file" kind="demo" onUploaded={setDemoFileUrl} />
          </div>
          <Input
            label="Deadline"
            name="deadlineDays"
            type="number"
            min="1"
            defaultValue="7"
            required
            hint="Days from today"
          />
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:gap-3">
          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? "Posting…" : "Post job"}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} className="w-full sm:w-auto">
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
