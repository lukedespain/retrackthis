import { AUDIO_FILE_ACCEPT, AUDIO_UPLOAD_HINT, MAX_AUDIO_UPLOAD_BYTES, MAX_AUDIO_UPLOAD_MB } from "@/lib/constants";
import { supabaseClient } from "@/lib/supabaseClient";
import { Alert } from "@/components/ui/Alert";
import { useRef, useState } from "react";

type Status = "idle" | "uploading" | "processing" | "done" | "error";

export type UploadKind = "demo" | "demo-backing" | "take" | "take-midi";

export type UploadedAudio = {
  publicUrl: string;
  previewUrl: string | null;
  path: string;
  /** Seconds of sounding audio when measurable (Part uploads; skips silence). */
  durationSeconds?: number | null;
};

function fileMatchesAccept(file: File, accept: string) {
  if (!accept || accept === "*") return true;
  const tokens = accept.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (tokens.length === 0) return true;

  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();

  return tokens.some((token) => {
    if (token.startsWith(".")) return name.endsWith(token);
    if (token.endsWith("/*")) {
      const prefix = token.slice(0, -1);
      return type.startsWith(prefix);
    }
    return type === token;
  });
}

function wantsPreview(kind: UploadKind) {
  return kind === "take" || kind === "demo" || kind === "demo-backing";
}

/** Max file size we will decode to estimate non-silent "playing" time. */
const ACTIVE_DURATION_ANALYZE_MAX_BYTES = 40 * 1024 * 1024;

/**
 * Estimate how long audio is actually sounding (skips silence gaps in full-length stems).
 * Returns null when decode is too heavy or analysis fails — callers should not guess full file length.
 */
async function readActiveAudioDurationSeconds(file: File): Promise<number | null> {
  if (!file.type.startsWith("audio/") && !/\.(wav|mp3|m4a|aac|flac|ogg)$/i.test(file.name)) {
    return null;
  }
  if (file.size > ACTIVE_DURATION_ANALYZE_MAX_BYTES) return null;

  let ctx: AudioContext | null = null;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    ctx = new AudioCtx();
    const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
    await ctx.close();
    ctx = null;

    const channel = buffer.getChannelData(0);
    const { sampleRate, duration } = buffer;
    if (!Number.isFinite(duration) || duration <= 0) return null;

    const windowSize = Math.max(1, Math.floor(sampleRate * 0.02)); // 20ms
    const threshold = 0.012;
    let activeWindows = 0;

    for (let i = 0; i < channel.length; i += windowSize) {
      let peak = 0;
      const end = Math.min(channel.length, i + windowSize);
      for (let j = i; j < end; j++) {
        const a = Math.abs(channel[j]);
        if (a > peak) peak = a;
      }
      if (peak >= threshold) activeWindows += 1;
    }

    const activeSeconds = (activeWindows * windowSize) / sampleRate;
    if (!Number.isFinite(activeSeconds) || activeSeconds < 5) return null;

    // If almost everything is "active", full length is fine.
    // If much quieter overall, prefer the active estimate (what the musician actually plays).
    const rounded = Math.round(activeSeconds);
    return Math.min(Math.round(duration), rounded);
  } catch {
    try {
      await ctx?.close();
    } catch {
      // ignore
    }
    return null;
  }
}

