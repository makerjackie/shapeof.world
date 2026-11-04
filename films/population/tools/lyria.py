# Generate a score with Lyria 3.5 (Gemini Interactions API). Key: GEMINI_APIKEY from ~/.config/shapeof/gemini.env (never committed).
# usage: python3 tools/lyria.py <prompt.txt> <out.wav>
import base64, json, os, sys, time, urllib.request
key = os.environ["GEMINI_APIKEY"]
prompt = open(sys.argv[1], encoding="utf-8").read()
body = {"model": os.environ.get("LYRIA_MODEL", "lyria-3.5"), "input": prompt, "response_format": {"type": "audio"}}
req = urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/interactions", data=json.dumps(body).encode(),
                             headers={"Content-Type": "application/json", "x-goog-api-key": key, "Api-Revision": "2026-05-20"})
t0 = time.time()
try:
    r = json.load(urllib.request.urlopen(req, timeout=900))
except urllib.error.HTTPError as e:
    print("HTTP", e.code, e.read().decode()[:2000]); sys.exit(1)
json.dump({k: v for k, v in r.items() if k != "steps"}, open(sys.argv[2] + ".meta.json", "w"), indent=1)
n = 0
for st in r.get("steps", []):
    for c in st.get("content", []) or []:
        if c.get("type") == "audio":
            open(sys.argv[2], "wb").write(base64.b64decode(c["data"])); n += 1
            print("audio", c.get("mime_type") or c.get("mimeType"))
        elif c.get("type") == "text":
            print("text:", c.get("text", "")[:1500])
if not n:
    print(json.dumps(r)[:3000])
print("done in %.0fs" % (time.time() - t0))
