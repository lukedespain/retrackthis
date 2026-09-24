#!/usr/bin/env python3
"""Render a lightweight looping GIF of the Retrack This hero (MIDI → takes → pick)."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / "public/brand/retrackthis-hero-email.gif"
W, H = 560, 168
ACCENT = (95, 74, 255)  # #5F4AFF
MUTED = (209, 213, 219)  # gray-300
BG = (255, 255, 255)
LANE = (243, 244, 246)
STRIP = 400  # virtual strip width (scrolled)
FRAMES = 24
DURATION_MS = 80  # ~1.9s loop — original snappy speed


def hash01(i: int, seed: float) -> float:
    x = math.sin(i * 127.1 + seed * 311.7) * 43758.5453
    return x - math.floor(x)


def make_wave_peaks(
    seed: float,
    *,
    count: int = 160,
    density: float = 0.72,
    punch: float = 0.55,
    sustain: float = 0.35,
    floor: float = 0.04,
) -> list[float]:
    peaks: list[float] = []
    energy = 0.2
    for i in range(count):
        t = i / count
        phrase = (
            0.45
            + 0.35 * math.sin(t * math.pi * 2.2 + seed)
            + 0.2 * math.sin(t * math.pi * 5.1 + seed * 1.7)
        )
        n1, n2, n3 = hash01(i, seed), hash01(i, seed + 17), hash01(i, seed + 41)
        hit = n1 < density * (0.55 + 0.45 * phrase)
        if hit:
            energy = min(1.0, energy * (0.4 + sustain) + n2 * punch + 0.15)
        else:
            energy *= 0.72 + n3 * 0.12
        grain = (n2 - 0.5) * 0.22
        peaks.append(max(floor, min(1.0, energy * phrase + grain)))
    blend = min(14, count // 10)
    for i in range(blend):
        w = i / blend
        peaks[i] = peaks[i] * w + peaks[count - blend + i] * (1 - w)
    return peaks


MIDI_LANES = [0.16, 0.30, 0.44, 0.58, 0.72, 0.86]
MIDI_NOTES = [
    (18, 0.30, 36, 0.92),
    (64, 0.58, 22, 0.75),
    (102, 0.44, 50, 0.95),
    (168, 0.16, 28, 0.70),
    (210, 0.72, 42, 0.88),
    (268, 0.44, 18, 0.65),
    (300, 0.30, 54, 0.90),
    (372, 0.86, 26, 0.72),
    (414, 0.58, 38, 0.88),
    (468, 0.16, 20, 0.70),
    (504, 0.44, 46, 0.94),
    (566, 0.72, 32, 0.80),
    (616, 0.30, 24, 0.68),
    (656, 0.58, 40, 0.90),
    (720, 0.86, 28, 0.76),
    (40, 0.86, 16, 0.55),
    (340, 0.16, 14, 0.58),
    (760, 0.44, 22, 0.82),
]
# Scale note x from 800-wide source to STRIP
NOTE_SCALE = STRIP / 800

WAVES = [
    make_wave_peaks(3.1, density=0.78, punch=0.72, sustain=0.28, floor=0.03),
    make_wave_peaks(7.4, density=0.70, punch=0.58, sustain=0.42, floor=0.045),
    make_wave_peaks(11.9, density=0.58, punch=0.80, sustain=0.22, floor=0.025),
]
SELECTED = 1


def lerp_color(a, b, t: float):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def draw_midi(draw: ImageDraw.ImageDraw, box, offset: float):
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    for lane in MIDI_LANES:
        y = y0 + int(lane * h)
        draw.line([(x0, y), (x1, y)], fill=LANE, width=1)
    for nx, lane, nw, op in MIDI_NOTES:
        for copy in (0, 1):
            left = x0 + (nx * NOTE_SCALE + copy * STRIP + offset) % (STRIP * 2) - STRIP
            # only draw if overlapping panel
            rx0 = left
            rx1 = left + nw * NOTE_SCALE
            if rx1 < x0 or rx0 > x1:
                continue
            top = y0 + int(lane * h) - 3
            color = lerp_color(BG, ACCENT, op)
            draw.rounded_rectangle(
                [max(x0, rx0), top, min(x1, rx1), top + 7],
                radius=2,
                fill=color,
            )


def draw_wave(
    draw: ImageDraw.ImageDraw,
    box,
    samples: list[float],
    offset: float,
    *,
    accent: bool,
    compact: bool,
):
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    mid = y0 + h / 2
    max_amp = (h / 2) - (3 if compact else 6)
    n = len(samples)
    step = STRIP / n
    bar_w = max(1.0, step * 0.72)
    color = ACCENT if accent else MUTED
    # fade edges
    for i, amp in enumerate(samples):
        for copy in (0, 1):
            cx = x0 + (i * step + copy * STRIP + offset) % (STRIP * 2) - STRIP + step / 2
            if cx < x0 - 2 or cx > x1 + 2:
                continue
            jitter = ((i * 17 + (3 if accent else 9)) % 11) / 11
            top = max(1.2, amp * max_amp * (0.88 + jitter * 0.22))
            bot = max(1.2, amp * max_amp * (0.78 + (1 - jitter) * 0.28))
            # edge fade within panel
            edge = min(cx - x0, x1 - cx, 28) / 28
            edge = max(0.15, min(1.0, edge))
            fill = lerp_color(BG, color, (0.88 if accent else 0.7) * edge)
            bx0 = cx - bar_w / 2
            draw.rectangle(
                [bx0, mid - top, bx0 + bar_w, mid + bot],
                fill=fill,
            )


def render_frame(t: float) -> Image.Image:
    """t in [0,1) for loop."""
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    offset = t * STRIP  # seamless because strip tiles

    # panel layout: midi | gap | takes | gap | pick
    g = 10
    midi_w = int(W * 0.32)
    take_w = int(W * 0.30)
    pick_w = W - midi_w - take_w - g * 2
    midi_box = (0, 8, midi_w, H - 8)
    take_box = (midi_w + g, 8, midi_w + g + take_w, H - 8)
    pick_box = (midi_w + g + take_w + g, 8, W, H - 8)

    draw_midi(draw, midi_box, offset)

    # three stacked takes
    tx0, ty0, tx1, ty1 = take_box
    row_h = (ty1 - ty0 - 8) // 3
    for i, samples in enumerate(WAVES):
        y0 = ty0 + i * (row_h + 4)
        y1 = y0 + row_h
        selected = i == SELECTED
        if selected:
            draw.rounded_rectangle(
                [tx0, y0, tx1, y1],
                radius=3,
                outline=lerp_color(BG, ACCENT, 0.35),
                width=1,
            )
        draw_wave(
            draw,
            (tx0 + 2, y0 + 1, tx1 - 2, y1 - 1),
            samples,
            offset,
            accent=selected,
            compact=True,
        )

    draw_wave(draw, pick_box, WAVES[SELECTED], offset, accent=True, compact=False)

    # soft dividers
    for x in (midi_w + g // 2, midi_w + g + take_w + g // 2):
        for y in range(20, H - 20):
            # gradient-ish purple line
            a = 1 - abs(y - H / 2) / (H / 2)
            c = lerp_color(BG, ACCENT, 0.15 + 0.55 * a)
            draw.point((x, y), fill=c)

    return img


def main():
    frames = [render_frame(i / FRAMES) for i in range(FRAMES)]
    # Quantize for smaller GIF
    q = []
    for f in frames:
        q.append(f.convert("P", palette=Image.ADAPTIVE, colors=48))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    q[0].save(
        OUT,
        save_all=True,
        append_images=q[1:],
        duration=DURATION_MS,
        loop=0,
        optimize=True,
        disposal=2,
    )
    size_kb = OUT.stat().st_size / 1024
    print(f"wrote {OUT} ({size_kb:.1f} KB, {FRAMES} frames)")


if __name__ == "__main__":
    main()
