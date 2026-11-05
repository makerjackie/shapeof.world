#!/usr/bin/env python3
"""Import the Lyria 3.5 takes made for the 两千年世界人口 film (2026-11-04) into the music library.

  prepare  process audio (master / preview / waveform) and write music/tracks/<id>.json with status "pending"
  publish  upload with upload-track.mjs (needs Cloudflare auth), verify the CDN bytes, set status "published"

Takes were generated with films/population/tools/lyria.py (Gemini API Interactions, model lyria-3.5);
raw takes and their interaction records live in /Volumes/DevSSD/tmp/rw/lyria*/ on the Mac mini.
Key: GEMINI_APIKEY from ~/.config/shapeof/gemini.env (never committed).
"""
import base64, hashlib, json, os, subprocess, sys, time, urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FILM = ROOT / ".claude/worktrees/population/films/population"
RAW = Path("/Volumes/DevSSD/tmp/rw")
PROC = ROOT / "music/.cache/processed"
TRACKS = ROOT / "music/tracks"
BATCH = "film-population-2026-11"
RIGHTS = "lyria-gemini-api-2026-11"
CDN = "https://music-cdn.shapeof.world/tracks"

GROUPS = {
    # prompt file, title en, title zh, bpm, key, instruments, note
    "w1": ("score_world_prompt.txt", "Rise and Fall", "兴衰", 129, "D minor",
           ["drift-phonk cowbell", "distorted 808 bass", "trap drums", "orchestral strings", "brass stabs", "taiko"], ""),
    "w2": ("score_world_prompt2.txt", "Rise and Fall", "兴衰", 130, "D minor",
           ["drift-phonk cowbell", "distorted 808 bass", "trap drums", "orchestral strings", "brass stabs", "taiko"], ""),
    "a": ("score_w9_a.txt", "Empire Rush", "帝国狂飙", 130, "D minor",
          ["cowbell melody", "distorted 808 slides", "punchy kicks", "orchestral stabs", "brass hits"], ""),
    "b": ("score_w9_b.txt", "Fallen Civilizations", "文明陨落", 130, "C minor",
          ["braams", "taiko ensemble", "staccato strings and brass", "cowbell lead", "distorted 808 bass"], ""),
    "c": ("score_w9_c.txt", "Push Forward", "一路向前", 128, "",
          ["cowbell melody", "distorted 808", "aggressive drums", "cinematic strings"], "Prompted to jump from 128 to 140 BPM at 2:12."),
    "d": ("score_w10.txt", "Final Surge", "终局加速", 130, "D minor",
          ["drift-phonk cowbell", "distorted 808 bass", "trap drums", "orchestral strings", "brass stabs", "taiko"], "Prompted to jump from 130 to 139 BPM at 2:12."),
}
TAKES = [("w1", "lyria/w_1"), ("w1", "lyria/w_2"), ("w1", "lyria/w_3"),
         ("w2", "lyria/w_4"), ("w2", "lyria/w_6"), ("w2", "lyria/w_7"), ("w2", "lyria/w_8"), ("w2", "lyria/w_9"),
         ("a", "lyria9/a1"), ("a", "lyria9/a2"), ("a", "lyria9/a3"), ("a", "lyria9/a4"), ("a", "lyria9/p1"), ("a", "lyria9/p2"),
         ("b", "lyria9/b1"), ("b", "lyria9/b2"), ("b", "lyria9/b3"), ("b", "lyria9/b4"),
         ("c", "lyria9/c1"), ("c", "lyria9/c2"), ("c", "lyria9/c3"), ("c", "lyria9/c4"),
         ("d", "lyria10/d1"), ("d", "lyria10/d2"), ("d", "lyria10/d3"), ("d", "lyria10/d5"), ("d", "lyria10/d6"), ("d", "lyria10/d7"), ("d", "lyria10/d8")]

