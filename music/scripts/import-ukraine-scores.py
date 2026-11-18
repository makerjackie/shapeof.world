#!/usr/bin/env python3
"""Import the two Lyria 3.5 cues written for the film 《俄乌战争，究竟是什么样的？》 and record which library
tracks the film uses.

  prepare  process audio (master / preview / waveform) and write music/tracks/<id>.json with status "pending";
           add the film to usedIn of the four library tracks it also uses
  publish  upload with upload-track.mjs (needs Cloudflare auth), verify the CDN bytes, set status "published"

The cues were generated on 2026-11-08 (+08:00) with films/ukraine-battle/tools/score.py `gen` (Gemini API
Interactions, model lyria-3.5, header Api-Revision 2026-05-20), cue sheet films/ukraine-battle/score/cues11.json,
both at commit 64da27ed of makerjackie/shapeof.world. score.py sends one text part, built exactly as
  common + " " + motif + "\\n\\n" + cue prompt
followed by JPEG stills of the picture (cue "img" seconds, 1024 px wide). The film used take 0 of each cue.
Copies of the takes, cue sheet, tools and stills: music/.cache/film-ukraine/ (from the M1 Pro worktree
.claude/worktrees/ukraine-battle/films/ukraine-battle/{out/score/takes,score,tools,out/score/img}).
"""
import hashlib, json, subprocess, sys, urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "music/.cache/film-ukraine"
PROC = ROOT / "music/.cache/processed"
TRACKS = ROOT / "music/tracks"
BATCH = "film-ukraine-2026-11"
RIGHTS = "lyria-gemini-api-2026-11"
CDN = "https://music-cdn.shapeof.world/tracks"
SOURCE_COMMIT = "64da27edf37c778289f75895212403dacc2882f1"

FILM = {"zh": "俄乌战争，究竟是什么样的？", "en": "The Russia–Ukraine War: What Is It Really Like?"}
URLS = [
    {"platform": "bilibili", "lang": "zh", "url": "https://www.bilibili.com/video/BV1qbWC61ENR/", "publishedAt": "2026-11-14"},
    {"platform": "youtube", "lang": "en", "url": "https://www.youtube.com/watch?v=ijMNghQUnXs", "publishedAt": "2026-11-16"},
]
ROLES = {  # from the film's score notes (score11.py, VERSION10–24.md)
    "charge-split": ("从开场冷启动一直铺到整场战争的全景。", "From the cold open through the whole-war overview."),
    "chaos-onset": ("「矛与盾」：攻防不断升级的那一段。", "The “spear and shield” escalation ladder."),
    "core-collapse": ("从蓄势到击中安德烈的那一下，再到机器人、最后一夜和撤出。",
                      "From the build into the hit on Andrii, then the robot, the last night and the way out."),
    "event-horizon": ("代价，直到片尾。", "The cost and the end."),
    "ukraine-war-at-night": ("夜里的战争：整个国家在夜色里挨打，直到镜头切到两名士兵。",
                             "Under the war at night, until the cut to the two soldiers."),
    "ukraine-the-hole": ("从两人走进阵地，到在坑里熬过的一周又一周。", "From the walk-in through the weeks in the hole."),
}

