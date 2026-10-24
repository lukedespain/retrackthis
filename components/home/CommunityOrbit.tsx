"use client";

import { useMemo } from "react";
import { avatarSvg, randomAvatar } from "@/lib/avatar";
import { instrumentIconSvg } from "@/lib/instrumentIcons";

// PROTOTYPE: made-up musicians with generated avatars. Real members would need
// to opt in before their name and avatar show on the homepage.
type Musician = { name: string; seed: number; instruments: string[] };

const ROWS: Musician[][] = [
  [
    { name: "Maya R.", seed: 11, instruments: ["Cello", "Piano"] },
    { name: "Jonah K.", seed: 23, instruments: ["Electric guitar"] },
    { name: "Priya S.", seed: 37, instruments: ["Female vocal", "Synthesizer", "Flute"] },
    { name: "Diego M.", seed: 41, instruments: ["Drum kit", "Congas"] },
    { name: "Lena V.", seed: 58, instruments: ["Violin"] },
    { name: "Omar H.", seed: 166, instruments: ["Trombone", "Tuba"] },
  ],
  [
    { name: "Sam O.", seed: 63, instruments: ["Bass guitar", "Organ"] },
    { name: "Aiko T.", seed: 77, instruments: ["Trumpet", "Flugelhorn"] },
    { name: "Marcus B.", seed: 89, instruments: ["Male vocal"] },
    {
      name: "Inés F.",
      seed: 94,
      instruments: ["Acoustic guitar", "Cello", "Piano", "Mandolin", "Banjo", "Violin", "Harp", "Ukulele", "Female vocal", "Flute"],
    },
    { name: "Hana L.", seed: 171, instruments: ["Marimba", "Vibraphone"] },
    { name: "Felix N.", seed: 183, instruments: ["Double bass"] },
  ],
  [
    { name: "Theo W.", seed: 102, instruments: ["Saxophone", "Clarinet"] },
    { name: "Noor A.", seed: 118, instruments: ["Harp"] },
    { name: "Calvin P.", seed: 125, instruments: ["Rhodes", "Piano"] },
    { name: "Rosa D.", seed: 131, instruments: ["Viola", "Cello"] },
    { name: "Eli G.", seed: 147, instruments: ["Harmonica", "Ukulele"] },
    { name: "June C.", seed: 192, instruments: ["Female vocal", "Acoustic guitar"] },
  ],
];

// Show at most this many instrument moons; the rest collapse into a "+N" moon.
const MAX_MOONS = 3;

// Each row's list repeats so the strip never runs out; the track slides by half
// its width (two copies), then loops seamlessly.
const COPIES = 4;

/**
 * The community under the mission line: three rows of musicians glide past,
 * alternating direction. Hover (or tap) someone and their row pauses while the
 * instruments they play pop out and orbit them.
 */
export function CommunityOrbit() {
  const rows = useMemo(
    () =>
      ROWS.map((row, r) =>
        row.map((m, i) => ({
          ...m,
          face: avatarSvg(randomAvatar(m.seed), `orb${r}-${i}`),
          moons: m.instruments
            .slice(0, MAX_MOONS)
            .map((inst, j) => ({ inst, icon: instrumentIconSvg(inst, `orb${r}-${i}-${j}`) })),
          more: Math.max(0, m.instruments.length - MAX_MOONS),
        }))
      ),
    []
  );
  const people = ROWS.flat();
  const instrumentCount = new Set(people.flatMap((m) => m.instruments)).size;

  return (
    <div className="orbit">
      <div className="orbit-head">
        <span>The musicians keeping it human</span>
        <span className="orbit-count">
          {people.length} musicians · {instrumentCount} instruments
        </span>
      </div>
      <div className="orbit-field">
        {rows.map((row, r) => (
          <div key={r} className={`orbit-row${r % 2 === 1 ? " ltr" : ""}`} style={{ "--dur": `${[64, 72, 58][r]}s` } as React.CSSProperties}>
            <div className="orbit-track">
              {Array.from({ length: COPIES }, (_, copy) =>
                row.map((m, i) => (
                  <div
                    key={`${copy}-${m.name}`}
                    className="cm"
                    aria-hidden={copy > 0 ? true : undefined}
                    style={
                      {
                        "--n": m.moons.length + (m.more ? 1 : 0),
                        "--lift": `${[-8, 6, -2, 10, -6, 4][i]}px`,
                        "--fd": `${6 + (i % 3) * 1.4}s`,
                        "--fo": `${-i * 1.3}s`,
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
                      <span
                        className="cm-face"
                        tabIndex={copy > 0 ? -1 : 0}
                        role="img"
                        aria-label={`${m.name}, plays ${m.instruments.join(", ")}`}
                        dangerouslySetInnerHTML={{ __html: m.face }}
                      />
                      <span className="cm-tip" aria-hidden="true">
                        <b>{m.name}</b>
                        <span>
                          {m.instruments.slice(0, MAX_MOONS).join(" · ")}
                          {m.more ? <em> +{m.more} more</em> : null}
                        </span>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
