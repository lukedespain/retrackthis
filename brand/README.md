# Retrack This brand assets

**Colors:** ink `#15141A` · accent `#5B4BFF` · white `#FFFFFF`  
**Main mark:** black ⌈ + purple ⌋ + **purple** center dot  
**Alt mark:** same arms + **black** center (loading / animation pair)  
**Wordmark:** arms frame “Retrack” (ink) + “This” (accent) — banners / special use

Sources from Hazel live in `source/`. Product SVGs are the high-res truth.

## Which file to use

| Use | File |
|-----|------|
| **Google Auth / OAuth logo** (120×120) | `png/retrackthis-google-oauth-120.png` |
| **Google Workspace** avatar | `png/retrackthis-workspace-512.png` |
| **Website favicon / app icon** | `png/retrackthis-icon-512.png` (`app/icon.png`) |
| **Apple touch** | `png/retrackthis-apple-touch-180.png` |
| **Email** | `public/brand/retrackthis-email-64.png` |
| **Banner / wordmark** | `png/retrackthis-banner-680.png` (+ `-1360`) |
| Loading still (black center) | `png/retrackthis-icon-black-dot-512.png` |

Site header: `components/Logo.tsx` (SVG purple-dot mark + Retrack **This**).  
Loader: `components/ui/Spinner.tsx` (arms spin + color flip).  
Banner component: `LogoWordmark` in `Logo.tsx`.

## SVG

- `logo-mark.svg` — main (purple center)
- `logo-mark-black-dot.svg` — alt (black center)
- `logo-mark-on-dark.svg` — main on dark
- `logo-full.svg` / `logo-full-white.svg` — framed wordmark

## Regenerate PNGs

```bash
npm install --no-save sharp && node scripts/export-brand-assets.mjs
```