DESC = {
    "w1": ("Epic dark phonk meets cinematic orchestral trailer: drift-phonk cowbell lead, distorted 808 bass, hard trap drums, strings, brass stabs, low wordless choir and taiko. Steady 129 BPM grid, D minor, made for beat-cut edits.",
           "史诗暗黑 Phonk 加电影预告片管弦：漂移 Phonk 牛铃主旋律、失真 808 贝斯、硬核 Trap 鼓，叠弦乐、铜管重音、低沉无词合唱和太鼓。全曲稳定 129 BPM，D 小调，适合卡点剪辑。"),
    "w2": ("Epic dark phonk meets cinematic orchestral trailer: drift-phonk cowbell lead, distorted 808 bass, hard trap drums, strings, brass stabs, low wordless choir and taiko. Steady 130 BPM grid, D minor, made for beat-cut edits.",
           "史诗暗黑 Phonk 加电影预告片管弦：漂移 Phonk 牛铃主旋律、失真 808 贝斯、硬核 Trap 鼓，叠弦乐、铜管重音、低沉无词合唱和太鼓。全曲稳定 130 BPM，D 小调，适合卡点剪辑。"),
    "a": ("Aggressive Brazilian phonk meets epic orchestral trailer: punchy kicks, distorted 808 slides, a catchy cowbell melody, orchestral stabs and brass hits on the beats, fills and risers before each section. 130 BPM, D minor.",
          "激进巴西 Phonk 加史诗管弦：重底鼓、失真 808 滑音、抓耳的牛铃旋律，管弦和铜管重音打在拍点上，每段之前有加花和上扬。130 BPM，D 小调。"),
    "b": ("Epic hybrid trailer music with drift-phonk drums: braams, taiko ensembles, staccato strings and brass, a dark cowbell lead and distorted 808 bass; hits on the downbeats and booming impacts every 8 beats. 130 BPM, C minor.",
          "史诗混合预告片配乐加漂移 Phonk 鼓：Braam 低音号角、太鼓群、断奏弦乐和铜管、暗色牛铃主旋律、失真 808；重拍上有打击，每 8 拍一次轰鸣。130 BPM，C 小调。"),
    "c": ("High-energy phonk with a hard-hitting cowbell melody, distorted 808 and aggressive drums, plus cinematic strings and choir; stabs, fills, risers, drops and stops. Prompted at 128 BPM, jumping to 140 BPM at 2:12 (not verified by listening).",
          "高能 Phonk：强力牛铃旋律、失真 808、激进鼓组，加电影感弦乐和合唱；重音、加花、上扬、Drop 和急停。提示词要求 128 BPM，2:12 起提速到 140 BPM（未逐首核听）。"),
    "d": ("Epic dark phonk meets cinematic orchestral trailer: drift-phonk cowbell lead, distorted 808 bass, hard trap drums, strings, brass stabs, low wordless choir and taiko. Prompted at 130 BPM, jumping to 139 BPM at 2:12 (not verified by listening). D minor.",
          "史诗暗黑 Phonk 加电影预告片管弦：漂移 Phonk 牛铃主旋律、失真 808、硬核 Trap 鼓，叠弦乐、铜管重音、低沉无词合唱和太鼓。提示词要求 130 BPM，2:12 起提速到 139 BPM（未逐首核听），D 小调。"),
}


def now():
    return datetime.now(timezone.utc).isoformat()


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def items():
    out = []
    for g, stem in TAKES:
        src = RAW / (stem + ".mp3")
        meta = next(RAW.glob(stem + ".*.meta.json"))
        tag = stem.split("/")[1].replace("_", "").upper()
        out.append(dict(id=f"pop-{GROUPS[g][1].lower().replace(' ', '-')}-{tag.lower()}", group=g, tag=tag, src=src,
                        meta=json.loads(meta.read_text()), film=(stem == "lyria/w_7")))
    # the edited score the World film actually uses: take W7 re-cut on bar lines (films/population/tools/score_world8.py)
    out.append(dict(id="pop-two-thousand-years-film-cut", group="w2", tag="FILM", src=FILM / "public/score_world8.wav",
                    meta=None, film=True))
    return out


