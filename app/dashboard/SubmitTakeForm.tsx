"use client";

import { useState } from "react";
import { AudioUpload } from "@/components/AudioUpload";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";

export function SubmitTakeForm({ jobId }: { jobId: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [audioFileUrl, setAudioFileUrl] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState(0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formEl = e.currentTarget;
    const form = new FormData(formEl);

    try {
      const res = await fetch(`/api/jobs/${jobId}/takes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioFileUrl: audioFileUrl ?? "https://example-demo-files.test/placeholder-take.mp3",
          note: form.get("note"),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }

      setSubmitted(true);
      formEl.reset();
      setAudioFileUrl(null);
      setUploadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <h3 className="text-base font-semibold text-gray-900">Submit your take</h3>
      <p className="mt-1 text-sm text-gray-500">Free to submit — upload your best recording of the part.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <AudioUpload key={uploadKey} label="Your recording" kind="take" onUploaded={setAudioFileUrl} />
        <Textarea
          label="Note"
          name="note"
          rows={2}
          placeholder="Anything the creator should know about your take?"
          hint="Optional"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}
        {submitted && (
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Take submitted successfully.
          </div>
        )}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit take"}
        </Button>
      </form>
    </Card>
  );
}
