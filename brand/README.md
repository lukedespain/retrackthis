# Retrack This brand assets

**Colors:** ink `#15141A` · accent `#5B4BFF` · white `#FFFFFF`  
**Mark:** Hazel lockup — black ⌈ + purple ⌋ + center dot on white.

Wordmark typography can be refined later; asset sizes below are the source of truth for product + Google surfaces.

## Which file to use

| Use | File |
|-----|------|
| **Google Auth / OAuth consent logo** (max 120×120) | `png/retrackthis-google-oauth-120.png` |
| **Google Workspace** profile / shared inbox avatar | `png/retrackthis-workspace-512.png` |
| **Website favicon / app icon** | `png/retrackthis-icon-512.png` (also `app/icon.png`) |
| **Apple touch** | `png/retrackthis-apple-touch-180.png` |
| **Email header** (hosted) | `public/brand/retrackthis-email-64.png` → `https://retrackthis.com/brand/retrackthis-email-64.png` |
| High-res icon | `png/retrackthis-icon-1024.png` |
| Full logo on white (slides, docs) | `png/retrackthis-logo-dark-on-white-680.png` (+ `-1360` @2x) |
| Full logo transparent | `png/retrackthis-logo-dark-680.png` |
| Full logo on dark | `png/retrackthis-logo-white-on-dark-680.png` |
| **Site header mark** (wide ~1.54:1 — do not force square) | `png/retrackthis-mark-site-transparent.png` (+ `-on-dark`) |

Public copies of icons live in `public/brand/` so Damian/Hazel (and email) can hotlink after deploy.

**Note:** The mark itself is wider than tall. Square icons (Google OAuth, Workspace, favicon) sit the mark in a square with white padding. The site header uses the wide crop so it isn’t squashed.

## SVG (editable)

- `logo-mark.svg` — icon only (light), correct wide viewBox
- `logo-mark-on-dark.svg` — icon only (dark backgrounds)
- `logo-full.svg` — icon + “Retrack This” (dark text)
- `logo-full-white.svg` — icon + wordmark (white text)
- `source/retrackthis-mark-master.png` — cropped square master from Hazel’s art (raster truth for icons)

Site header uses `components/Logo.tsx` → wide PNG mark (`h-7 w-auto`), not a square SVG.

## Regenerate wordmark PNGs after SVG edits

Icon PNGs are exported from the Hazel master raster (not the SVG). Wordmarks regenerate from SVG:

```bash
npm install --no-save sharp && node scripts/export-brand-assets.mjs
```

To re-crop icons from a new Hazel export, replace `source/retrackthis-mark-master.png` (square, white bg, ~18% padding) and re-run size exports, or ask Cursor to regenerate from the new file.
