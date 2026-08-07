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

  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-1.5">
        <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500 hover:border-accent hover:text-accent">
          <input type="file" accept="audio/*" className="hidden" onChange={handleFileChange} />
          {status === "uploading" && "Uploading…"}
          {status === "idle" && "Choose an audio file"}
          {status === "done" && `Uploaded: ${fileName}`}
          {status === "error" && "Upload failed — click to retry"}
        </label>
        {error ? (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        ) : (
          <p className="mt-1 text-xs text-gray-400">{AUDIO_UPLOAD_HINT}</p>
        )}
      </div>
    </div>
  );
}
