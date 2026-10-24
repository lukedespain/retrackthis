"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { avatarSvg, cleanAvatar, initialsFor } from "@/lib/avatar";
import { instrumentIconSvg } from "@/lib/instrumentIcons";

type Musician = { name: string; avatar: Record<string, string> | null; instruments: string[] };

// Show at most this many instrument moons; the rest collapse into a "+N" moon.
const MAX_MOONS = 3;
const ROW_COUNT = 3;
// Roughly one musician's width in the strip (avatar + side margins).
const SLOT_PX = 136;
// Each copy of a row should be at least this wide, so the strip never shows a gap.
const MIN_COPY_PX = 1200;

/**
 * The community under the mission line: musicians who listed an instrument (and
 * didn't opt out in Settings) glide past in three rows, alternating direction.
 * Hover someone and their row pauses while the instruments they play pop out.
 */
export function CommunityOrbit() {
  const [musicians, setMusicians] = useState<Musician[] | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/community")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => setMusicians(Array.isArray(body?.musicians) ? body.musicians : []))
      .catch(() => setMusicians([]));
  }, []);

  // Pause the rows while the card is off screen.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => el.classList.toggle("is-off", !entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [musicians]);

  const rows = useMemo(() => {
    if (!musicians) return [];
    // Deal people across the rows in turn so each row gets a mix.
    const dealt: Musician[][] = Array.from({ length: ROW_COUNT }, () => []);
    musicians.forEach((m, i) => dealt[i % ROW_COUNT].push(m));
    return dealt
      .filter((row) => row.length > 0)
      .map((row, r) => {
        const people = row.map((m, i) => {
          const avatar = cleanAvatar(m.avatar);
          return {
            ...m,
            face: avatar ? avatarSvg(avatar, `orb${r}-${i}`) : null,
            initials: initialsFor(m.name),
            moons: m.instruments
              .slice(0, MAX_MOONS)
              .map((inst, j) => ({ inst, icon: instrumentIconSvg(inst, `orb${r}-${i}-${j}`) })),
            more: Math.max(0, m.instruments.length - MAX_MOONS),
          };
        });
        // The track slides by half its width, so it needs an even number of copies.
        const perHalf = Math.ceil(MIN_COPY_PX / (people.length * SLOT_PX));
        return { people, copies: perHalf * 2 };
      });
  }, [musicians]);

  if (!musicians || musicians.length < ROW_COUNT) return null;
  const instrumentCount = new Set(musicians.flatMap((m) => m.instruments)).size;

  return (
    <div className="orbit" ref={rootRef}>
      <div className="orbit-head">
        <span>The musicians keeping it human</span>
        <span className="orbit-count">
          {musicians.length} musicians · {instrumentCount} instruments
        </span>
      </div>
      <div className="orbit-field">
        {rows.map((row, r) => (
          <div
            key={r}
            className={`orbit-row${r % 2 === 1 ? " ltr" : ""}`}
            // About the same speed whatever the row length: seconds per musician passing.
            style={{ "--dur": `${row.people.length * (row.copies / 2) * [5.4, 6, 4.9][r % 3]}s` } as React.CSSProperties}
          >
            <div className="orbit-track">
              {Array.from({ length: row.copies }, (_, copy) =>
                row.people.map((m, i) => {
                  const label = `${m.name}, plays ${m.instruments.join(", ")}`;
                  return (
                    <div
                      key={`${copy}-${i}`}
                      className="cm"
                      aria-hidden={copy > 0 ? true : undefined}
                      style={
                        {
                          "--n": m.moons.length + (m.more ? 1 : 0),
                          "--lift": `${[-8, 6, -2, 10, -6, 4][i % 6]}px`,
                        } as React.CSSProperties
                      }
                    >
                      <div className="cm-bob">
                        <div className="cm-ring">
                          {m.moons.map((moon, j) => (
                            <span key={moon.inst} className="cm-arm" style={{ "--j": j } as React.CSSProperties}>
                              <span className="cm-moon" title={moon.inst}>
                                <span className="cm-ico" dangerouslySetInnerHTML={{ __html: moon.icon }} />
                              </span>
                            </span>
                          ))}
                          {m.more ? (
                            <span className="cm-arm" style={{ "--j": m.moons.length } as React.CSSProperties}>
                              <span className="cm-moon cm-more" title={m.instruments.slice(MAX_MOONS).join(", ")}>
                                <span className="cm-ico">+{m.more}</span>
                              </span>
                            </span>
                          ) : null}
                        </div>
                        {m.face ? (
                          <span
                            className="cm-face"
                            tabIndex={copy > 0 ? -1 : 0}
                            role="img"
                            aria-label={label}
                            dangerouslySetInnerHTML={{ __html: m.face }}
                          />
                        ) : (
                          <span className="cm-face cm-ini" tabIndex={copy > 0 ? -1 : 0} role="img" aria-label={label}>
                            {m.initials}
                          </span>
                        )}
                        <span className="cm-tip" aria-hidden="true">
                          <b>{m.name}</b>
                          <span>
                            {m.instruments.slice(0, MAX_MOONS).join(" · ")}
                            {m.more ? <em> +{m.more} more</em> : null}
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
