"use client";

import { useEffect, useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { TakeSubmissionFiles } from "@/components/TakeSubmissionFiles";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { AUDIO_UPLOAD_HINT } from "@/lib/constants";
import { MAX_AUDIO_TAKES, type TakeFileRecord } from "@/lib/takeFiles";

type TakeRow = {
  audioLabel: string;
  audioFileUrl: string | null;
  midiLabel: string;
  midiFileUrl: string | null;
};

function emptyRow(index: number): TakeRow {
  return {
    audioLabel: `Take ${index + 1}`,
    audioFileUrl: null,
    midiLabel: `MIDI for Take ${index + 1}`,
    midiFileUrl: null,
  };
}

function PairArrow() {
  return (
    <>
      <div
        className="hidden shrink-0 items-center justify-center self-center px-1 text-gray-300 md:flex"
        aria-hidden
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </div>
      <div
        className="flex shrink-0 items-center justify-center self-center py-1 text-gray-300 md:hidden"
        aria-hidden
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0l-5-5m5 5l5-5" />
        </svg>
      </div>
    </>
  );
}

export function SubmitTakeForm({
  jobId,
  alreadySubmitted = false,
  existingTakeUrl,
  existingFiles,
  onSubmitted,
}: {
  jobId: string;
  alreadySubmitted?: boolean;
  existingTakeUrl?: string | null;
  existingFiles?: TakeFileRecord[];
  onSubmitted?: (take: { jobId: string; audioFileUrl: string; files?: TakeFileRecord[] }) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(alreadySubmitted);
  const [submittedUrl, setSubmittedUrl] = useState<string | null>(existingTakeUrl ?? null);
  const [submittedFiles, setSubmittedFiles] = useState<TakeFileRecord[] | undefined>(existingFiles);
  const [rows, setRows] = useState<TakeRow[]>([emptyRow(0)]);
  const [sharedMidi, setSharedMidi] = useState(true);
  const [sharedMidiLabel, setSharedMidiLabel] = useState("All takes");
  const [sharedMidiUrl, setSharedMidiUrl] = useState<string | null>(null);
  const [attestHuman, setAttestHuman] = useState(false);
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    if (alreadySubmitted) {
      setSubmitted(true);
      if (existingTakeUrl) setSubmittedUrl(existingTakeUrl);
      if (existingFiles?.length) setSubmittedFiles(existingFiles);
    }
  }, [alreadySubmitted, existingTakeUrl, existingFiles]);

  const readyAudioRows = rows
    .map((row, index) => ({ ...row, index }))
    .filter((row) => row.audioFileUrl && row.audioLabel.trim());

  const canSubmit = attestHuman && readyAudioRows.length > 0;

  function updateRow(index: number, patch: Partial<TakeRow>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((current) => (current.length < MAX_AUDIO_TAKES ? [...current, emptyRow(current.length)] : current));
  }

  function toggleSharedMidi(next: boolean) {
    if (next) {
      const firstMidi = rows.find((row) => row.midiFileUrl);
      setSharedMidiUrl(firstMidi?.midiFileUrl ?? sharedMidiUrl);
      if (firstMidi?.midiLabel) setSharedMidiLabel(firstMidi.midiLabel.replace(/ for Take \d+$/i, "") || "All takes");
      setRows((current) => current.map((row) => ({ ...row, midiFileUrl: null })));
    } else if (sharedMidiUrl) {
      setRows((current) =>
        current.map((row, index) =>
          index === 0 ? { ...row, midiFileUrl: sharedMidiUrl, midiLabel: sharedMidiLabel } : row
        )
      );
      setSharedMidiUrl(null);
    }
    setSharedMidi(next);
  }

  function buildMidiPayload() {
    if (sharedMidi) {
      if (!sharedMidiUrl || !sharedMidiLabel.trim()) return [];
      return [{ label: sharedMidiLabel.trim(), fileUrl: sharedMidiUrl, audioIndex: null }];
    }

    return rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.midiFileUrl && row.midiLabel.trim())
      .map(({ row, index }) => ({
        label: row.midiLabel.trim(),
        fileUrl: row.midiFileUrl as string,
        audioIndex: index,
      }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!attestHuman) {
      setError("Confirm this take is a real human performance before submitting.");
      setSubmitting(false);
      return;
    }

    if (readyAudioRows.length === 0) {
      setError("Upload at least one audio take before submitting.");
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
          audioTakes: readyAudioRows.map(({ audioLabel, audioFileUrl }) => ({
            label: audioLabel.trim(),
            fileUrl: audioFileUrl,
          })),
          midiFiles: buildMidiPayload(),
          note: form.get("note"),
          attestHuman: true,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }

      const take = await res.json();
      setSubmitted(true);
      setSubmittedUrl(take.audioFileUrl);
      setSubmittedFiles(take.files);
      setBurst(true);
      onSubmitted?.({ jobId, audioFileUrl: take.audioFileUrl, files: take.files });
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
              You&apos;re in. Status: <span className="font-medium text-gray-800">Pending</span>. The
              creator will review takes and pick a winner.
            </p>
            {(submittedFiles?.length || submittedUrl) && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
                  Your submission
                </p>
                <TakeSubmissionFiles
                  files={submittedFiles}
                  fallbackAudioUrl={submittedUrl ?? undefined}
                  allowDownload
                />
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
      <p className="mt-1 text-sm text-gray-500">
        Free to submit. Add up to three audio options — pair each with its own MIDI, or use one MIDI
        file for all of them.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">MIDI pairing</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Recorded live? Leave MIDI blank. Same part every time? Use one shared file.
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-gray-50 px-3 py-2 text-sm text-gray-700 ring-1 ring-inset ring-gray-200">
              <input
                type="checkbox"
                checked={sharedMidi}
                onChange={(e) => toggleSharedMidi(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent/30"
              />
              Same MIDI track for all takes
            </label>
          </div>

          {sharedMidi && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
              <h4 className="text-sm font-semibold text-emerald-900">Shared MIDI</h4>
              <p className="mt-1 text-xs text-emerald-800/80">
                One file linked to every audio take you upload below.
              </p>
              <label className="mt-3 block text-xs font-medium text-gray-700">
                Track name
                <input
                  type="text"
                  value={sharedMidiLabel}
                  onChange={(e) => setSharedMidiLabel(e.target.value)}
                  placeholder="All takes"
                  className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </label>
              <div className="mt-3">
                <FileUpload
                  label={sharedMidiUrl ? "Replace MIDI" : "Upload shared MIDI"}
                  kind="take-midi"
                  accept=".mid,.midi,audio/midi"
                  compact
                  hint=".mid or .midi files only. Optional."
                  onUploaded={setSharedMidiUrl}
                />
              </div>
            </div>
          )}

          <div className="space-y-4">
            {rows.map((row, index) => (
              <div key={index} className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Option {index + 1}
                </p>
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-stretch">
                  <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4">
                    <h4 className="text-sm font-semibold text-blue-900">Audio take</h4>
                    <label className="mt-3 block text-xs font-medium text-gray-700">
                      Track name
                      <input
                        type="text"
                        value={row.audioLabel}
                        onChange={(e) => updateRow(index, { audioLabel: e.target.value })}
                        placeholder={`Take ${index + 1}`}
                        className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                      />
                    </label>
                    <div className="mt-3">
                      <FileUpload
                        label={row.audioFileUrl ? "Replace audio" : "Upload audio"}
                        kind="take"
                        compact
                        hint={index === 0 ? AUDIO_UPLOAD_HINT : undefined}
                        onUploaded={(url) => updateRow(index, { audioFileUrl: url })}
                      />
                    </div>
                  </div>

                  <PairArrow />

                  {sharedMidi ? (
                    <div className="flex flex-col justify-center rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/30 p-4 text-center md:text-left">
                      <p className="text-sm font-medium text-emerald-900">MIDI optional</p>
                      <p className="mt-1 text-xs text-emerald-800/80">
                        Uses your shared MIDI file{sharedMidiUrl ? "" : " — upload it above"}.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                      <h4 className="text-sm font-semibold text-emerald-900">MIDI optional</h4>
                      <p className="mt-1 text-xs text-emerald-800/80">
                        Only if this take has its own MIDI part.
                      </p>
                      <label className="mt-3 block text-xs font-medium text-gray-700">
                        Track name
                        <input
                          type="text"
                          value={row.midiLabel}
                          onChange={(e) => updateRow(index, { midiLabel: e.target.value })}
                          placeholder={`MIDI for Take ${index + 1}`}
                          className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                        />
                      </label>
                      <div className="mt-3">
                        <FileUpload
                          label={row.midiFileUrl ? "Replace MIDI" : "Upload MIDI"}
                          kind="take-midi"
                          accept=".mid,.midi,audio/midi"
                          compact
                          hint={index === 0 ? ".mid or .midi files only." : undefined}
                          onUploaded={(url) => updateRow(index, { midiFileUrl: url })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {rows.length < MAX_AUDIO_TAKES && (
            <Button type="button" variant="secondary" size="sm" onClick={addRow} className="w-full sm:w-auto">
              Add another take
            </Button>
          )}
        </div>

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
            I confirm this take is a real, live human performance, not AI-generated, AI-assisted, or
            produced by a generative music tool in any way.
          </span>
        </label>

        {error && <Alert variant="error">{error}</Alert>}

        <Button type="submit" disabled={submitting || !canSubmit} className="w-full sm:w-auto">
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
