"use client";

import { useState } from "react";
import { AudioUpload } from "@/components/AudioUpload";
import { Button } from "@/components/ui/Button";

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
    <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 p-6">
      <h3 className="text-base font-medium text-gray-900">Submit your take</h3>

      <div className="mt-4 space-y-4">
        <AudioUpload key={uploadKey} label="Your recording" kind="take" onUploaded={setAudioFileUrl} />
        <div>
          <label className="text-sm font-medium text-gray-700">Note (optional)</label>
          <textarea
            name="note"
            rows={2}
            placeholder="Anything the creator should know about your take?"
            className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {submitted && <p className="mt-4 text-sm text-emerald-600">Take submitted.</p>}

      <div className="mt-6">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit take"}
        </Button>
      </div>
    </form>
  );
}
