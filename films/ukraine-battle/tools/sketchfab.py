"""Download CC BY models from Sketchfab (glTF) into assets/sketchfab/<uid>/ and record the credit line.
The token comes from SKETCHFAB_API_TOKEN (env or private/secrets/oneworld.env.local).
usage: python tools/sketchfab.py <uid> [<uid> ...]"""
import io
import json
import os
import re
import sys
import urllib.request
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "sketchfab")


def token():
    t = os.environ.get("SKETCHFAB_API_TOKEN")
    if t:
        return t.strip()
    for p in ("private/secrets/oneworld.env.local", "private/secrets/oneworld.env"):
        f = os.path.join(ROOT, "..", "..", p)
        if os.path.exists(f):
            m = re.search(r"^SKETCHFAB_API_TOKEN=(.+)$", open(f).read(), re.M)
            if m:
                return m.group(1).strip().strip('"')
    sys.exit("no SKETCHFAB_API_TOKEN")


def get(url, auth=True):
    h = {"User-Agent": "shapeof.world"}
    if auth:
        h["Authorization"] = f"Token {token()}"
    return urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=300).read()


credits = {}
cf = os.path.join(OUT, "credits.json")
if os.path.exists(cf):
    credits = json.load(open(cf))
for uid in sys.argv[1:]:
    meta = json.loads(get(f"https://api.sketchfab.com/v3/models/{uid}", auth=False))
    lic = (meta.get("license") or {}).get("label", "")
    if "NonCommercial" in lic or "NoDerivs" in lic or not lic.startswith("CC Attribution"):
        print("skip", uid, meta.get("name"), lic)
        continue
    d = os.path.join(OUT, uid)
    if not os.path.exists(os.path.join(d, "scene.gltf")):
        dl = json.loads(get(f"https://api.sketchfab.com/v3/models/{uid}/download"))
        z = zipfile.ZipFile(io.BytesIO(get(dl["gltf"]["url"], auth=False)))
        z.extractall(d)
    credits[uid] = {
        "name": meta.get("name"),
        "author": meta["user"]["displayName"],
        "username": meta["user"]["username"],
        "license": lic,
        "url": meta.get("viewerUrl"),
    }
    print("ok", uid, meta.get("name"), "by", meta["user"]["displayName"], lic)
os.makedirs(OUT, exist_ok=True)
json.dump(credits, open(cf, "w"), ensure_ascii=False, indent=1)
