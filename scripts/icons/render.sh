#!/usr/bin/env bash
# Renders the app icons from public/icon.svg with headless Edge/Chrome (no extra npm dependency).
# Usage: bash scripts/icons/render.sh [path-to-chromium-browser]
set -euo pipefail
cd "$(dirname "$0")/../.."
BROWSER="${1:-/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe}"
render() { # svg size out
  local html; html="$(mktemp --suffix=.html)"
  printf '<html><body style="margin:0"><img src="file:///%s" width="%s" height="%s"></body></html>' "$(cygpath -m "$PWD/$1" 2>/dev/null || echo "$PWD/$1")" "$2" "$2" > "$html"
  "$BROWSER" --headless --disable-gpu --hide-scrollbars --default-background-color=00000000 \
    --window-size="$2,$2" --screenshot="$(cygpath -w "$PWD/$3" 2>/dev/null || echo "$PWD/$3")" "file:///$(cygpath -m "$html" 2>/dev/null || echo "$html")" >/dev/null 2>&1
  rm -f "$html"
}
render public/icon.svg 192 public/icon-192.png
render public/icon.svg 512 public/icon-512.png
render scripts/icons/maskable.svg 512 public/icon-maskable-512.png
render scripts/icons/maskable.svg 180 public/apple-touch-icon.png
ls -l public/*.png
