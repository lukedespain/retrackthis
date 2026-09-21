# Retrack This brand assets

**Type:** Inter (sitewide)  
**Mark / logos:** Exact Figma PNGs - **do not recreate for the site**. Resize only.  
SVGs in this folder are reference / export helpers and may lag the PNG masters.

## Site header

The live site keeps **icon mark + “Retrack This” text** (`components/Logo.tsx`) so the mark can
hover-scale. Do **not** replace the header with the full horizontal wordmark PNG.

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
| `logo-icon-light.png` / `logo-icon-dark.png` | Mark on white / black plate |
| `logo-icon-light-transparent.png` / `logo-icon-dark-transparent.png` | **Main marks** - plate removed (header, favicon, spinner) |
| `logo-wordmark-light.png` / `logo-wordmark-dark.png` | Full lockup on white / black plate |
| `logo-wordmark-light-transparent.png` / `logo-wordmark-dark-transparent.png` | **Main wordmarks** - plate removed (brand kit / GitHub) |
| `*-no-bg-raw.png` | Raw Figma “no background” drops (often incomplete; we derive transparency from plate versions) |

## Public (`public/brand/`)

| Kind | Files |
|------|--------|
| Icons (transparent) | `retrackthis-icon-light-*.png`, `retrackthis-icon-dark-*.png`, `retrackthis-favicon-*.png` |
| Wordmarks (transparent) | `retrackthis-logo-wordmark-light.png`, `retrackthis-logo-wordmark-dark.png` (+ height variants `-40`/`-56`/`-80`/`-112`) |
| Plate archives | `*-on-white.png`, `*-on-black.png` |
| Opaque required | apple-touch, google-oauth, email, workspace |

Favicons and header marks stay transparent (no white/black plate). Apple/Google/email keep an opaque white plate because those surfaces require it.
