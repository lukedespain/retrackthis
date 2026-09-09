"use client";

import { useState } from "react";
import { TakeMixPlayer } from "@/components/TakeMixPlayer";
import { WaveformPlayer } from "@/components/WaveformPlayer";
import {
  audioFiles,
  midiFiles,
  pairedTakeRows,
  sharedMidiFile,
  type TakeFileRecord,
} from "@/lib/takeFiles";

function guessFilename(src: string, fallback: string) {
  try {
    const segment = new URL(src).pathname.split("/").pop();
    if (segment && segment.includes(".")) return decodeURIComponent(segment);
  } catch {
    // ignore invalid URLs
  }
  return fallback;
}

function FileDownloadLink({
  href,
  label,
  filename,
}: {
  href: string;
  label: string;
  filename?: string;
}) {
  const downloadName = filename ?? guessFilename(href, `${label.toLowerCase().replace(/\s+/g, "-")}.mid`);

  return (
    <a
      href={href}
      download={downloadName}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-white px-3.5 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-200 transition-all duration-150 ease-out hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 active:scale-[0.98]"
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5m0 0l4.5-4.5M12 16.5V3"
        />
      </svg>
      Download {label}
    </a>
  );
}

function PairArrow() {
  return (
    <>
      <div className="hidden shrink-0 items-center justify-center self-center px-1 text-gray-300 md:flex" aria-hidden>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </div>
      <div className="flex shrink-0 items-center justify-center self-center py-0.5 text-gray-300 md:hidden" aria-hidden>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0l-5-5m5 5l5-5" />
        </svg>
      </div>
    </>
  );
}

