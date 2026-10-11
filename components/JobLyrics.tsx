"use client";

import { useEffect, useState } from "react";
import { hasLyrics, isVocalPart } from "@/lib/lyrics";

export function JobLyrics({
  jobId,
  instrumentId,
  instrument,
  lyrics,
  lyricsEdited = false,
  canEdit = false,
  onChange,
}: {
  jobId: string;
  instrumentId?: string | null;
  instrument?: string | null;
  lyrics?: string | null;
  lyricsEdited?: boolean;
  canEdit?: boolean;
  onChange?: (lyrics: string | null) => void;
}) {
  const vocal = isVocalPart({ instrumentId, instrument });
  const [text, setText] = useState(lyrics ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setText(lyrics ?? "");
  }, [lyrics]);

  useEffect(() => {
    if (!canEdit || !vocal || lyricsEdited || hasLyrics(lyrics)) return;
    let cancel = false;
    setStatus("Listening for the words…");
    void fetch(`/api/jobs/${jobId}/lyrics`, { method: "POST" })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (cancel) return;
        if (!res.ok) {
          setStatus(null);
          return;
        }
        if (typeof body?.lyrics === "string" && body.lyrics.trim()) {
          setText(body.lyrics);
          onChange?.(body.lyrics);
          setStatus(null);
          return;
        }
        setStatus(body?.unavailable ? null : null);
      })
      .catch(() => {
        if (!cancel) setStatus(null);
      });
    return () => {
      cancel = true;
    };
  }, [canEdit, vocal, jobId, lyricsEdited]);

  if (!vocal && !hasLyrics(lyrics)) return null;
  if (!canEdit && !hasLyrics(text)) return null;

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lyrics: text }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not save the lyrics.");
      const next = typeof body?.job?.lyrics === "string" ? body.job.lyrics : text.trim() || null;
      setText(next ?? "");
      onChange?.(next);
      setEditing(false);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not save the lyrics.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="lyrics">
      <div className="lyrics-head">
        <h3>Lyrics</h3>
        {canEdit && !editing ? (
          <button type="button" className="btn text" onClick={() => setEditing(true)}>
            {hasLyrics(text) ? "Edit" : "Add lyrics"}
          </button>
        ) : null}
      </div>
      {editing ? (
        <>
          <textarea className="in ta" value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder="The words to sing" />
          <div className="lyrics-actions">
            <button type="button" className="btn text" onClick={() => { setText(lyrics ?? ""); setEditing(false); }}>
              Cancel
            </button>
            <button type="button" className="btn primary" disabled={saving} onClick={() => void save()}>
              {saving ? "Saving…" : "Save lyrics"}
            </button>
          </div>
        </>
      ) : hasLyrics(text) ? (
        <pre>{text}</pre>
      ) : (
        <p>{status || "Add the words musicians should sing. They show on the job, and they download with the files."}</p>
      )}
      {status && (editing || hasLyrics(text)) ? <p>{status}</p> : null}
    </section>
  );
}
