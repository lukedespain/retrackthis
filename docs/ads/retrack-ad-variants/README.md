# Retrack This — animated ad variants

Two 7-second, 1080×1350 (4:5) silent video ads, each in five instruments.
They are built from code, so new instruments or wording changes re-render
in a couple of minutes and stay pixel-identical everywhere else.

| Series | Files | Headline |
|---|---|---|
| Takes come to you | `takes-cello`, `takes-guitar`, `takes-drums`, `takes-vocals`, `takes-bass` | Post the part. The takes come to you. |
| MIDI isn't fooling anyone | `midi-cello`, `midi-guitar`, `midi-drums`, `ai-vocals`, `midi-bass` | Your MIDI {instrument} isn't / aren't fooling anyone. (Vocals says AI.) |

Only the instrument words differ between files in a series: the card title
(`Golden Hour · Guitar`), and in the MIDI series also the headline, the
MIDI/AI pill and placeholder line, and the CTA line ("Real guitarists send
takes."). Layout, motion, timing, colors, type, badge, avatars and musician
names are shared.

## Re-render

From the repo root, after `npm install`:

```bash
docs/ads/retrack-ad-variants/build/render.sh              # all ten
docs/ads/retrack-ad-variants/build/render.sh midi-bass    # just one
```

Needs Node 22+ and Google Chrome (set `CHROME=/path/to/chrome` if it isn't in
the default Mac location). Encoding uses macOS's built-in Swift/AVFoundation;
on other systems it falls back to `ffmpeg`.

## Add an instrument or change words

Edit the `MIDI_VARIANTS` / `TAKES_VARIANTS` tables at the top of
`build/ads.mjs` — one line per video — then render that name. Keep the
rules below.

## Brand rules these follow

- Background cream `#F3F2EE`, white cards with a hairline edge and soft shadow.
- Iris `#7B61FF` only for: the word *This*, the badge face, played waveform,
  the Favorite state. Ink `#111113` for headlines and buttons.
- Type is Geist (loaded from the repo's `geist` package), headlines weight 600
  at about −4% tracking.
- Badge and avatars come from the site's own code (`components/brand/Wordmark.tsx`,
  `lib/avatar.ts`), so they always match retrackthis.com.
- Words: "Favorite" while a job is open, "pick" for the final choice. Never
  winner, award, hire, contest, or guaranteed. Don't lead with refunds or fees.

## Check a re-render didn't drift

`build/compare.swift a.mp4 b.mp4` decodes both videos at 15 points and prints
the largest pixel difference (0 = identical). Headless Chrome very
occasionally renders one frame a hair differently (a few pixels, invisible);
if you see a small non-zero number, just render that file again.
