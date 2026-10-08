#!/usr/bin/env bash
# Render the ad videos into docs/ads/retrack-ad-variants/.
#   ./render.sh                 # all variants
#   ./render.sh midi-bass       # just these
# Needs: Node 22+, Google Chrome (or set CHROME=/path), `npm install` done in the repo,
# and either macOS (Swift encoder) or ffmpeg on PATH.
set -euo pipefail

BUILD="$(cd "$(dirname "$0")" && pwd)"
OUT="$(dirname "$BUILD")"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

ALL="$(node --no-warnings "$BUILD/ads.mjs" "$WORK")"
NAMES="${*:-$ALL}"

for name in $NAMES; do
  [ -f "$WORK/$name.html" ] || { echo "unknown variant: $name (have: $ALL)"; exit 1; }
  echo "rendering $name"
  node "$BUILD/capture.mjs" "$WORK/$name.html" "$WORK/$name" 7 30 >/dev/null
  if command -v swift >/dev/null && [ "$(uname)" = "Darwin" ]; then
    swift "$BUILD/encode.swift" "$WORK/$name" "$OUT/$name.mp4" 30 >/dev/null
  else
    ffmpeg -loglevel error -y -framerate 30 -i "$WORK/$name/%04d.png" \
      -c:v libx264 -pix_fmt yuv420p -crf 16 -movflags +faststart "$OUT/$name.mp4"
  fi
  echo "  -> $OUT/$name.mp4"
done
