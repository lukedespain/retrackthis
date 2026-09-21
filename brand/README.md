# Retrack This brand assets

**Type:** Inter (sitewide)  
**Mark:** Exact Figma PNGs only for product UI — **do not recreate for the site**. Resize only.  
SVGs in this folder are reference / export helpers and may lag the PNG masters.

## Accent colors

| Mode | Hex | Use |
|------|-----|-----|
| Light | `#5F4AFF` | Text, buttons, links (`--accent`) |
| Dark | `#A397FF` | Same roles on dark backgrounds (lighter for accessibility) |

CSS variables: `--accent`, `--accent-hover`, `--accent-soft`, `--accent-rgb` in `app/globals.css`.  
Tailwind `accent` / `accent-hover` / `accent-muted` map to those variables.

## Sources (`brand/source/`)

| File | Notes |
|------|--------|
| `logo-icon-light.png` | Light mark on white plate (keep for OAuth / email / apple touch) |
| `logo-icon-dark.png` | Dark mark on black plate |
| `logo-icon-light-transparent.png` | Derived: plate removed — **use in header / spinner** |
| `logo-icon-dark-transparent.png` | Derived: plate removed — **use in dark header / spinner** |
| `logo-wordmark-light.png` / `logo-wordmark-dark.png` | Full wordmarks |
| `logo-icon-*-no-bg-raw.png` | Raw Figma “no background” drops (light export was incomplete; we derive real transparency from the plate versions) |

## Public (`public/brand/`)

| Mode | Files |
|------|--------|
| Light (transparent) | `retrackthis-icon-light-*.png`, `retrackthis-favicon-*.png` |
| Dark (transparent) | `retrackthis-icon-dark-*.png` |
| Light on white (opaque) | apple-touch, google-oauth, email, workspace only |
| With plate archives | `retrackthis-icon-light-on-white-512.png`, `retrackthis-icon-dark-on-black-512.png` |
| Wordmarks | `retrackthis-logo-wordmark-light.png`, `retrackthis-logo-wordmark-dark.png` |

Favicons use **transparent** marks (no white/black plate). Apple/Google/email keep an opaque white plate because those surfaces require it.
