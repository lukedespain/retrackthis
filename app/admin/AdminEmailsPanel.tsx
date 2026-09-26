"use client";

import { useCallback, useEffect, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";

type BlastKind = "TEST" | "BLAST";
type Filter = "all" | "TEST" | "BLAST";

type BlastRow = {
  id: string;
  kind: BlastKind;
  subject: string;
  sentCount: number;
  failedCount: number;
  recipientCount: number;
  recipientEmails: string[];
  sentByName: string | null;
  createdAt: string;
  ctaLabel: string | null;
  bottomImageUrl: string | null;
};

type BlastDetail = BlastRow & {
  bodyPlain: string;
  bodyHtml: string;
  ctaHref: string | null;
  failures: Array<{ email: string; error: string }>;
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AdminEmailsPanel() {
  const [filter, setFilter] = useState<Filter>("all");
  const [blasts, setBlasts] = useState<BlastRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<BlastDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [subject, setSubject] = useState("");
  const [bodyPlain, setBodyPlain] = useState("");
  const [includeHeroGif, setIncludeHeroGif] = useState(true);
  const [busy, setBusy] = useState<"test" | "blast" | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setError(null);
    const q = filter === "all" ? "" : `?kind=${filter}`;
    const res = await fetch(`/api/admin/emails${q}`);
    if (!res.ok) throw new Error("Could not load emails");
    const body = await res.json();
    setBlasts(body.blasts);
  }, [filter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadList();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Load failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    fetch(`/api/admin/emails/${selectedId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load email");
        const body = await res.json();
        if (!cancelled) setDetail(body.blast);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Load failed");
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function send(mode: "test" | "blast") {
    if (mode === "blast") {
      const ok = window.confirm(
        "Send this email to EVERY member?\n\nThis cannot be undone. Prefer Send test first."
      );
      if (!ok) return;
    }

    setBusy(mode);
    setStatusMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          subject,
          bodyPlain,
          includeHeroGif,
          ctaLabel: "Open Retrack This",
          ctaHref: "https://retrackthis.com",
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        sent?: number;
        failed?: number;
        total?: number;
        id?: string;
      };
      if (!res.ok) throw new Error(body.error || `Send failed (${res.status})`);
      setStatusMsg(
        `${mode === "test" ? "Test" : "Blast"}: ${body.sent ?? 0} sent` +
          (body.failed ? `, ${body.failed} failed` : "") +
          ` of ${body.total ?? "?"}`
      );
      await loadList();
      if (body.id) setSelectedId(body.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950 sm:p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Compose</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          We add <span className="font-medium text-gray-700 dark:text-gray-300">Hi {"{first name}"},</span>{" "}
          automatically. Blank line = new paragraph. Test goes to Luke + Hazel only.
        </p>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Subject</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="We heard you, here's what's new!"
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none ring-accent/30 placeholder:text-gray-400 focus:ring-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Body</span>
            <textarea
              value={bodyPlain}
              onChange={(e) => setBodyPlain(e.target.value)}
              rows={12}
              placeholder={"Thanks for being early with us…\n\nWHAT’S NEW?\nProducers now pay upfront…"}
              className="mt-1.5 w-full resize-y rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-gray-900 outline-none ring-accent/30 placeholder:text-gray-400 focus:ring-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={includeHeroGif}
              onChange={(e) => setIncludeHeroGif(e.target.checked)}
              className="rounded border-gray-300 text-accent focus:ring-accent/30"
            />
            Include hero GIF at the bottom
          </label>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            disabled={Boolean(busy) || !subject.trim() || !bodyPlain.trim()}
            onClick={() => void send("test")}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
          >
            {busy === "test" ? "Sending test…" : "Send test → Luke + Hazel"}
          </button>
          <button
            type="button"
            disabled={Boolean(busy) || !subject.trim() || !bodyPlain.trim()}
            onClick={() => void send("blast")}
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {busy === "blast" ? "Sending blast…" : "Send to all members"}
          </button>
        </div>
        {statusMsg && (
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{statusMsg}</p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">History</h2>
          <div className="inline-flex rounded-full bg-gray-100 p-0.5 dark:bg-gray-800">
            {(
              [
                ["all", "All"],
                ["BLAST", "Blasts"],
                ["TEST", "Tests"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === value
                    ? "bg-white text-gray-900 shadow-sm dark:bg-gray-950 dark:text-white"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        {!blasts ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : blasts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
            No emails sent from here yet. Compose above to start the history.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {blasts.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(b.id === selectedId ? null : b.id)}
                    className={`flex w-full flex-col gap-1 px-4 py-3.5 text-left transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-gray-900/60 ${
                      selectedId === b.id ? "bg-accent/5 dark:bg-accent/10" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            b.kind === "BLAST"
                              ? "bg-accent/15 text-accent"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                          }`}
                        >
                          {b.kind === "BLAST" ? "Blast" : "Test"}
                        </span>
                        <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
                          {b.subject}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {formatWhen(b.createdAt)}
                        {b.sentByName ? ` · ${b.sentByName}` : ""}
                        {" · "}
                        {b.sentCount} sent
                        {b.failedCount ? ` · ${b.failedCount} failed` : ""}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">{selectedId === b.id ? "Hide" : "View"}</span>
                  </button>
                  {selectedId === b.id && (
                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 dark:border-gray-800 dark:bg-gray-900/40">
                      {detailLoading || !detail || detail.id !== b.id ? (
                        <div className="flex justify-center py-6">
                          <Spinner />
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <pre className="whitespace-pre-wrap rounded-xl border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-800 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200">
                            {detail.bodyPlain}
                          </pre>
                          {(detail.ctaLabel || detail.bottomImageUrl) && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {detail.ctaLabel ? `CTA: ${detail.ctaLabel}` : null}
                              {detail.ctaLabel && detail.bottomImageUrl ? " · " : null}
                              {detail.bottomImageUrl ? "Hero GIF included" : null}
                            </p>
                          )}
                          {detail.kind === "TEST" && detail.recipientEmails.length > 0 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              To: {detail.recipientEmails.join(", ")}
                            </p>
                          )}
                          {detail.failures?.length > 0 && (
                            <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                              Failures:{" "}
                              {detail.failures.map((f) => f.email).join(", ")}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