export function FileUpload({
  label,
  kind,
  onUploaded,
  accept = AUDIO_FILE_ACCEPT,
  hint = AUDIO_UPLOAD_HINT,
  compact = false,
}: {
  label: string;
  kind: UploadKind;
  onUploaded: (publicUrl: string, meta?: UploadedAudio) => void;
  accept?: string;
  hint?: string;
  compact?: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    if (!fileMatchesAccept(file, accept)) {
      setStatus("error");
      setFileName(file.name);
      setError("That file type isn’t supported here. Pick a matching file and try again.");
      return;
    }

    if (file.size > MAX_AUDIO_UPLOAD_BYTES) {
      setStatus("error");
      setFileName(file.name);
      setError(`That file is too large (max ${MAX_AUDIO_UPLOAD_MB}MB). Try a smaller file.`);
      return;
    }

    setStatus("uploading");
    setError(null);
    setFileName(file.name);

    try {
      // Part uploads: estimate sounding time (not full stem length with silence).
      // Other kinds leave duration unset here.
      const measuredDuration =
        kind === "demo" ? await readActiveAudioDurationSeconds(file) : null;

      const signRes = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, kind }),
      });
      if (!signRes.ok) throw new Error("Couldn't prepare upload");
      const { path, token, publicUrl } = await signRes.json();

      const { error: uploadError } = await supabaseClient.storage
        .from("audio-files")
        .uploadToSignedUrl(path, token, file);
      if (uploadError) {
        const msg = uploadError.message || "Upload failed";
        if (/maximum allowed size|too large|payload/i.test(msg)) {
          throw new Error(
            `That file is too large for upload (max ${MAX_AUDIO_UPLOAD_MB}MB). Try a shorter export or compress to MP3.`
          );
        }
        throw uploadError;
      }

      let previewUrl: string | null = null;
      if (wantsPreview(kind)) {
        setStatus("processing");
        try {
          const previewRes = await fetch("/api/uploads/preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path, publicUrl, fileName: file.name }),
          });
          const previewBody = await previewRes.json().catch(() => null);
          if (previewRes.ok && typeof previewBody?.previewUrl === "string") {
            previewUrl = previewBody.previewUrl;
          }
        } catch {
          // Preview is best-effort; listening can fall back for the uploader.
        }
      }

      setStatus("done");
      onUploaded(publicUrl, {
        publicUrl,
        previewUrl,
        path,
        durationSeconds: measuredDuration,
      });
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    void uploadFile(file);
    e.target.value = "";
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current += 1;
    if (e.dataTransfer.types.includes("Files")) setDragging(true);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) {
      e.dataTransfer.dropEffect = "copy";
      setDragging(true);
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    void uploadFile(file);
  }

  const statusMessages = {
    idle: "Drop a file here or click to choose",
    uploading: "Uploading…",
    processing: "Making a preview…",
    done: fileName ? `Uploaded: ${fileName}` : "Uploaded",
    error: "Upload failed. Drop or click to retry",
  };

  const busy = status === "uploading" || status === "processing";

  return (
    <div>
      {!compact && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <div className={compact ? undefined : "mt-1.5"}>
        <div
          role="button"
          tabIndex={0}
          aria-label={label}
          aria-disabled={busy}
          onClick={() => {
            if (!busy) inputRef.current?.click();
          }}
          onKeyDown={(e) => {
            if (busy) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 text-center transition-all duration-150 ease-out active:scale-[0.995] ${
            compact ? "py-4" : "py-7 sm:py-8"
          } ${
            dragging
              ? "border-accent bg-accent-muted/60 text-accent ring-2 ring-accent/20"
              : status === "done"
                ? "border-emerald-200 bg-emerald-50/50 text-emerald-700"
                : status === "error"
                  ? "border-red-200 bg-red-50/50 text-red-600 hover:border-red-300"
                  : busy
                    ? "border-accent/30 bg-accent-muted/50 text-accent"
                    : "border-gray-200 text-gray-500 hover:border-accent/40 hover:bg-accent-muted/30 hover:text-accent"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleFileChange}
            disabled={busy}
          />
          {busy && (
            <div className="mb-2 h-4 w-4 animate-spin rounded-full border-2 border-accent/20 border-t-accent" />
          )}
          {status === "done" && !dragging && (
            <svg className="mb-2 h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          {(status === "idle" || dragging) && (
            <svg className="mb-2 h-5 w-5 text-current opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          )}
          {status === "error" && !dragging && (
            <svg className="mb-2 h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          )}
          <span className="text-sm font-medium">
            {dragging
              ? "Drop to upload"
              : compact && status !== "done" && !busy
                ? label
                : statusMessages[status]}
          </span>
        </div>
        {error ? (
          <Alert variant="error" className="mt-2 py-2 text-xs">
            {error}
          </Alert>
        ) : (
          hint && <p className="mt-2 text-xs text-gray-400">{hint}</p>
        )}
      </div>
    </div>
  );
}

/** @deprecated Use FileUpload */
export function AudioUpload(props: {
  label: string;
  kind: "demo" | "demo-backing" | "take";
  onUploaded: (publicUrl: string) => void;
}) {
  return <FileUpload {...props} />;
}