CUES = [
    dict(id="ukraine-war-at-night", cue="n10", take="n10_0", code="UKR-N10", en="The War at Night", zh="夜里的战争",
         bpm=120, key="D minor", target=70, energy=2, styles=["ambient", "orchestral"], scenarios=["suspense"],
         moods=["tense", "nocturnal", "restrained", "cold"],
         inst=["ticking clock", "soft analog synth pulse", "low drone", "dark string pad", "distant low booms", "solo cello"],
         desc_en="Written for the film 《俄乌战争，究竟是什么样的？》: night falls over a whole country at war. A ticking clock and a soft analog pulse, a dark string pad, distant low booms and the film's four-note cello motif (D C A F), sinking to a low D and the fading tick. D minor on a 120 BPM grid felt as half-time; restrained tension with no release. AI-generated with Google Lyria 3.5.",
         desc_zh="为纪录片《俄乌战争，究竟是什么样的？》而写：夜色落在整个交战的国家上。滴答的钟声和柔和的模拟合成器脉冲，暗色弦乐铺底、远处低沉的闷响，大提琴奏出全片的四音动机（D C A F），最后沉到一个低音 D 和渐弱的滴答声。D 小调，120 BPM 网格、半速感；克制的紧张，不释放。由 Google Lyria 3.5 AI 生成。"),
    dict(id="ukraine-the-hole", cue="h10", take="h10_0", code="UKR-H10", en="The Hole", zh="坑里",
         bpm=60, key="D minor", target=160, energy=2, styles=["ambient", "orchestral"], scenarios=["suspense"],
         moods=["solemn", "patient", "sparse", "tense"],
         inst=["low drone", "high strings", "solo cello", "low strings", "soft low pulses"],
         desc_en="Written for the film 《俄乌战争，究竟是什么样的？》: two soldiers walk into a field at night and hold one small hole for months under drones. From almost nothing, fragile high strings and a lonely solo cello with the film's four-note motif; long held notes and distant low pulses, growing darker as the weeks pass and ending suspended. D minor, slow and free, no drums. AI-generated with Google Lyria 3.5.",
         desc_zh="为纪录片《俄乌战争，究竟是什么样的？》而写：两名士兵夜里走进一片空地，在无人机下守着一个小坑熬了几个月。从几乎无声开始，脆弱的高音弦乐和孤独的大提琴（全片的四音动机）；长音与远处低沉的脉冲，随着一周周过去越来越暗，最后悬着结束。D 小调，慢速自由节奏，无鼓。由 Google Lyria 3.5 AI 生成。"),
]


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def used_in(track_id):
    zh, en = ROLES[track_id]
    return {"film": FILM, "urls": URLS, "role": {"zh": zh, "en": en}, "date": "2026-11-14"}


def add_film(path, track_id):
    rec = json.loads(path.read_text())
    entries = [u for u in rec.get("usedIn", []) if u.get("film") != FILM]
    rec["usedIn"] = entries + [used_in(track_id)]
    path.write_text(json.dumps(rec, ensure_ascii=False, indent=2) + "\n")


