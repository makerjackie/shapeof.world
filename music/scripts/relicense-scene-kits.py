#!/usr/bin/env python3
"""Re-issue the published scene-kit ZIPs with the current licence files (CC BY-NC 4.0 from 2026-11-17).

Downloads each published kit.zip, checks its recorded SHA-256, copies every entry unchanged except
AUDIO_LICENSE.txt and rights-profiles.json (replaced by the current music/ files), uploads the new ZIP
under its own hash-addressed key and records it in music/packs/<id>.json. Old ZIP keys stay as they were.

  relicense-scene-kits.py            build and check locally (music/.cache/scene-packs-relicense/)
  relicense-scene-kits.py --publish  also upload with wrangler (needs Cloudflare auth) and update packs
"""
import argparse, hashlib, json, os, subprocess, urllib.request, zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / "music/.cache/scene-packs-relicense"
REPLACE = {"AUDIO_LICENSE.txt": ROOT / "music/AUDIO_LICENSE.txt", "rights-profiles.json": ROOT / "music/rights-profiles.json"}


def fetch(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "shapeof-music-relicense/1.0"}), timeout=300).read()


def rebuild(pack_path, publish):
    pack = json.loads(pack_path.read_text())
    if pack.get("status") != "published":
        return "skipped"
    old = pack["assets"]["download"]
    d = WORK / pack["id"]
    d.mkdir(parents=True, exist_ok=True)
    src = d / f"old-{old['sha256'][:16]}.zip"
    if not src.exists():
        src.write_bytes(fetch(old["url"]))
    if hashlib.sha256(src.read_bytes()).hexdigest() != old["sha256"]:
        if (pack.get("licenseHistory") or [{}])[-1].get("license") == "CC-BY-NC-4.0":
            return "already relicensed"
        raise ValueError("published kit hash mismatch " + old["url"])
    new = d / "kit.zip"
    with zipfile.ZipFile(src) as zin, zipfile.ZipFile(new, "w", zipfile.ZIP_DEFLATED) as zout:
        names = zin.namelist()
        for name in REPLACE:
            if name not in names:
                raise ValueError(f"{name} missing from {old['url']}")
        for info in zin.infolist():
            data = REPLACE[info.filename].read_bytes() if info.filename in REPLACE else zin.read(info.filename)
            zout.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED)
    sha = hashlib.sha256(new.read_bytes()).hexdigest()
    key = f"kits/{pack['id']}/{sha[:16]}/kit.zip"
    url = "https://music-cdn.shapeof.world/" + key
    if not publish:
        return f"built {new} {sha[:16]}"
    env = {**os.environ, **{k: "" for k in ["http_proxy", "https_proxy", "HTTP_PROXY", "HTTPS_PROXY"]}}
    subprocess.run([str(ROOT / "node_modules/.bin/wrangler"), "r2", "object", "put", "shapeof-world-music/" + key, "--file", str(new),
                    "--remote", "--force", "--content-type", "application/zip", "--cache-control", "public, max-age=31536000, immutable"],
                   cwd=ROOT, env=env, check=True)
    if hashlib.sha256(fetch(url)).hexdigest() != sha:
        raise ValueError("CDN hash mismatch " + url)
    pack["assets"]["download"] = {"url": url, "sha256": sha, "bytes": new.stat().st_size}
    pack["licenseUrl"] = "https://music.shapeof.world/audio-license.txt"
    pack["licenseHistory"] = pack.get("licenseHistory", []) + [
        {"until": "2026-11-16", "download": old, "license": "per-asset profiles (Shape Audio Permission 1.0 / CC0 1.0)"},
        {"from": "2026-11-17", "license": "CC-BY-NC-4.0", "reissuedAt": datetime.now(timezone.utc).isoformat()},
    ]
    pack_path.write_text(json.dumps(pack, ensure_ascii=False, indent=2) + "\n")
    return "published " + url


if __name__ == "__main__":
    a = argparse.ArgumentParser(description=__doc__)
    a.add_argument("--publish", action="store_true")
    args = a.parse_args()
    for p in sorted((ROOT / "music/packs").glob("*.json")):
        print(p.stem, rebuild(p, args.publish), flush=True)
