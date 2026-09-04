"use client";

import { FormEvent, useState } from "react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { FileUpload } from "@/components/FileUpload";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { AUDIO_FILE_ACCEPT } from "@/lib/constants";
import type { Job } from "@/lib/types";

export function EditJobForm({
  job,
  onCancel,
  onSaved,
  adminAs,
}: {
  job: Job;
  onCancel: () => void;
  onSaved: () => void;
  /** When set, form is shown as admin editing on behalf of this creator. */
  adminAs?: { name: string; email: string; priceLabel?: string };
}) {
  const [title, setTitle] = useState(job.title);
  const [description, setDescription] = useState(job.description);
  const [demoFileUrl, setDemoFileUrl] = useState(job.demoFileUrl);
  const [backingFileUrl, setBackingFileUrl] = useState<string | null>(job.backingFileUrl ?? null);
  const [fixedTempo, setFixedTempo] = useState(job.bpm != null);
  const [bpm, setBpm] = useState(job.bpm != null ? String(job.bpm) : "120");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState(0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title can’t be empty.");
      return;
    }
    if (!description.trim()) {
      setError("Description can’t be empty.");
      return;
    }
    if (!demoFileUrl) {
      setError("Keep or re-upload the part being retracked.");
      return;
    }

    let nextBpm: number | null = null;
    if (fixedTempo) {
      const parsed = Number(bpm);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 400) {
        setError("Enter a BPM between 1 and 400, or turn off fixed tempo.");
        return;
      }
      nextBpm = Math.round(parsed);
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          demoFileUrl,
          backingFileUrl,
          bpm: nextBpm,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-accent/20 bg-accent-muted/30 p-4 sm:p-5"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
          {adminAs ? "Admin edit" : "Edit job"}
        </p>
        <h3 className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
          Update references &amp; tempo
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {adminAs
            ? `Editing for ${adminAs.name} (${adminAs.email}). Price and payment stay locked`
            : "Your escrow and price stay the same"}
          {adminAs?.priceLabel ? ` at ${adminAs.priceLabel}` : ""}. Changes show up for musicians
          right away.
        </p>
      </div>

      {adminAs && (
        <Alert variant="warning">
          <p className="font-medium">Price &amp; payment locked</p>
          <p className="mt-1">
            You can change title, description, reference tracks, and tempo only. You cannot change
            the escrow amount or card on file.
          </p>
        </Alert>
      )}

      {!backingFileUrl && (
        <Alert variant="warning">
          <p className="font-medium">Missing background track</p>
          <p className="mt-1">
            Add the instrumental bed (without the part being retracked) so musicians can hear the
            full context. Your guitar scratch stays as the part to retrack.
          </p>
        </Alert>
      )}

      {job.bpm == null && !fixedTempo && (
        <Alert variant="warning">
          <p className="font-medium">Tempo is currently flexible</p>
          <p className="mt-1">
            Turn on <span className="font-medium">Fixed tempo</span> below and enter a BPM if
            musicians should lock to a grid.
          </p>
        </Alert>
      )}

      <Input
        label="Title"
        name="edit-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        disabled={saving}
      />
      <Textarea
        label="Description"
        name="edit-description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        required
        disabled={saving}
      />

      <div className="space-y-3 rounded-xl border border-gray-100 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Fixed tempo</p>
            <p className="mt-0.5 text-xs text-gray-500">
              On = musicians match a BPM. Off = follow the demo freely.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={fixedTempo}
            disabled={saving}
            onClick={() => setFixedTempo((v) => !v)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 ${
              fixedTempo ? "bg-accent" : "bg-gray-200 dark:bg-gray-700"
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
            name="edit-bpm"
            type="number"
            min="1"
            max="400"
            step="1"
            value={bpm}
            onChange={(e) => setBpm(e.target.value)}
            required
            disabled={saving}
            placeholder="120"
          />
        )}
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">Reference tracks</p>
          <p className="mt-0.5 text-xs text-gray-500">
            Keep your existing scratch, or replace it. Add a background bed anytime.
          </p>
        </div>

        <div className="space-y-3 rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                1 · Part being retracked
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                Currently saved — musicians hear this as the part to replace.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              Kept
            </span>
          </div>
          <AudioPlayer src={demoFileUrl} label="Part to retrack" allowDownload bpm={fixedTempo ? Number(bpm) || null : null} />
          <FileUpload
            key={`demo-${uploadKey}`}
            label="Replace this track"
            kind="demo"
            accept={AUDIO_FILE_ACCEPT}
            compact
            hint="Optional. Leave as-is to keep the current scratch."
            onUploaded={(url) => {
              setDemoFileUrl(url);
              setUploadKey((k) => k + 1);
            }}
          />
        </div>

        <div
          className={`space-y-3 rounded-xl border p-4 dark:bg-gray-950 ${
            backingFileUrl
              ? "border-gray-100 bg-white dark:border-gray-800"
              : "border-amber-200 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                2 · Background / instrumental
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                The bed without the part being retracked (e.g. instrumental without the guitar).
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                backingFileUrl
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
              }`}
            >
              {backingFileUrl ? "Added" : "Needed"}
            </span>
          </div>
          {backingFileUrl ? (
            <>
              <AudioPlayer src={backingFileUrl} label="Background" allowDownload bpm={fixedTempo ? Number(bpm) || null : null} />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={saving}
                  onClick={() => {
                    setBackingFileUrl(null);
                    setUploadKey((k) => k + 1);
                  }}
                >
                  Remove background
                </Button>
              </div>
              <FileUpload
                key={`backing-replace-${uploadKey}`}
                label="Replace background"
                kind="demo-backing"
                accept={AUDIO_FILE_ACCEPT}
                compact
                hint="Optional. Upload a new bed to replace this one."
                onUploaded={(url) => {
                  setBackingFileUrl(url);
                  setUploadKey((k) => k + 1);
                }}
              />
            </>
          ) : (
            <FileUpload
              key={`backing-add-${uploadKey}`}
              label="Upload background track"
              kind="demo-backing"
              accept={AUDIO_FILE_ACCEPT}
              hint="MP3 or WAV. Full songs are fine."
              onUploaded={(url) => {
                setBackingFileUrl(url);
                setUploadKey((k) => k + 1);
              }}
            />
          )}
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        <Button type="submit" disabled={saving} className="w-full sm:w-auto">
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={saving}
          onClick={onCancel}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
