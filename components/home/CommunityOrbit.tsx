"use client";

import { useMemo } from "react";
import { avatarSvg, randomAvatar } from "@/lib/avatar";
import { instrumentIconSvg } from "@/lib/instrumentIcons";

// PROTOTYPE: made-up musicians with generated avatars. Real members would need
// to opt in before their name and avatar show on the homepage.
// x/y place each musician on desktop; m (when set) places them on phones, where only those show.
type Musician = { name: string; seed: number; instruments: string[]; x: number; y: number; size: number; m?: [number, number] };

const MUSICIANS: Musician[] = [
  { name: "Maya R.", seed: 11, instruments: ["Cello", "Piano"], x: 8, y: 20, size: 64, m: [24, 6] },
  { name: "Jonah K.", seed: 23, instruments: ["Electric guitar"], x: 28, y: 14, size: 56 },
  { name: "Priya S.", seed: 37, instruments: ["Female vocal", "Synthesizer", "Flute"], x: 50, y: 22, size: 72, m: [72, 13] },
  { name: "Diego M.", seed: 41, instruments: ["Drum kit", "Congas"], x: 71, y: 13, size: 60, m: [74, 39] },
  { name: "Lena V.", seed: 58, instruments: ["Violin"], x: 91, y: 22, size: 54, m: [30, 85] },
  { name: "Sam O.", seed: 63, instruments: ["Bass guitar", "Organ"], x: 17, y: 54, size: 66, m: [28, 31] },
  { name: "Aiko T.", seed: 77, instruments: ["Trumpet", "Flugelhorn"], x: 39, y: 50, size: 58, m: [76, 93] },
  { name: "Marcus B.", seed: 89, instruments: ["Male vocal"], x: 61, y: 56, size: 70, m: [70, 65] },
  { name: "Inés F.", seed: 94, instruments: ["Acoustic guitar", "Mandolin", "Banjo"], x: 83, y: 50, size: 62, m: [24, 57] },
  { name: "Theo W.", seed: 102, instruments: ["Saxophone", "Clarinet"], x: 6, y: 86, size: 56 },
  { name: "Noor A.", seed: 118, instruments: ["Harp"], x: 28, y: 84, size: 60 },
  { name: "Calvin P.", seed: 125, instruments: ["Rhodes", "Piano"], x: 50, y: 88, size: 54 },
  { name: "Rosa D.", seed: 131, instruments: ["Viola", "Cello"], x: 72, y: 84, size: 64 },
  { name: "Eli G.", seed: 147, instruments: ["Harmonica", "Ukulele"], x: 94, y: 86, size: 58 },
];

/**
 * The community under the mission line: avatars drift gently, and the
 * instruments each musician plays orbit them like moons. Hover (or tab to)
 * an avatar for their name.
 */
export function CommunityOrbit() {
  const people = useMemo(
    () =>
      MUSICIANS.map((m, i) => ({
        ...m,
        face: avatarSvg(randomAvatar(m.seed), `orb${i}`),
        moons: m.instruments.map((inst, j) => ({ inst, icon: instrumentIconSvg(inst, `orb${i}m${j}`) })),
      })),
    []
  );
  const instrumentCount = new Set(MUSICIANS.flatMap((m) => m.instruments)).size;

  return (
    <div className="orbit">
      <div className="orbit-head">
        <span>The musicians keeping it human</span>
        <span className="orbit-count">
          {MUSICIANS.length} musicians · {instrumentCount} instruments
        </span>
      </div>
      <div className="orbit-field">
        {people.map((m, i) => (
          <div
            key={m.name}
            className={m.m ? "cm" : "cm cm-desk"}
            style={
              {
                "--x": `${m.x}%`,
                "--y": `${m.y}%`,
                "--mx": `${m.m?.[0] ?? m.x}%`,
                "--my": `${m.m?.[1] ?? m.y}%`,
                "--s": `${m.size}px`,
                "--fd": `${7 + (i % 5) * 1.3}s`,
                "--fo": `${-(i * 1.7) % 9}s`,
              } as React.CSSProperties
            }
          >
            <div className="cm-bob">
              {m.moons.map((moon, j) => (
                <span
                  key={moon.inst}
                  className="cm-ring"
                  style={
                    {
                      "--j": j,
                      "--d": `${16 + j * 7 + (i % 3) * 2}s`,
                      "--o": `${-((i * 3 + j * 5) % 17)}s`,
                    } as React.CSSProperties
                  }
                >
                  <span className="cm-moon" title={moon.inst} dangerouslySetInnerHTML={{ __html: moon.icon }} />
                </span>
              ))}
              <span
                className="cm-face"
                tabIndex={0}
                role="img"
                aria-label={`${m.name}, plays ${m.instruments.join(", ")}`}
                dangerouslySetInnerHTML={{ __html: m.face }}
              />
              <span className="cm-tip" aria-hidden="true">
                <b>{m.name}</b>
                <span>{m.instruments.join(" · ")}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
