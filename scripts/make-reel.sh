#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE="$ROOT/video/site.webm"
ADMIN="$ROOT/video/admin.webm"
OUT="$ROOT/reel.mp4"

if [[ ! -f "$SITE" || ! -f "$ADMIN" ]]; then
  echo "Missing video/site.webm or video/admin.webm — run: npm run reel:record" >&2
  exit 1
fi

DUR="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$SITE")"
OFFSET="$(python3 -c "print(max(0.1, float('$DUR') - 0.6))")"

ffmpeg -y \
  -i "$SITE" \
  -i "$ADMIN" \
  -filter_complex "[0:v]fps=30,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1[v0];[1:v]fps=30,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1[v1];[v0][v1]xfade=transition=fade:duration=0.6:offset=${OFFSET}[v]" \
  -map "[v]" \
  -an \
  -c:v libx264 -crf 18 -pix_fmt yuv420p -movflags +faststart \
  "$OUT"

echo "Wrote $OUT"
