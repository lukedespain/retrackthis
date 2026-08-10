"use client";

import { useEffect, useState } from "react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { AudioUpload } from "@/components/AudioUpload";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";

export function SubmitTakeForm({
  jobId,
  alreadySubmitted = false,
  existingTakeUrl,
  onSubmitted,
}: {
  jobId: string;
  alreadySubmitted?: boolean;
  existingTakeUrl?: string | null;
  onSubmitted?: (take: { jobId: string; audioFileUrl: string }) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(alreadySubmitted);
  const [submittedUrl, setSubmittedUrl] = useState<string | null>(existingTakeUrl ?? null);
  const [audioFileUrl, setAudioFileUrl] = useState<string | null>(null);
  const [attestHuman, setAttestHuman] = useState(false);
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    if (alreadySubmitted) {
      setSubmitted(true);
      if (existingTakeUrl) setSubmittedUrl(existingTakeUrl);
    }
  }, [alreadySubmitted, existingTakeUrl]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!attestHuman) {
      setError("Confirm this take is a real human performance before submitting.");
      setSubmitting(false);
      return;
    }

    if (!audioFileUrl) {
      setError("Upload your recording before submitting.");
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
          audioFileUrl,
          note: form.get("note"),
          attestHuman: true,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }

      setSubmitted(true);
      setSubmittedUrl(audioFileUrl);
      setBurst(true);
      onSubmitted?.({ jobId, audioFileUrl });
      window.setTimeout(() => setBurst(false), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Card padding="md" className="relative overflow-hidden">
        {burst && <SuccessBurst />}
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-gray-900">Take submitted</h3>
            <p className="mt-1 text-sm text-gray-500">
              You&apos;re in. Status: <span className="font-medium text-gray-800">Pending</span> — the
              creator will review takes and pick a winner.
            </p>
            {submittedUrl && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
                  Your take
                </p>
                <AudioPlayer src={submittedUrl} label="Your take" />
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <h3 className="text-base font-semibold text-gray-900">Submit your take</h3>
      <p className="mt-1 text-sm text-gray-500">Free to submit. Upload your best recording of the part.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <AudioUpload label="Your recording" kind="take" onUploaded={setAudioFileUrl} />

        {audioFileUrl && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
              Preview before you submit
            </p>
            <AudioPlayer src={audioFileUrl} label="Preview" />
          </div>
        )}

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

        <Button
          type="submit"
          disabled={submitting || !attestHuman || !audioFileUrl}
          className="w-full sm:w-auto"
        >
          {submitting ? "Submitting…" : "Submit take"}
        </Button>
      </form>
    </Card>
  );
}

function SuccessBurst() {
  const bits = Array.from({ length: 18 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {bits.map((i) => (
        <span
          key={i}
          className="submit-confetti absolute left-1/2 top-6 h-2 w-2 rounded-sm"
          style={{
            backgroundColor: i % 3 === 0 ? "#5B4BFF" : i % 3 === 1 ? "#10B981" : "#F59E0B",
            ["--dx" as string]: `${((i * 47) % 160) - 80}px`,
            ["--dy" as string]: `${40 + ((i * 31) % 70)}px`,
            ["--rot" as string]: `${(i * 40) % 360}deg`,
            animationDelay: `${(i % 6) * 40}ms`,
          }}
        />
      ))}
    </div>
  );
}
