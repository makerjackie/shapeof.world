"""Helpers shared by tools/music.py: fetch a track or sound effect from our own library, measure loudness."""
import hashlib
import json
import os
import re
import subprocess
import urllib.request

FF = "/opt/homebrew/bin/ffmpeg"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRACKS = os.path.normpath(os.path.join(ROOT, "..", "..", "music", "tracks"))
PUB = os.path.join(ROOT, "public")
UA = {"User-Agent": "Mozilla/5.0 (shapeof.world films)"}  # the CDN refuses Python's default UA


def fetch(tid: str, sub: str) -> str:
    meta = json.load(open(os.path.join(TRACKS, f"{tid}.json")))
    assert meta.get("status") == "published", tid
    url = meta["assets"]["master"]
    ext = url.rsplit(".", 1)[1]
    os.makedirs(os.path.join(PUB, sub), exist_ok=True)
    out = os.path.join(PUB, sub, f"{tid}.{ext}")
    if not os.path.exists(out):
        data = urllib.request.urlopen(urllib.request.Request(url, headers=UA)).read()
        want = (meta.get("assetIntegrity") or {}).get("master", {}).get("sha256")
        if want and hashlib.sha256(data).hexdigest() != want:
            raise SystemExit(f"sha256 mismatch for {tid}")
        open(out, "wb").write(data)
    if sub == "sfx" and ext != "wav":
        wav = out.rsplit(".", 1)[0] + ".wav"
        subprocess.run([FF, "-nostdin", "-loglevel", "error", "-y", "-i", out, wav], check=True)
        out = wav
    return out


def lufs(path: str) -> float:
    r = subprocess.run([FF, "-nostdin", "-hide_banner", "-i", path, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r)[-1])
