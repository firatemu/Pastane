#!/usr/bin/env bash
# Generate placeholder PNG assets for Expo (1024 icon). Replace with brand assets before store release.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS="$ROOT/apps/mobile/assets"
mkdir -p "$ASSETS"

if command -v convert >/dev/null 2>&1; then
  convert -size 1024x1024 xc:'#334537' -gravity center -fill '#fff8f5' -pointsize 120 -annotate 0 'PH' "$ASSETS/icon.png"
  cp "$ASSETS/icon.png" "$ASSETS/adaptive-icon.png"
  convert -size 1284x2778 xc:'#fff8f5' -gravity center -fill '#334537' -pointsize 72 -annotate 0 'Pasta-Hane' "$ASSETS/splash.png"
  echo "Generated assets in $ASSETS (ImageMagick)"
  exit 0
fi

python3 <<'PY'
from pathlib import Path
import struct, zlib

def png(w, h, r, g, b):
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)
    raw = b''.join(b'\x00' + bytes([r, g, b]) * w for _ in range(h))
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')

assets = Path('/home/azem/projects/Pastane/apps/mobile/assets')
assets.mkdir(parents=True, exist_ok=True)
for name, size in [('icon.png', 512), ('adaptive-icon.png', 512), ('splash.png', 512)]:
    (assets / name).write_bytes(png(size, size, 0x33, 0x45, 0x37))
print('Generated solid-color PNG assets (replace before Play Store)')
PY
