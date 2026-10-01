"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { TAKE_FILE_ACCEPT } from "@/lib/constants";
import { scanAudioFile } from "@/lib/audioScan";
import { formatCents } from "@/lib/format";
import { formatPartDuration } from "@/lib/jobPricing";
import { supabaseClient } from "@/lib/supabaseClient";
import { MAX_AUDIO_TAKES, type TakeFileRecord } from "@/lib/takeFiles";
import { Avatar } from "@/components/brand/Avatar";
import { WaveformMixPlayer } from "@/components/WaveformMixPlayer";
import { audioFiles, listenUrl, masterUrl } from "@/lib/takeFiles";

type TakeRow = {
  fileName: string;
  audioFileUrl: string;
  audioPreviewUrl: string | null;
  durationSeconds: number | null;
};

export function SubmitTakeForm({
  jobId,
  priceCents,
  payoutReady = true,
  alreadySubmitted = false,
  existingTakeUrl,
  existingNote,
  existingFiles,
  backingSrc = null,
  submitter = null,
  summaryOnly = false,
  onSubmitted,
}: {
  jobId: string;
  priceCents?: number;
  /** False shows the payout gate instead of the submit button. */
  payoutReady?: boolean;
  alreadySubmitted?: boolean;
  existingTakeUrl?: string | null;
  existingNote?: string | null;
  existingFiles?: TakeFileRecord[];
  /** Job bed, so a submitted take can be heard against it. */
  backingSrc?: string | null;
  submitter?: { name: string; avatar: unknown } | null;
  /** Find work: a short receipt, with the full player on My submissions. */
  summaryOnly?: boolean;
  onSubmitted?: (take: { jobId: string; audioFileUrl: string; note?: string | null; files?: TakeFileRecord[] }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(alreadySubmitted);
  const [submittedUrl, setSubmittedUrl] = useState<string | null>(existingTakeUrl ?? null);
  const [submittedFiles, setSubmittedFiles] = useState<TakeFileRecord[] | undefined>(existingFiles);
  const [submittedNote, setSubmittedNote] = useState(existingNote ?? "");
  const [replacing, setReplacing] = useState(false);
  const [takeIndex, setTakeIndex] = useState(0);
  const [rows, setRows] = useState<TakeRow[]>([]);
  const [note, setNote] = useState(existingNote ?? "");

  const isReplace = replacing;
  const fileCount = rows.length;

  function growNote(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  async function uploadTakeFile(file: File): Promise<TakeRow> {
    const scan = await scanAudioFile(file);
    const signRes = await fetch("/api/uploads/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name, kind: "take" }),
    });
    if (!signRes.ok) throw new Error("Couldn't prepare upload");
    const { path, token, publicUrl } = await signRes.json();
    const { error: uploadError } = await supabaseClient.storage
      .from("audio-files")
      .uploadToSignedUrl(path, token, file);
    if (uploadError) throw new Error(uploadError.message || "Upload failed");

    let previewUrl: string | null = null;
    try {
      const previewRes = await fetch("/api/uploads/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, publicUrl, fileName: file.name }),
      });
      const previewBody = await previewRes.json().catch(() => null);
      if (previewRes.ok && typeof previewBody?.previewUrl === "string") previewUrl = previewBody.previewUrl;
    } catch {
      // Preview is optional. The master still uploaded.
    }

    return {
      fileName: file.name,
      audioFileUrl: publicUrl,
      audioPreviewUrl: previewUrl,
      durationSeconds: scan?.fileDurationSeconds ?? null,
    };
  }

  async function onPickFile(file: File | undefined) {
    if (!file || rows.length >= MAX_AUDIO_TAKES) return;
    setUploading(true);
    setError(null);
    try {
      const row = await uploadTakeFile(file);
      setRows((current) => (current.length < MAX_AUDIO_TAKES ? [...current, row] : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!payoutReady || rows.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/takes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioTakes: rows.map((row) => ({
            label: row.fileName,
            fileUrl: row.audioFileUrl,
            previewUrl: row.audioPreviewUrl,
          })),
          note,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      const take = await res.json();
      setReplacing(false);
      setSubmitted(true);
      setSubmittedUrl(take.audioFileUrl);
      setSubmittedFiles(take.files);
      setSubmittedNote(typeof take.note === "string" ? take.note : note);
      setRows([]);
      onSubmitted?.({
        jobId,
        audioFileUrl: take.audioFileUrl,
        note: typeof take.note === "string" ? take.note : note,
        files: take.files,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted && !replacing && summaryOnly) {
    const audio = submittedFiles?.length
      ? audioFiles(submittedFiles)
      : submittedUrl
        ? [{ id: "legacy", kind: "AUDIO" as const, label: "Take 1", fileUrl: submittedUrl, previewUrl: null, sortOrder: 0 }]
        : [];
    const n = audio.length;
    return (
      <div className="stack" style={{ gap: 14 }}>
        <div className="sub-head">
          <h3>Your submission</h3>
          {typeof priceCents === "number" ? (
            <span className="sub-pay">{formatCents(priceCents)} if picked</span>
          ) : null}
        </div>
        {n > 0 ? (
          <div className="att-list">
            {audio.map((file) => (
              <div className="att" key={file.id}>
                <span className="att-ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12.5l5 5L19 7" />
                  </svg>
                </span>
                <span className="att-n" title={file.label}>{file.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <p>{n === 1 ? "1 take attached" : `${n} takes attached`}</p>
        )}
        <Link href={`/submissions?job=${jobId}`} className="btn soft" style={{ height: 38, fontSize: 13.5, width: "100%" }}>
          View or edit my submission
        </Link>
      </div>
    );
  }

  if (submitted && !replacing) {
    const audio = submittedFiles?.length
      ? audioFiles(submittedFiles)
      : submittedUrl
        ? [{ id: "legacy", kind: "AUDIO" as const, label: "Take 1", fileUrl: submittedUrl, previewUrl: null, sortOrder: 0 }]
        : [];
    const index = Math.min(takeIndex, Math.max(0, audio.length - 1));
    const current = audio[index];
    const playSrc = current ? listenUrl(current) : null;
    const downloadSrc = current ? masterUrl(current) : null;
    return (
      <div className="stack" style={{ gap: 14 }}>
        {submitter ? (
          <div className="by">
            <Avatar avatar={submitter.avatar} name={submitter.name} size="sm" />
            Submitted by <b>{submitter.name}</b>
          </div>
        ) : (
          <h3>Your submission</h3>
        )}
        {submittedNote.trim() ? <p className="jnotes" style={{ color: "var(--ink-2)" }}>{submittedNote}</p> : null}
        {current && playSrc ? (
          <WaveformMixPlayer
            key={current.id}
            className="flat"
            partSrc={playSrc}
            partDownloadSrc={downloadSrc}
            backingSrc={backingSrc}
            partTabLabel="Part"
            partCaption="Your submitted take"
            initialMode={backingSrc ? "both" : "part"}
            allowDownload
            heading={
              <div style={{ flex: 1, minWidth: 0 }}>
                {audio.length > 1 ? (
                  <div className="seg" role="tablist" aria-label="Your takes">
                    {audio.map((file, i) => (
                      <button
                        key={file.id}
                        type="button"
                        aria-pressed={i === index}
                        onClick={() => setTakeIndex(i)}
                      >
                        Take {i + 1}
                      </button>
                    ))}
                  </div>
                ) : null}
                <p className="truncate" title={current.label} style={{ margin: audio.length > 1 ? "6px 0 0" : 0, fontSize: 13, fontWeight: 500 }}>
                  {current.label}
                </p>
              </div>
            }
          />
        ) : null}
        <button type="button" className="btn soft" style={{ height: 38, fontSize: 13.5 }} onClick={() => setReplacing(true)}>
          Replace takes
        </button>
      </div>
    );
  }

  const addLabel = fileCount ? "Add a second take" : "Add your takes";
  const addHint = fileCount ? `Optional · ${fileCount} of ${MAX_AUDIO_TAKES} added` : "WAV or MP3, up to 2";
  const cta = fileCount
    ? `Submit ${fileCount} take${fileCount === 1 ? "" : "s"}`
    : "Add a take to submit";

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <div className="sub-head">
        <h3>{isReplace ? "Replace your takes" : "Submit your take"}</h3>
        {typeof priceCents === "number" ? (
          <span className="sub-pay">{formatCents(priceCents)} if picked</span>
        ) : null}
      </div>

      {rows.length > 0 ? (
        <div className="att-list">
          {rows.map((row, index) => (
            <div className="att" key={`${row.audioFileUrl}-${index}`}>
              <span className="att-ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12.5l5 5L19 7" />
                </svg>
              </span>
              <span className="att-n">{row.fileName}</span>
              {row.durationSeconds ? <span className="att-s">{formatPartDuration(row.durationSeconds)}</span> : null}
              <button
                type="button"
                className="icon"
                aria-label={`Remove ${row.fileName}`}
                onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {fileCount < MAX_AUDIO_TAKES ? (
        <button
          type="button"
          className="drop-row"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <span className="tile-ico">
            {uploading ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 16V4M7 8l5-5 5 5M5 20h14" />
              </svg>
            )}
          </span>
          <span className="drop-t">
            <strong>{uploading ? "Uploading…" : addLabel}</strong>
            <span>{addHint}</span>
          </span>
          <span className="drop-go">Browse</span>
        </button>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept={TAKE_FILE_ACCEPT}
        hidden
        onChange={(e) => void onPickFile(e.target.files?.[0])}
      />

      <div className="note-box">
        <textarea
          ref={noteRef}
          className="in ta note"
          name="note"
          rows={4}
          maxLength={600}
          value={note}
          placeholder="Notes for the producer: how you approached it, gear, alternate ideas…"
          onChange={(e) => {
            setNote(e.target.value);
            growNote(e.target);
          }}
        />
        <span className="note-count">{note.length}/600</span>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {payoutReady ? (
        <button
          type="submit"
          className={`btn primary${submitting || uploading ? " busy" : ""}`}
          disabled={submitting || uploading || fileCount === 0}
          aria-busy={submitting || uploading}
        >
          {submitting || uploading ? (
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
          ) : null}
          {uploading ? "Uploading…" : submitting ? "Submitting…" : cta}
        </button>
      ) : (
        <div className="pay-gate">
          <span className="pg-t">
            <strong>Set up payouts to submit</strong>
            <span>So we can pay you if you&apos;re picked. About 2 minutes.</span>
          </span>
          <a className="btn primary" href="/settings#payouts">
            Set up
          </a>
        </div>
      )}
    </form>
  );
}
