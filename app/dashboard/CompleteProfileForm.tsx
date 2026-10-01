"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthLayout } from "@/components/AuthLayout";
import { InstrumentIcon } from "@/components/brand/InstrumentIcon";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import {
  INSTRUMENT_CATALOG,
  INSTRUMENT_GROUPS,
  labelForInstrumentId,
  type InstrumentGroup,
} from "@/lib/instruments";
import { supabaseClient } from "@/lib/supabaseClient";

const GROUP_ORDER = [
  "fretted",
  "keyboards",
  "vocals",
  "drums-percussion",
  "orchestral-strings",
  "horns",
  "world",
];

const GROUP_LABEL: Record<string, string> = {
  fretted: "Guitars & fretted",
  keyboards: "Keys & pianos",
  vocals: "Vocals",
  "drums-percussion": "Drums & percussion",
  "orchestral-strings": "Orchestral strings",
  horns: "Brass & woodwinds",
  world: "World & traditional",
};

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function CompleteProfileForm({ onDone }: { onDone: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instruments, setInstruments] = useState<string[]>([]);
  const [later, setLater] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [defaultName, setDefaultName] = useState("");

  useEffect(() => {
    let cancelled = false;
    supabaseClient.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const meta = data.user?.user_metadata ?? {};
      const fromGoogle =
        (typeof meta.full_name === "string" && meta.full_name) ||
        (typeof meta.name === "string" && meta.name) ||
        "";
      setDefaultName(fromGoogle.trim());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo(() => {
    const byId = new Map(INSTRUMENT_GROUPS.map((group) => [group.id, group]));
    return GROUP_ORDER.map((id) => byId.get(id)).filter((group): group is InstrumentGroup => Boolean(group));
  }, []);

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return INSTRUMENT_CATALOG.filter(
      (item) =>
        item.label.toLowerCase().includes(q) || item.aliases.some((alias) => alias.includes(q))
    );
  }, [query]);

  function toggle(id: string) {
    setLater(false);
    setInstruments((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function tile(id: string) {
    const label = labelForInstrumentId(id);
    return (
      <button
        key={id}
        type="button"
        className="inst-pick"
        aria-pressed={instruments.includes(id)}
        disabled={submitting || later}
        onClick={() => toggle(id)}
      >
        <InstrumentIcon instrument={label} />
        <span>{label}</span>
      </button>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          instruments: later ? [] : instruments,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="One more thing" subtitle="What should we call you?">
      <form onSubmit={handleSubmit} className="stack">
        <div className="fld">
          <label className="lbl" htmlFor="name">
            Name<span className="req">*</span>
          </label>
          <input
            id="name"
            name="name"
            className="in"
            required
            autoFocus={!defaultName}
            defaultValue={defaultName}
            key={defaultName || "empty"}
            placeholder="Alex Rivera"
            disabled={submitting}
          />
        </div>

        <div className="fld">
          <span className="lbl">Notify me when a job needs</span>
          <div className="ip-search" style={{ marginTop: 8 }}>
            <input
              className="in"
              type="search"
              value={query}
              placeholder="Search instruments"
              autoComplete="off"
              disabled={submitting || later}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {!later && instruments.length > 0 ? (
            <div className="ip-mine">
              {instruments.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="ip-chip"
                  onClick={() => toggle(id)}
                  disabled={submitting}
                >
                  {labelForInstrumentId(id)}
                </button>
              ))}
            </div>
          ) : null}
          {!later ? (
            query.trim() ? (
              <div className="inst-grid">{hits.map((item) => tile(item.id))}</div>
            ) : (
              <div className="ip-groups">
                {groups.map((group) => {
                  const isOpen = open.has(group.id);
                  const selected = group.items.filter((item) => instruments.includes(item.id)).length;
                  return (
                    <div key={group.id} className="ip-grp" data-open={isOpen ? "true" : "false"}>
                      <button
                        type="button"
                        className="ip-grp-h"
                        aria-expanded={isOpen}
                        onClick={() =>
                          setOpen((prev) => {
                            const next = new Set(prev);
                            if (next.has(group.id)) next.delete(group.id);
                            else next.add(group.id);
                            return next;
                          })
                        }
                      >
                        <InstrumentIcon instrument={group.items[0]?.label ?? group.label} />
                        <strong>{GROUP_LABEL[group.id] ?? group.label}</strong>
                        <span className="ip-n">{selected ? <b>{selected} selected</b> : group.items.length}</span>
                        <Chevron />
                      </button>
                      {isOpen ? (
                        <div className="ip-grp-b">
                          <div className="inst-grid">{group.items.map((item) => tile(item.id))}</div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )
          ) : null}
          <label className="check" style={{ marginTop: 12 }}>
            <input
              type="checkbox"
              checked={later}
              disabled={submitting}
              onChange={(e) => setLater(e.target.checked)}
            />
            I&apos;ll set this up later
          </label>
        </div>

        {error && <Alert variant="error">{error}</Alert>}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Saving…" : "Continue"}
        </Button>
      </form>
    </AuthLayout>
  );
}