def prepare(it):
    g = GROUPS[it["group"]]
    out = PROC / it["id"] / "v1"
    if not (out / "process.json").exists():
        subprocess.run(["node", str(ROOT / "music/scripts/process-audio.mjs"), str(it["src"]), str(out)], check=True, capture_output=True)
    proc = json.loads((out / "process.json").read_text())
    rv = {"description": dict(zip(["en", "zh"], DESC[it["group"]]))}
    prompt = (FILM / "research" / g[0]).read_text()
    master = proc["master"]["file"]
    film = it["id"].endswith("film-cut")
    note_en = ("The score of the short film 2,000 Years of World Population: take W7 of Rise and Fall, re-cut on bar lines to 2:51 "
               "(cold open, rewind, five acts, ending)." if film else
               ("This take was chosen for 2,000 Years of World Population. " if it["film"] else "") + g[6])
    note_zh = ("《两千年世界人口》成片配乐：「兴衰 · W7」按小节重新剪辑到 2:51（开场、倒回、五幕、结尾）。" if film else
               ("《两千年世界人口》选用的就是这一版。" if it["film"] else ""))
    desc = {"en": (note_en + " " + rv["description"]["en"]).strip(), "zh": (note_zh + rv["description"]["zh"]).strip()}
    rec = {
        "id": it["id"],
        "code": "POP-" + it["tag"],
        "title": ({"en": "2,000 Years · Film Score", "zh": "两千年 · 世界人口成片配乐"} if film else {"en": f"{g[1]} · {it['tag']}", "zh": f"{g[2]} · {it['tag']}"}),
        "category": "global", "archetype": "library", "role": "flagship" if it["film"] else "library", "kind": "music",
        "moods": ["epic", "dark", "driving", "tense"], "topics": ["2,000 years of world population", "empires, plagues and wars", "fast-cut data film"],
        "energy": 5, "bpm": g[3], "key": g[4], "instruments": g[5], "instrumental": True,
        "model": "lyria-3.5", "targetDuration": 170, "prompt": prompt, "recommendedWorldIds": [],
        "styles": ["phonk", "orchestral"], "scenarios": ["motion", "suspense"], "description": desc,
        "batch": BATCH, "status": "pending", "rightsProfile": RIGHTS,
        "usage": {"narrationFriendly": False, "placement": "foreground", "tags": ["phonk", "epic", "beat-synced edits"]},
        "duration": round(proc["duration"], 3), "targetEnergy": 5, "energyBasis": "prompt-intent",
        "generatedAt": (it["meta"] or {}).get("created") or "2026-11-04T03:20:19Z",
        "generation": ({"id": it["meta"]["id"], "model": it["meta"].get("model"), "generator": "Google Lyria 3.5",
                        "api": "Gemini API Interactions", "endpoint": "https://generativelanguage.googleapis.com/v1beta/interactions",
                        "completedAt": it["meta"].get("updated"), "interactionId": it["meta"]["id"], "sha256": proc["master"]["sha256"]}
                       if it["meta"] else
                       {"generator": "Google Lyria 3.5 (edited)", "editedFrom": "pop-rise-and-fall-w7",
                        "editTool": "films/population/tools/score_world8.py", "sha256": proc["master"]["sha256"]}),
        "loop": {"seamless": False, "basis": "not seam-tested"},
        "metadataBasis": "description, style, tempo, key, moods and energy are prompt intent (instrumental prompt; some prompts ask for a wordless choir); duration is measured; no automated audio review",
        "assets": {"preview": f"{CDN}/{it['id']}/v1/preview.mp3", "master": f"{CDN}/{it['id']}/v1/{master}",
                   "waveform": f"{CDN}/{it['id']}/v1/waveform.json"},
        "assetIntegrity": {r: {"sha256": sha(out / f), "bytes": (out / f).stat().st_size, "mimeType": m}
                           for r, f, m in [("preview", "preview.mp3", "audio/mpeg"), ("master", master, "audio/wav" if master.endswith(".wav") else "audio/mpeg"),
                                           ("waveform", "waveform.json", "application/json")]},
    }
    old = TRACKS / f"{it['id']}.json"
    if old.exists() and json.loads(old.read_text()).get("status") == "published":
        return "kept (published)"
    old.write_text(json.dumps(rec, ensure_ascii=False, indent=2) + "\n")
    return f"{rec['duration']:.0f}s"


def publish(it):
    rec_path = TRACKS / f"{it['id']}.json"
    rec = json.loads(rec_path.read_text())
    if rec["status"] == "published":
        return "already"
    subprocess.run(["node", str(ROOT / "music/scripts/upload-track.mjs"), it["id"], "v1"], check=True)
    for role, url in rec["assets"].items():
        data = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "shapeof-music-import/1.0"}), timeout=120).read()
        if hashlib.sha256(data).hexdigest() != rec["assetIntegrity"][role]["sha256"]:
            raise ValueError("CDN hash mismatch " + url)
    rec.update(status="published", verifiedAt=now())
    rec_path.write_text(json.dumps(rec, ensure_ascii=False, indent=2) + "\n")
    return "published"


if __name__ == "__main__":
    mode = sys.argv[1]
    seen = {}
    for it in items():
        h = sha(it["src"])
        if h in seen:
            print(it["id"], "duplicate of", seen[h]); continue
        seen[h] = it["id"]
        print(it["id"], (prepare if mode == "prepare" else publish)(it), flush=True)
