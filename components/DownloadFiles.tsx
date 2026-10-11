"use client";

import { useEffect, useId, useState } from "react";

export type DownloadItem = {
  id: string;
  name: string;
  detail: string;
  url?: string;
  filename?: string;
  lyrics?: boolean;
};

export function DownloadFiles({
  title,
  jobId,
  items,
}: {
  title: string;
  jobId: string;
  items: DownloadItem[];
}) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [phase, setPhase] = useState<"pack" | "download" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const next: Record<string, boolean> = {};
    for (const item of items) next[item.id] = true;
    setChecked(next);
    setError(null);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, items.map((item) => item.id).join("|")]);

  if (items.length === 0) return null;

  const selected = items.filter((item) => checked[item.id]);
  const allOn = selected.length === items.length;

  async function download() {
    if (selected.length === 0 || busy) return;
    setBusy(true);
    setPhase("pack");
    setProgress(null);
    setError(null);
    try {
      const only = selected.length === 1 ? selected[0] : null;
      if (only?.url && !only.lyrics) {
        const link = document.createElement("a");
        link.href = only.url;
        link.download = only.filename || only.name;
        link.rel = "noopener";
        link.target = "_blank";
        link.click();
        setOpen(false);
        return;
      }
      const res = await fetch("/api/downloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          title,
          items: selected.map((item) => ({
            url: item.url,
            filename: item.filename || item.name,
            lyrics: Boolean(item.lyrics),
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Could not download those files.");
      }
      const total = Number(res.headers.get("content-length")) || 0;
      const reader = res.body?.getReader();
      if (!reader) throw new Error("Could not download those files.");
      setPhase("download");
      const chunks: Uint8Array[] = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        chunks.push(value);
        received += value.length;
        setProgress(total > 0 ? Math.min(1, received / total) : null);
      }
      const blob = new Blob(chunks as BlobPart[]);
      const header = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(header);
      const filename = match?.[1] || (selected.some((item) => item.lyrics) && selected.length === 1 ? "lyrics.pdf" : "files.zip");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download those files.");
    } finally {
      setBusy(false);
      setPhase(null);
      setProgress(null);
    }
  }

  return (
    <>
      <button type="button" className="dl-open" onClick={() => setOpen(true)}>
        Download files
      </button>
      {open ? (
        <div className="dl-pop" role="presentation" onMouseDown={() => setOpen(false)}>
          <div
            className="dl-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 id={titleId}>Download files</h3>
            <p>Everything here is selected. Turn one off if you don’t need it.</p>
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={checked[item.id] !== false}
                      onChange={(e) => setChecked((prev) => ({ ...prev, [item.id]: e.target.checked }))}
                    />
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.detail}</small>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            {busy ? (
              <div className="dl-wait">
                <div className={`dl-bar${progress == null ? " indeterminate" : ""}`}>
                  <i style={progress == null ? undefined : { width: `${Math.round(progress * 100)}%` }} />
                </div>
                <span>
                  {phase === "download" && progress != null
                    ? `Downloading ${Math.round(progress * 100)}%`
                    : "Packing the files…"}
                </span>
              </div>
            ) : null}
            {error ? <p className="dl-err">{error}</p> : null}
            <div className="dl-actions">
              <button type="button" className="btn text" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn primary" disabled={selected.length === 0 || busy} onClick={() => void download()}>
                {busy ? "Preparing…" : allOn ? "Download all" : "Download selection"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