function MidiSlot({
  label,
  fileUrl,
  allowDownload,
  shared = false,
  placeholder,
}: {
  label?: string;
  fileUrl?: string | null;
  allowDownload: boolean;
  shared?: boolean;
  placeholder?: string;
}) {
  if (!fileUrl) {
    return (
      <div className="flex min-h-[4.5rem] flex-col justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-3 py-3">
        <p className="text-xs font-medium text-gray-500">No MIDI for this take</p>
        {placeholder ? <p className="mt-0.5 text-xs text-gray-400">{placeholder}</p> : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 px-3 py-3">
      <p className="text-xs font-medium uppercase tracking-wider text-emerald-900">
        {shared ? "Shared MIDI" : "MIDI"}
        {label ? ` · ${label}` : ""}
      </p>
      {allowDownload ? (
        <div className="mt-2">
          <FileDownloadLink
            href={fileUrl}
            label={label ?? "MIDI"}
            filename={guessFilename(fileUrl, `${label ?? "midi"}.mid`)}
          />
        </div>
      ) : (
        <p className="mt-1.5 text-xs text-emerald-800/80">Included. Download after you choose this musician.</p>
      )}
    </div>
  );
}

/**
 * Submission audio with optional Take / Bed / Both waveform mix + manual nudge.
 */
export function TakeSubmissionFiles({
  files,
  fallbackAudioUrl,
  allowDownload = false,
  collapsible = false,
  defaultExpanded = false,
  bpm = null,
  backingSrc = null,
}: {
  files?: TakeFileRecord[];
  fallbackAudioUrl?: string;
  allowDownload?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  /** Job BPM so metronome / click works on takes the same as the reference. */
  bpm?: number | null;
  /** Job bed track — enables Take / Bed / Both waveform player. */
  backingSrc?: string | null;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const audio = files?.length ? audioFiles(files) : [];
  const allMidi = files?.length ? midiFiles(files) : [];
  const shared = files?.length ? sharedMidiFile(files) : null;
  const hasPairing = allMidi.some((f) => f.audioIndex != null) || shared != null;
  const hasBed = Boolean(backingSrc);

  const audioItems =
    audio.length > 0
      ? audio
      : fallbackAudioUrl && !allMidi.some((m) => m.fileUrl === fallbackAudioUrl)
        ? [{ id: "legacy", kind: "AUDIO" as const, label: "Take 1", fileUrl: fallbackAudioUrl, sortOrder: 0 }]
        : [];

  if (audioItems.length === 0) {
    if (allMidi.length === 0) return null;
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 px-3 py-3">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-900">MIDI takes</p>
          {allowDownload ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {allMidi.map((file) => (
                <FileDownloadLink
                  key={file.id}
                  href={file.fileUrl}
                  label={file.label}
                  filename={guessFilename(file.fileUrl, `${file.label}.mid`)}
                />
              ))}
            </div>
          ) : (
            <p className="mt-1.5 text-xs text-emerald-800/80">
              MIDI included. Download after you choose this musician.
            </p>
          )}
        </div>
      </div>
    );
  }

  const rows = files?.length ? pairedTakeRows(files) : audioItems.map((a) => ({ audio: a, midi: null }));

  const summaryParts: string[] = [];
  summaryParts.push(audioItems.length === 1 ? "1 take" : `${audioItems.length} takes`);
  if (allMidi.length > 0) {
    summaryParts.push(shared ? "shared MIDI" : `${allMidi.length} MIDI`);
  }

  const body = (
    <div className="space-y-3">
      {rows.map(({ audio: audioFile, midi }, index) => (
        <div key={audioFile.id} className="rounded-xl border border-gray-200 bg-white p-3">
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-start">
            <div className={hasBed ? "md:col-span-3" : undefined}>
              <p className="mb-1.5 text-xs font-medium text-blue-900">{audioFile.label}</p>
              {hasBed && backingSrc ? (
                <TakeMixPlayer takeSrc={audioFile.fileUrl} bedSrc={backingSrc} bpm={bpm} />
              ) : (
                <WaveformPlayer
                  src={audioFile.fileUrl}
                  label={audioFile.label}
                  filename={guessFilename(audioFile.fileUrl, `${audioFile.label}.mp3`)}
                  allowDownload={allowDownload}
                  bpm={bpm}
                  compact
                />
              )}
            </div>

            {!hasBed && (hasPairing || allMidi.length > 0) && <PairArrow />}

            {!hasBed &&
              (hasPairing ? (
                shared ? (
                  index === 0 ? (
                    <MidiSlot
                      label={shared.label}
                      fileUrl={shared.fileUrl}
                      allowDownload={allowDownload}
                      shared
                      placeholder="Applies to all takes."
                    />
                  ) : (
                    <div className="flex min-h-[4.5rem] flex-col justify-center rounded-xl border border-dashed border-emerald-200 bg-emerald-50/20 px-3 py-3">
                      <p className="text-xs font-medium text-emerald-900">Same shared MIDI</p>
                      <p className="mt-0.5 text-xs text-emerald-800/80">Linked to {shared.label}.</p>
                    </div>
                  )
                ) : (
                  <MidiSlot label={midi?.label} fileUrl={midi?.fileUrl} allowDownload={allowDownload} />
                )
              ) : allMidi.length > 0 ? (
                index === 0 ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 px-3 py-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-emerald-900">MIDI</p>
                    {allowDownload ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {allMidi.map((file) => (
                          <FileDownloadLink
                            key={file.id}
                            href={file.fileUrl}
                            label={file.label}
                            filename={guessFilename(file.fileUrl, `${file.label}.mid`)}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1.5 text-xs text-emerald-800/80">
                        MIDI included. Download after you choose this musician.
                      </p>
                    )}
                  </div>
                ) : null
              ) : null)}
          </div>
          {hasBed && allMidi.length > 0 && index === 0 && (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/40 px-3 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-900">MIDI</p>
              {allowDownload ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {allMidi.map((file) => (
                    <FileDownloadLink
                      key={file.id}
                      href={file.fileUrl}
                      label={file.label}
                      filename={guessFilename(file.fileUrl, `${file.label}.mid`)}
                    />
                  ))}
                </div>
              ) : (
                <p className="mt-1.5 text-xs text-emerald-800/80">
                  MIDI included. Download after you choose this musician.
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  if (!collapsible || audioItems.length <= 1) {
    return body;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-left text-sm text-gray-700 transition-colors hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2"
      >
        <span className="font-medium">{summaryParts.join(" · ")}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && <div className="mt-3">{body}</div>}
    </div>
  );
}
