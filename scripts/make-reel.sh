#!/usr/bin/env bash
# Mux site + admin captures into a full-bleed Instagram Reel (1080×1920) and speed up.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE="$ROOT/video/site.webm"
ADMIN="$ROOT/video/admin.webm"
OUT="$ROOT/reel.mp4"
SPEED="${REEL_SPEED:-1.7}"

if [[ ! -f "$SITE" || ! -f "$ADMIN" ]]; then
  echo "Missing video/site.webm or video/admin.webm — run: npm run reel:record" >&2
  exit 1
fi

# Build per-input filters (site=0, admin=1) with correct crop/scale
site_wh="$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$SITE")"
admin_wh="$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$ADMIN")"
site_w="${site_wh%,*}"; site_h="${site_wh#*,}"
admin_w="${admin_wh%,*}"; admin_h="${admin_wh#*,}"

norm_filter() {
  local idx="$1" w="$2" h="$3" label="$4"
  if [[ "$w" == "1080" && "$h" == "1920" ]]; then
    # Legacy broken capture: UI only in top-left 540×960
    echo "[${idx}:v]crop=540:960:0:0,scale=1080:1920:flags=lanczos,setsar=1,fps=30,setpts=PTS/${SPEED},format=yuv420p[${label}]"
  else
    echo "[${idx}:v]scale=1080:1920:flags=lanczos:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30,setpts=PTS/${SPEED},format=yuv420p[${label}]"
  fi
}

F0="$(norm_filter 0 "$site_w" "$site_h" v0)"
F1="$(norm_filter 1 "$admin_w" "$admin_h" v1)"

# Duration of sped-up site clip for xfade offset
SITE_DUR="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$SITE")"
OFFSET="$(python3 -c "print(max(0.1, float('${SITE_DUR}') / float('${SPEED}') - 0.35))")"

ffmpeg -y \
  -i "$SITE" \
  -i "$ADMIN" \
  -filter_complex "${F0};${F1};[v0][v1]xfade=transition=fade:duration=0.35:offset=${OFFSET}[v]" \
  -map "[v]" \
  -an \
  -c:v libx264 -profile:v high -level 4.0 -crf 18 -pix_fmt yuv420p -movflags +faststart \
  "$OUT"

echo "Wrote $OUT (speed ${SPEED}x, full-bleed 1080x1920)"
ffprobe -v error -select_streams v:0 -show_entries stream=width,height -show_entries format=duration -of default=nw=1:nk=1 "$OUT"
ls -lah "$OUT"
