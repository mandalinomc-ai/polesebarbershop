#!/usr/bin/env bash
# Sync salon media from public/video/ to repo paths (Linux/macOS/Cloud VM).
# Mirrors scripts/sync-videos.ps1 — run from repo root:
#   ./scripts/sync-videos.sh
#
# Optional custom source:
#   SOURCE_DIR=/path/to/video ./scripts/sync-videos.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE_DIR="${SOURCE_DIR:-$ROOT/public/video}"
REEL_DIR="${REEL_DIR:-$ROOT/public/assets/video}"
IMAGE_DIR="${IMAGE_DIR:-$ROOT/public/images}"

resolve_source() {
  local base="$1"
  if [[ -f "$SOURCE_DIR/$base.mp4" ]]; then
    echo "$SOURCE_DIR/$base.mp4"
    return 0
  fi
  if [[ -f "$SOURCE_DIR/$base" ]]; then
    echo "$SOURCE_DIR/$base"
    return 0
  fi
  return 1
}

copy_video() {
  local source_base="$1"
  local dest_path="$2"
  local src
  if ! src="$(resolve_source "$source_base")"; then
    echo "SKIP (not found): $source_base" >&2
    return 1
  fi
  mkdir -p "$(dirname "$dest_path")"
  cp -f "$src" "$dest_path"
  echo "OK  $source_base -> $dest_path"
}

copy_image() {
  local filename="$1"
  local src="$SOURCE_DIR/$filename"
  if [[ ! -f "$src" ]]; then
    echo "SKIP (not found): $filename" >&2
    return 1
  fi
  mkdir -p "$IMAGE_DIR"
  cp -f "$src" "$IMAGE_DIR/$filename"
  echo "OK  $filename -> $IMAGE_DIR/$filename"
}

declare -a VIDEO_MAPPINGS=(
  "taglio-01|$REEL_DIR/taglio-01.mp4"
  "taglio-02|$REEL_DIR/taglio-02.mp4"
  "taglio-03|$REEL_DIR/taglio-03.mp4"
  "colorazione-01|$REEL_DIR/colorazione-01.mp4"
  "colorazione-02|$REEL_DIR/colorazione-02.mp4"
  "colorazione-03|$REEL_DIR/colorazione-03.mp4"
  "razor fade|$REEL_DIR/razor-fade.mp4"
  "taper fade|$REEL_DIR/taper-fade.mp4"
  "burst fade|$REEL_DIR/burst-fade.mp4"
  "decolorazione cute|$REEL_DIR/decolorazione-cute.mp4"
  "video felice polese bio|$REEL_DIR/video-felice-polese-bio.mp4"
)

echo ""
echo "Salon video sync"
echo "  Source : $SOURCE_DIR"
echo "  Dest   : $REEL_DIR"
echo "  Images : $IMAGE_DIR"
echo ""

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "ERROR: Source folder not found: $SOURCE_DIR" >&2
  exit 1
fi

copied=0
skipped=0
for entry in "${VIDEO_MAPPINGS[@]}"; do
  source_base="${entry%%|*}"
  dest_path="${entry#*|}"
  if copy_video "$source_base" "$dest_path"; then
    ((copied++)) || true
  else
    ((skipped++)) || true
  fi
done

for img in barba-pro.jpg tintura-barba.jpg; do
  if copy_image "$img"; then
    ((copied++)) || true
  else
    ((skipped++)) || true
  fi
done

echo ""
echo "Optional clips (not copied — site works without them):"
echo "  meches            -> spare colorazione reel or archive"
echo ""
echo "Done: $copied copied, $skipped skipped."
echo ""
