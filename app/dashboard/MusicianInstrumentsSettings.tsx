"use client";

import { useEffect, useMemo, useState } from "react";
import { InstrumentTypeahead } from "@/components/InstrumentTypeahead";
import { InstrumentIcon } from "@/components/brand/InstrumentIcon";
import { Alert } from "@/components/ui/Alert";
import { labelForInstrumentId, type InstrumentGroup } from "@/lib/instruments";
import { useInstrumentCatalog } from "@/lib/useApprovedInstruments";

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

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function MusicianInstrumentsSettings() {
  const [saved, setSaved] = useState<string[]>([]);
  const [draft, setDraft] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [addingGroup, setAddingGroup] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggested, setSuggested] = useState<Set<string>>(new Set());
  const { extras, adjustments, groups: catalogGroups, catalog } = useInstrumentCatalog();

  useEffect(() => {
    fetch("/api/suggestions/mine")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        const labels = Array.isArray(body?.instruments)
          ? body.instruments
              .filter((item: { status?: string; label?: string }) => item.status === "PENDING" && item.label)
              .map((item: { label: string }) => item.label.toLowerCase())
          : [];
        if (labels.length) setSuggested(new Set(labels));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/settings/instruments")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        const instruments = body?.instruments ?? [];
        setSaved(instruments);
        setDraft(instruments);
      })
      .catch(() => setError("Could not load instruments"))
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(() => {
    const byId = new Map(catalogGroups.map((group) => [group.id, group]));
    return GROUP_ORDER.map((id) => byId.get(id)).filter((group): group is InstrumentGroup => Boolean(group));
  }, [catalogGroups]);

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return catalog.filter((item) => {
      if (item.label.toLowerCase().includes(q)) return true;
      return item.aliases.some((alias) => alias.includes(q));
    });
  }, [query, catalog]);

  const labelFor = (id: string) =>
    adjustments.labels[id] ?? extras.find((item) => item.id === id)?.label ?? labelForInstrumentId(id);

  async function suggest(label: string, groupId?: string) {
    const name = label.trim().replace(/\s+/g, " ");
    if (name.length < 2 || suggesting) return;
    setSuggesting(true);
    setError(null);
    try {
      const res = await fetch("/api/suggestions/instruments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: name, groupId }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not send that suggestion");
      setSuggested((prev) => new Set(prev).add(name.toLowerCase()));
      setAddingGroup(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that suggestion");
    } finally {
      setSuggesting(false);
    }
  }

  async function commit(next: string[]) {
    setDraft(next);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/instruments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruments: next }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not save");
      setSaved(body.instruments);
      setDraft(body.instruments);
    } catch (err) {
      setDraft(saved);
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  function toggle(id: string) {
    if (saving) return;
    const next = draft.includes(id) ? draft.filter((item) => item !== id) : [...draft, id];
    void commit(next);
  }

  function tile(id: string) {
    const label = labelFor(id);
    return (
      <button
        key={id}
        type="button"
        className="inst-pick"
        aria-pressed={draft.includes(id)}
        disabled={saving}
        onClick={() => toggle(id)}
      >
        <InstrumentIcon instrument={label} />
        <span>{label}</span>
      </button>
    );
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading instruments…</p>;
  }

  const q = query.trim();

  return (
    <div>
      <div className="ip-search">
        <SearchIcon />
        <input
          className="in"
          type="search"
          value={query}
          placeholder="Search instruments"
          autoComplete="off"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && query) {
              setQuery("");
            }
          }}
        />
      </div>

      {draft.length > 0 ? (
        <>
          <div className="ip-lbl">You play</div>
          <div className="inst-grid">
            {draft.map((id) => {
              const label = labelFor(id);
              return (
                <div key={id} className="inst-pick mine">
                  <InstrumentIcon instrument={label} />
                  <span>{label}</span>
                  <button
                    type="button"
                    className="inst-x"
                    aria-label={`Remove ${label}`}
                    disabled={saving}
                    onClick={() => toggle(id)}
                  >
                    <CloseIcon />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {q ? (
        <>
          <div className="ip-lbl">
            {hits.length ? `${hits.length} match${hits.length === 1 ? "" : "es"}` : "No matches yet"}
          </div>
          <div className="inst-grid">
            {hits.map((item) => tile(item.id))}
            {hits.length === 0 ? <SuggestTile query={q} sent={suggested.has(q.toLowerCase())} busy={suggesting} onSuggest={() => void suggest(q)} /> : null}
          </div>
        </>
      ) : (
        <>
          <div className="ip-lbl">All instruments</div>
          <div className="ip-groups">
            {groups.map((group) => {
              const selected = group.items.filter((item) => draft.includes(item.id)).length;
              const isOpen = open.has(group.id);
              const icon = group.items[0]?.label ?? group.label;
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
                    <InstrumentIcon instrument={icon} />
                    <strong>{GROUP_LABEL[group.id] ?? group.label}</strong>
                    <span className="ip-n">
                      {selected ? <b>{selected} selected</b> : group.items.length}
                    </span>
                    <Chevron />
                  </button>
                  {isOpen ? (
                    <div className="ip-grp-b">
                      <div className="inst-grid">{group.items.map((item) => tile(item.id))}</div>
                      {addingGroup === group.id ? (
                        <form
                          className="ip-add"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const value = String(new FormData(e.currentTarget).get("v") ?? "");
                            void suggest(value, group.id);
                          }}
                        >
                          <input className="in" name="v" maxLength={48} placeholder="What should we add?" required />
                          <button className="btn primary" type="submit" disabled={suggesting}>
                            Suggest
                          </button>
                          <button type="button" className="btn text" onClick={() => setAddingGroup(null)}>
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <button type="button" className="ip-other" onClick={() => setAddingGroup(group.id)}>
                          <PlusIcon /> Suggest an instrument
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </>
      )}

      {error ? (
        <Alert variant="error" className="mt-3">
          {error}
        </Alert>
      ) : null}
    </div>
  );
}

function SuggestTile({
  query,
  sent,
  busy,
  onSuggest,
}: {
  query: string;
  sent: boolean;
  busy: boolean;
  onSuggest: () => void;
}) {
  if (sent) {
    return (
      <div className="inst-pick ip-else sent">
        <CheckIcon />
        <span>
          Suggested <b>We&apos;ll review it</b>
        </span>
      </div>
    );
  }
  return (
    <button type="button" className="inst-pick ip-else" disabled={busy} aria-label={`Suggest adding ${query}`} onClick={onSuggest}>
      <PlusIcon />
      <span>
        Not here? <b>Suggest adding</b>
      </span>
    </button>
  );
}

/** Used in post-job form - typeahead with pill selection. */
export function PostJobInstrumentPicker({
  selectedId,
  onChange,
  disabled,
}: {
  selectedId: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
}) {
  return (
    <InstrumentTypeahead
      selectedId={selectedId}
      onChange={onChange}
      disabled={disabled}
      label="Instrument needed"
      hint="Start typing to pick from suggestions."
    />
  );
}
