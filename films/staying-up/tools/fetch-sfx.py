#!/usr/bin/env python3
# Fetch this film's sounds from music.shapeof.world (our own library) into public/sfx/,
# using the exact asset URLs from each track's metadata. Keeps the metadata next to each file.
import json, os, subprocess, sys
LIST = {
    "plop": "sfx-water-06", "splash": "sfx-water-08", "smallsplash": "sfx-water-07",
    "bubble": "sfx-water-20", "rise": "sfx-water-04", "drop": "sfx-water-01", "ping": "sfx-water-13",
    "sub": "sfx-impact-16", "thump": "sfx-impact-08", "swell": "sfx-transition-07",
    "under": "ambience-water-05", "brown": "ambience-texture-02",
    "swipe": "sfx-transition-01", "notify": "sfx-notification-04", "tap": "sfx-ui-01",
    "lift": "sfx-transition-19", "shimmer": "sfx-magic-19",
    "music-floating": "scene-dub-90",  # 漂浮物件 · 90: melancholic piano over pads
    "music-warm": "scene-soul-90",  # 温暖电路 · 90: piano and strings, melancholic yet hopeful
}
here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, "..", "public", "sfx"); os.makedirs(out, exist_ok=True)
get = lambda u: subprocess.check_output(["curl", "-sfL", u])
for name, tid in LIST.items():
    meta = json.loads(get(f"https://music.shapeof.world/tracks/{tid}.json"))
    rights = meta.get("rights") or {}
    a = meta.get("assets") or {}
    url = a.get("master") or a.get("wav") or a.get("preview")
    if isinstance(url, dict): url = url.get("url")
    ext = os.path.splitext(url.split("?")[0])[1] or ".wav"
    dst = os.path.join(out, name + ext)
    if not os.path.exists(dst):
        open(dst, "wb").write(get(url))
    json.dump(meta, open(os.path.join(out, name + ".json"), "w"), ensure_ascii=False, indent=1)
    print(name, tid, ext, "commercial=", rights.get("commercialUse"), "attrib=", rights.get("attributionRequired"))
