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
| `logo-icon-light-transparent.png` / `logo-icon-dark-transparent.png` | **Main marks** - use for site, favicon, email (on white plate when opaque is required) |
| `logo-icon-light.png` / `logo-icon-dark.png` | Mark on white / black plate (archive) |
| `logo-wordmark-*-transparent.png` | Full lockups for brand kit / GitHub |
| `*-no-bg-raw.png` | Raw Figma drops (often incomplete) |

## Public (`public/brand/`) - keep current set

| Kind | Files | Use |
|------|--------|-----|
| Site marks | `retrackthis-icon-light-*.png`, `retrackthis-icon-dark-*.png` | Header, favicon, spinner |
| Email / app | `retrackthis-email-64.png`, `retrackthis-apple-touch-180.png` | Resend header, iOS home screen |
| Google | `retrackthis-google-oauth-120.png`, `retrackthis-workspace-512.png` | OAuth consent + Workspace profile photo |
| Wordmarks | `retrackthis-logo-wordmark-light*.png`, `retrackthis-logo-wordmark-dark*.png` | Brand kit / GitHub |
| Social | `retrackthis-banner-680.png`, `retrackthis-banner-1360.png` | Link previews |
| Favicons | `retrackthis-favicon-*.png` | Legacy / extras |

**Email + Workspace icons** must be a **full white square** (no rounded plate with dark outside corners). Those corner pixels show up on gray email backgrounds.

## Google Workspace sender (inbox “L” / Luke Despain)

The avatar and contact name next to Gmail are **not** controlled by our email HTML. For `hello@retrackthis.com`:

1. [admin.google.com](https://admin.google.com) → Directory → Users → `hello@retrackthis.com`
2. Set **Name** to `Retrack This` (not your personal name)
3. Upload **`public/brand/retrackthis-workspace-512.png`** as the user’s profile photo  
   (or Account → Personal info if you’re signed in as that user)
4. Give Gmail a few minutes (sometimes hours) to refresh avatars

Resend’s `from` display name should stay `Retrack This <hello@retrackthis.com>` (already the default in `lib/email.ts`).
