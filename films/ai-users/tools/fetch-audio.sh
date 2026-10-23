#!/bin/bash
# Downloads the soundtrack, sound effects and ambience from the music library (https://music.shapeof.world/)
# into public/audio/<id>.<ext>, using the exact master URLs listed in catalog.json. Audio stays out of Git.
# Music: rights.commercialUse = true; effects and ambience: CC0. The CDN rejects some user agents, so curl sends its own.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public/audio
curl -sfL -A "curl/8" -o public/audio/catalog.json https://music.shapeof.world/catalog.json
IDS="scene-game-minimalism-exploration scene-soul-90 \
sfx-ui-01 sfx-foley-02 sfx-impact-06 sfx-impact-05 sfx-impact-03 sfx-impact-01 sfx-mechanical-13 sfx-transition-02 \
sfx-impact-08 sfx-foley-01 sfx-foley-07 sfx-mechanical-14 sfx-transition-03 sfx-foley-16 ambience-room-01 ambience-machine-02"
python3 - "$IDS" <<'PY'
import json, subprocess, sys
cat = {t["id"]: t for t in json.load(open("public/audio/catalog.json"))["tracks"]}
for i in sys.argv[1].split():
    t = cat[i]
    url = t["assets"]["master"]
    ext = url.rsplit(".", 1)[-1]
    if i.startswith("scene-") and not t["rights"].get("commercialUse"):
        raise SystemExit(f"{i}: not cleared for commercial use")
    subprocess.run(["curl", "-sfL", "-A", "curl/8", "-o", f"public/audio/{i}.{ext}", url], check=True)
    print("ok", i, ext)
PY
rm public/audio/catalog.json
