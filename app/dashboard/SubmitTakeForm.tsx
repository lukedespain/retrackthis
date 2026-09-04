"use client";

import { useEffect, useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { TakeSubmissionFiles } from "@/components/TakeSubmissionFiles";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { AUDIO_FILE_ACCEPT, AUDIO_UPLOAD_HINT } from "@/lib/constants";
import { MAX_AUDIO_TAKES, MAX_MIDI_FILES, type TakeFileRecord } from "@/lib/takeFiles";

type SubmitMode = "audio" | "midi" | "both";

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
    midiLabel: `MIDI ${index + 1}`,
    midiFileUrl: null,
  };
}

const MODE_OPTIONS: Array<{ value: SubmitMode; label: string; hint: string }> = [
  { value: "audio", label: "Audio", hint: "Recorded performance" },
  { value: "midi", label: "MIDI", hint: "MIDI file only" },
  { value: "both", label: "Both", hint: "Audio + MIDI" },
];

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
  const [mode, setMode] = useState<SubmitMode | null>(null);
  const [rows, setRows] = useState<TakeRow[]>([emptyRow(0)]);
  const [attestHuman, setAttestHuman] = useState(false);
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    if (alreadySubmitted) {
      setSubmitted(true);
      if (existingTakeUrl) setSubmittedUrl(existingTakeUrl);
      if (existingFiles?.length) setSubmittedFiles(existingFiles);
    }
  }, [alreadySubmitted, existingTakeUrl, existingFiles]);

  const maxRows = mode === "midi" ? MAX_MIDI_FILES : MAX_AUDIO_TAKES;

  const readyAudioRows = rows
    .map((row, index) => ({ ...row, index }))
    .filter((row) => row.audioFileUrl && row.audioLabel.trim());

  const readyMidiRows = rows
    .map((row, index) => ({ ...row, index }))
    .filter((row) => row.midiFileUrl && row.midiLabel.trim());

  const canSubmit =
    Boolean(mode) &&
    attestHuman &&
    (mode === "audio"
      ? readyAudioRows.length > 0
      : mode === "midi"
        ? readyMidiRows.length > 0
        : readyAudioRows.length > 0 && readyAudioRows.every((row) => row.midiFileUrl));

  function updateRow(index: number, patch: Partial<TakeRow>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((current) => (current.length < maxRows ? [...current, emptyRow(current.length)] : current));
  }

  function chooseMode(next: SubmitMode) {
    setMode(next);
    setRows([emptyRow(0)]);
    setError(null);
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

    if (!mode) {
      setError("Choose whether you’re submitting audio, MIDI, or both.");
      setSubmitting(false);
      return;
    }

    if (mode === "audio" || mode === "both") {
      if (readyAudioRows.length === 0) {
        setError("Upload at least one audio take before submitting.");
        setSubmitting(false);
        return;
      }
    }

    if (mode === "midi" && readyMidiRows.length === 0) {
      setError("Upload at least one MIDI file before submitting.");
      setSubmitting(false);
      return;
    }

    if (mode === "both") {
      const missingMidi = readyAudioRows.some((row) => !row.midiFileUrl);
      if (missingMidi) {
        setError("Add a MIDI file for each audio take, or switch to Audio only.");
        setSubmitting(false);
        return;
      }
    }

    const formEl = e.currentTarget;
    const form = new FormData(formEl);

    const audioTakes =
      mode === "midi"
        ? []
        : readyAudioRows.map(({ audioLabel, audioFileUrl }) => ({
            label: audioLabel.trim(),
            fileUrl: audioFileUrl as string,
          }));

    const midiFiles =
      mode === "audio"
        ? []
        : mode === "midi"
          ? readyMidiRows.map(({ midiLabel, midiFileUrl }) => ({
              label: midiLabel.trim(),
              fileUrl: midiFileUrl as string,
              audioIndex: null as number | null,
            }))
          : readyAudioRows.map(({ midiLabel, midiFileUrl, index }) => ({
              label: midiLabel.trim(),
              fileUrl: midiFileUrl as string,
              audioIndex: index,
            }));

    try {
      const res = await fetch(`/api/jobs/${jobId}/takes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioTakes,
          midiFiles,
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
        Free to submit. First choose what you&apos;re uploading — then add up to three options.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <p className="text-sm font-medium text-gray-900">What are you uploading?</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {MODE_OPTIONS.map((option) => {
              const selected = mode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => chooseMode(option.value)}
                  className={`rounded-2xl border px-4 py-3 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
                    selected
                      ? "border-accent bg-accent-muted shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-950"
                  }`}
                >
                  <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500">{option.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        {mode && (
          <div className="space-y-4">
            {rows.map((row, index) => (
              <div
                key={index}
                className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950"
              >
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Take {index + 1}
                </p>

                {(mode === "audio" || mode === "both") && (
                  <div className="space-y-3">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Track name
                      <input
                        type="text"
                        value={row.audioLabel}
                        onChange={(e) => updateRow(index, { audioLabel: e.target.value })}
                        placeholder={`Take ${index + 1}`}
                        className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      />
                    </label>
                    <FileUpload
                      label={row.audioFileUrl ? "Replace audio" : "Upload audio"}
                      kind="take"
                      accept={AUDIO_FILE_ACCEPT}
                      compact
                      hint={index === 0 ? AUDIO_UPLOAD_HINT : undefined}
                      onUploaded={(url) => updateRow(index, { audioFileUrl: url })}
                    />
                  </div>
                )}

                {(mode === "midi" || mode === "both") && (
                  <div className="space-y-3">
                    {mode === "both" && (
                      <p className="text-xs font-medium text-gray-500">Paired MIDI for this take</p>
                    )}
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                      MIDI name
                      <input
                        type="text"
                        value={row.midiLabel}
                        onChange={(e) => updateRow(index, { midiLabel: e.target.value })}
                        placeholder={`MIDI ${index + 1}`}
                        className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      />
                    </label>
                    <FileUpload
                      label={row.midiFileUrl ? "Replace MIDI" : "Upload MIDI"}
                      kind="take-midi"
                      accept=".mid,.midi,audio/midi"
                      compact
                      hint={index === 0 ? ".mid or .midi files only." : undefined}
                      onUploaded={(url) => updateRow(index, { midiFileUrl: url })}
                    />
                  </div>
                )}
              </div>
            ))}

            {rows.length < maxRows && (
              <Button type="button" variant="secondary" size="sm" onClick={addRow} className="w-full sm:w-auto">
                Add another take
              </Button>
            )}
          </div>
        )}

        {mode && (
          <>
            <Textarea
              label="Note"
              name="note"
              rows={2}
              placeholder="Anything the creator should know about your take?"
              hint="Optional"
            />

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white px-3.5 py-3 transition-colors hover:border-gray-300 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/20 dark:border-gray-800 dark:bg-gray-950">
              <input
                type="checkbox"
                checked={attestHuman}
                onChange={(e) => setAttestHuman(e.target.checked)}
                required
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-accent focus:ring-accent/30"
              />
              <span className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                I confirm this take is a real, live human performance, not AI-generated, AI-assisted,
                or produced by a generative music tool in any way.
              </span>
            </label>

            {error && <Alert variant="error">{error}</Alert>}

            <Button type="submit" disabled={submitting || !canSubmit} className="w-full sm:w-auto">
              {submitting ? "Submitting…" : "Submit take"}
            </Button>
          </>
        )}
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
