"use client";

import { useState } from "react";
import { AUDIO_UPLOAD_HINT, MAX_AUDIO_UPLOAD_BYTES, MAX_AUDIO_UPLOAD_MB } from "@/lib/constants";
import { supabaseClient } from "@/lib/supabaseClient";

type Status = "idle" | "uploading" | "done" | "error";

export function AudioUpload({
  label,
  kind,
  onUploaded,
}: {
  label: string;
  kind: "demo" | "take";
  onUploaded: (publicUrl: string) => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_AUDIO_UPLOAD_BYTES) {
      setStatus("error");
      setFileName(file.name);
      setError(`That file is too large — max ${MAX_AUDIO_UPLOAD_MB}MB. Trim it to a shorter excerpt and try again.`);
      e.target.value = "";
      return;
    }

    setStatus("uploading");
    setError(null);
    setFileName(file.name);

    try {
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
      if (uploadError) throw uploadError;

      setStatus("done");
      onUploaded(publicUrl);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  const statusMessages = {
    idle: "Choose an audio file",
    uploading: "Uploading…",
    done: fileName ? `Uploaded: ${fileName}` : "Uploaded",
    error: "Upload failed — click to retry",
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-1.5">
        <label
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center transition-colors ${
            status === "done"
              ? "border-emerald-200 bg-emerald-50/50 text-emerald-700"
              : status === "error"
                ? "border-red-200 bg-red-50/50 text-red-600"
                : status === "uploading"
                  ? "border-accent/30 bg-accent-muted/50 text-accent"
                  : "border-gray-200 text-gray-500 hover:border-accent/40 hover:bg-accent-muted/30 hover:text-accent"
          }`}
        >
          <input type="file" accept="audio/*" className="hidden" onChange={handleFileChange} />
          {status === "uploading" && (
            <div className="mb-2 h-4 w-4 animate-spin rounded-full border-2 border-accent/20 border-t-accent" />
          )}
          {status === "done" && (
            <svg className="mb-2 h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          {status === "idle" && (
            <svg className="mb-2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          )}
          <span className="text-sm font-medium">{statusMessages[status]}</span>
        </label>
        {error ? (
          <p className="mt-2 text-xs text-red-600">{error}</p>
        ) : (
          <p className="mt-2 text-xs text-gray-400">{AUDIO_UPLOAD_HINT}</p>
        )}
      </div>
    </div>
  );
}
