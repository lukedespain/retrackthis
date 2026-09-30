"use client";

import { type CSSProperties, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  type AvatarSettings,
  DEFAULT_AVATAR,
  FOCUS,
  NAMES,
  OPTS,
  PAL,
  TABS,
  TAB_NAMES,
  avatarSvg,
  cleanAvatar,
  previewAvatar,
  randomAvatar,
} from "@/lib/avatar";

type Props = {
  open: boolean;
  initial: AvatarSettings | null;
  name: string;
  onClose: () => void;
  onSaved: (a: AvatarSettings) => void;
};

export function AvatarBuilder({ open, initial, name, onClose, onSaved }: Props) {
  const uid = useId();
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState<AvatarSettings>({ ...DEFAULT_AVATAR });
  const [tab, setTab] = useState("face");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setDraft(cleanAvatar(initial) ?? { ...DEFAULT_AVATAR });
    setTab("face");
    setError(null);
    // Only reset when the dialog opens, not when `initial` changes underneath it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (!busyRef.current) onCloseRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  if (!open || !mounted) return null;

  const close = () => {
    if (!busyRef.current) onClose();
  };
  const set = (key: string, v: string) => setDraft((d) => ({ ...d, [key]: v }));
  const pickTab = (k: string) => {
    setTab(k);
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  };

  const save = async () => {
    const avatar = cleanAvatar(draft);
    if (!avatar) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/avatar", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ avatar }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error((data && typeof data.error === "string" && data.error) || "Couldn't save your avatar");
      }
      busyRef.current = false;
      setBusy(false);
      onSaved(avatar);
      onClose();
    } catch (e) {
      busyRef.current = false;
      setBusy(false);
      setError(e instanceof Error ? e.message : "Couldn't save your avatar");
    }
  };

  const svgId = (...parts: string[]) => `${uid}-${parts.join("-")}`;

  return createPortal(
    <div
      className="av-scrim on"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="av-dialog" role="dialog" aria-modal="true" aria-label="Customize your avatar">
        <button className="icon av-x" onClick={close} disabled={busy} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <aside className="av-side">
          <div className="av-big" role="img" aria-label={`${name || "Your"} avatar preview`} dangerouslySetInnerHTML={{ __html: avatarSvg(draft, svgId("big")) }} />
          <button className="btn soft av-shuffle" onClick={() => setDraft(randomAvatar())} disabled={busy}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="4" />
              <circle cx="9" cy="9" r="1.2" fill="currentColor" />
              <circle cx="15" cy="15" r="1.2" fill="currentColor" />
              <circle cx="15" cy="9" r="1.2" fill="currentColor" />
              <circle cx="9" cy="15" r="1.2" fill="currentColor" />
            </svg>{" "}
            Shuffle
          </button>
        </aside>
        <div className="av-main">
          <h2>Your avatar</h2>
          <div className="seg av-tabs">
            {TAB_NAMES.map(([k, l]) => (
              <button key={k} aria-pressed={tab === k} onClick={() => pickTab(k)}>
                {l}
              </button>
            ))}
          </div>
          <div className="av-body" ref={bodyRef}>
            {TABS[tab].map(([label, key, kind]) => (
              <div className="av-row" key={`${label}-${key}`}>
                <div className="av-lbl">{label}</div>
                {kind === "color" ? (
                  <div className="av-swatches">
                    {PAL[key].map((c) => (
                      <button
                        key={c}
                        className="av-sw"
                        aria-pressed={draft[key] === c}
                        style={{ "--c": c } as CSSProperties}
                        aria-label={`${label} ${c}`}
                        onClick={() => set(key, c)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="av-opts">
                    {OPTS[key].map((v) => (
                      <button key={v} className="av-opt" aria-pressed={draft[key] === v} onClick={() => set(key, v)}>
                        <span
                          className="av-mini"
                          dangerouslySetInnerHTML={{ __html: avatarSvg(previewAvatar(draft, key, v), svgId(key, v), FOCUS[key] || true) }}
                        />
                        <span>{NAMES[v]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="av-foot">
            {error && (
              <span role="alert" style={{ marginRight: "auto", fontSize: 13, color: "#c2413b" }}>
                {error}
              </span>
            )}
            <button className="btn text" onClick={close} disabled={busy}>
              Cancel
            </button>
            <button className="btn primary" onClick={save} disabled={busy} aria-busy={busy}>
              {busy ? "Saving…" : "Save avatar"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default AvatarBuilder;
