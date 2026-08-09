"use client";

import { useState } from "react";
import { AudioUpload } from "@/components/AudioUpload";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";

export function SubmitTakeForm({ jobId }: { jobId: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [audioFileUrl, setAudioFileUrl] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const [attestHuman, setAttestHuman] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSubmitted(false);

    if (!attestHuman) {
      setError("Confirm this take is a real human performance before submitting.");
      setSubmitting(false);
      return;
    }

    const formEl = e.currentTarget;
    const form = new FormData(formEl);

    try {
      const res = await fetch(`/api/jobs/${jobId}/takes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioFileUrl: audioFileUrl ?? "https://example-demo-files.test/placeholder-take.mp3",
          note: form.get("note"),
          attestHuman: true,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }

      setSubmitted(true);
      formEl.reset();
      setAudioFileUrl(null);
      setAttestHuman(false);
      setUploadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card padding="md">
      <h3 className="text-base font-semibold text-gray-900">Submit your take</h3>
      <p className="mt-1 text-sm text-gray-500">Free to submit. Upload your best recording of the part.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <AudioUpload key={uploadKey} label="Your recording" kind="take" onUploaded={setAudioFileUrl} />
        <Textarea
          label="Note"
          name="note"
          rows={2}
          placeholder="Anything the creator should know about your take?"
          hint="Optional"
        />

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white px-3.5 py-3 transition-colors hover:border-gray-300 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/20">
          <input
            type="checkbox"
            checked={attestHuman}
            onChange={(e) => setAttestHuman(e.target.checked)}
            required
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-accent focus:ring-accent/30"
          />
          <span className="text-sm leading-relaxed text-gray-700">
            I confirm this take is a real, live human performance — not AI-generated, AI-assisted, or
            produced by a generative music tool in any way.
          </span>
        </label>

        {error && <Alert variant="error">{error}</Alert>}
        {submitted && <Alert variant="success">Take submitted successfully.</Alert>}

        <Button type="submit" disabled={submitting || !attestHuman} className="w-full sm:w-auto">
          {submitting ? "Submitting…" : "Submit take"}
        </Button>
      </form>
    </Card>
  );
}