def mtime_utc(p):
    return datetime.fromtimestamp(Path(p).stat().st_mtime, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def prepare(c):
    sheet = json.loads((SRC / "score/cues11.json").read_text())
    cue = next(x for x in sheet["cues"] if x["id"] == c["cue"])
    prompt = sheet["common"] + " " + sheet.get("motif", "") + "\n\n" + cue["prompt"]  # exactly as score.py gen_one
    src = SRC / "takes" / f"{c['take']}.mp3"
    meta = json.loads((SRC / "takes" / f"{c['take']}.json").read_text())
    out = PROC / c["id"] / "v1"
    if not (out / "process.json").exists():
        subprocess.run(["node", str(ROOT / "music/scripts/process-audio.mjs"), str(src), str(out)], check=True, capture_output=True)
    proc = json.loads((out / "process.json").read_text())
    master = proc["master"]["file"]
    rec = {
        "id": c["id"], "code": c["code"], "title": {"en": c["en"], "zh": c["zh"]},
        "category": "global", "archetype": "library", "role": "flagship", "kind": "music",
        "moods": c["moods"], "topics": ["war documentary", "night", "Russia–Ukraine war"],
        "energy": c["energy"], "bpm": c["bpm"], "key": c["key"], "instruments": c["inst"], "instrumental": True,
        "model": "lyria-3.5", "targetDuration": c["target"], "prompt": prompt, "recommendedWorldIds": [],
        "styles": c["styles"], "scenarios": c["scenarios"],
        "description": {"en": c["desc_en"], "zh": c["desc_zh"]},
        "batch": BATCH, "status": "pending", "rightsProfile": RIGHTS, "collections": [],
        "usage": {"narrationFriendly": True, "placement": "background", "tags": ["documentary", "war", "night", "tension"]},
        "duration": round(proc["duration"], 3), "targetEnergy": c["energy"], "energyBasis": "prompt-intent",
        "generatedAt": mtime_utc(src),
        "generation": {
            "generator": "Google Lyria 3.5", "model": "lyria-3.5", "api": "Gemini API Interactions",
            "endpoint": "https://generativelanguage.googleapis.com/v1beta/interactions", "apiRevision": "2026-05-20",
            "completedAt": mtime_utc(src), "aiGenerated": True,
            "tool": "films/ukraine-battle/tools/score.py gen " + c["cue"],
            "promptSource": f"films/ukraine-battle/score/cues11.json (cue {c['cue']}) at {SOURCE_COMMIT[:8]}",
            "promptComposition": "common + \" \" + motif + \"\\n\\n\" + cue prompt (score.py gen_one)",
            "imageInputs": {"count": len(cue["img"]), "filmSeconds": cue["img"], "format": "JPEG stills of the picture, 1024 px wide",
                            "note": "sent after the text prompt; the picture file they came from is not recorded"},
            "take": c["take"] + ".mp3", "modelText": meta.get("texts"),
            "interactionIdRecorded": False,  # score.py kept no interaction id
            "sha256": proc["master"]["sha256"],
        },
        "usedIn": [used_in(c["id"])],
        "loop": {"seamless": False, "basis": "not seam-tested"},
        "metadataBasis": "description, tempo, key, moods, instruments and energy are prompt intent; duration is measured; generatedAt is the take file's write time; no library audio review",
        "assets": {"preview": f"{CDN}/{c['id']}/v1/preview.mp3", "master": f"{CDN}/{c['id']}/v1/{master}",
                   "waveform": f"{CDN}/{c['id']}/v1/waveform.json"},
        "assetIntegrity": {r: {"sha256": sha(out / f), "bytes": (out / f).stat().st_size, "mimeType": m}
                           for r, f, m in [("preview", "preview.mp3", "audio/mpeg"),
                                           ("master", master, "audio/wav" if master.endswith(".wav") else "audio/mpeg"),
                                           ("waveform", "waveform.json", "application/json")]},
    }
    path = TRACKS / f"{c['id']}.json"
    if path.exists() and json.loads(path.read_text()).get("status") == "published":
        return "kept (published)"
    path.write_text(json.dumps(rec, ensure_ascii=False, indent=2) + "\n")
    return f"{rec['duration']:.1f}s"


def publish(c):
    path = TRACKS / f"{c['id']}.json"
    rec = json.loads(path.read_text())
    if rec["status"] == "published":
        return "already"
    subprocess.run(["node", str(ROOT / "music/scripts/upload-track.mjs"), c["id"], "v1"], check=True)
    for role, url in rec["assets"].items():
        data = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "shapeof-music-import/1.0"}), timeout=120).read()
        if hashlib.sha256(data).hexdigest() != rec["assetIntegrity"][role]["sha256"]:
            raise ValueError("CDN hash mismatch " + url)
    rec.update(status="published", verifiedAt=datetime.now(timezone.utc).isoformat())
    path.write_text(json.dumps(rec, ensure_ascii=False, indent=2) + "\n")
    return "published"


if __name__ == "__main__":
    mode = sys.argv[1]
    if mode == "prepare":
        for tid in ["charge-split", "chaos-onset", "core-collapse", "event-horizon"]:
            add_film(TRACKS / f"{tid}.json", tid)
            print(tid, "usedIn", flush=True)
    for c in CUES:
        print(c["id"], (prepare if mode == "prepare" else publish)(c), flush=True)
