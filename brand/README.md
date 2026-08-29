# RetrackThis brand assets

Purple: `#5B4BFF`  
Wordmark text: `#111827` (dark) / `#FFFFFF` (on dark backgrounds)

Icon paths match `components/Logo.tsx` exactly.

## PNG (ready to use)

| File | Use |
|------|-----|
| `png/retrackthis-icon-512.png` | App icon, social avatar, favicon source |
| `png/retrackthis-icon-1024.png` | High-res icon |
| `png/retrackthis-logo-dark-on-white-680.png` | Full logo on white (slides, docs) |
| `png/retrackthis-logo-dark-on-white-1360.png` | Full logo on white @2x |
| `png/retrackthis-logo-dark-680.png` | Full logo, transparent background |
| `png/retrackthis-logo-dark-1360.png` | Full logo @2x, transparent |
| `png/retrackthis-logo-white-on-dark-680.png` | Full logo on dark background |
| `png/retrackthis-logo-white-on-dark-1360.png` | Full logo on dark @2x |
| `png/retrackthis-logo-white-680.png` | White wordmark, transparent |
| `png/retrackthis-logo-white-1360.png` | White wordmark @2x, transparent |

## SVG (editable source)

- `logo-mark.svg` — icon only
- `logo-full.svg` — icon + wordmark (dark text)
- `logo-full-white.svg` — icon + wordmark (white text)

Regenerate PNGs after SVG edits:

```bash
npm install --no-save sharp && node scripts/export-brand-assets.mjs
```
