"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";

type Mine = {
  id: string;
  title: string;
  status: "PENDING" | "APPROVED" | "DENIED";
  adminNote: string | null;
  createdAt: string;
};

function statusLabel(status: Mine["status"]) {
  if (status === "APPROVED") return "Accepted";
  if (status === "DENIED") return "Not now";
  return "In review";
}

export function FeatureRequestSettings() {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [mine, setMine] = useState<Mine[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    fetch("/api/suggestions/mine")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (Array.isArray(body?.features)) setMine(body.features);
      })
      .catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    setSent(false);
    try {
      const res = await fetch("/api/suggestions/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, details }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not send that");
      setMine((prev) => [body.request, ...prev]);
      setTitle("");
      setDetails("");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 14 }}>
      <form className="stack" style={{ gap: 10 }} onSubmit={(e) => void submit(e)}>
        <input
          className="in"
          value={title}
          maxLength={80}
          placeholder="Short title"
          required
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="in ta"
          value={details}
          maxLength={2000}
          rows={4}
          placeholder="What should we add or change?"
          required
          onChange={(e) => setDetails(e.target.value)}
        />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="btn primary" type="submit" disabled={sending} style={{ height: 38, fontSize: 13.5 }}>
            {sending ? "Sending…" : "Send request"}
          </button>
        </div>
      </form>
      {sent ? <p className="text-sm text-gray-600">Sent. We’ll review it from the admin dashboard.</p> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}
      {mine.length > 0 ? (
        <div className="stack" style={{ gap: 8 }}>
          {mine.map((item) => (
            <div key={item.id} className="rounded-2xl bg-[var(--soft)] px-3.5 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <strong className="text-sm font-medium">{item.title}</strong>
                <span className="text-xs text-gray-500">{statusLabel(item.status)}</span>
              </div>
              {item.adminNote ? <p className="mt-1 text-sm text-gray-600">{item.adminNote}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
