#!/usr/bin/env python3
"""Import the 「脉搏 Pulse」 Lyria 3.5 takes (2026-11-04) into the music library.

A steady ~112 BPM trap groove for knowledge / science explainers, written from a rhythm brief
(tempo, four-bar minor loop, section timeline, drum pattern); no reference audio was given to the model.
Jackie picked B = 「脉搏 · 弦」 (default explainer score) and D = 「脉搏 · 筝」 (alternative); both are in the
`jackie-picks` collection. Every other take of the session is kept as a draft so it can be reused.

  prepare  process audio (master / preview / waveform) and write music/tracks/<id>.json with status "pending"
  publish  upload with upload-track.mjs (needs Cloudflare auth), verify the CDN bytes, set status "published"

Raw takes, prompts and interaction records: /Volumes/DevSSD/Work/lyria-qnzh/ on the Mac mini
(prompts/*.txt, takes/*.mp3 + *.meta.json; *_t.wav = time-stretched to 111.6 BPM with sox `tempo -m 1.01455`).
Key: GOOGLE_AQ_KEY from ~/.config/shapeof/google_aq.env (never committed).
"""
import hashlib, json, subprocess, sys, urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORK = Path("/Volumes/DevSSD/Work/lyria-qnzh")
PROC = ROOT / "music/.cache/processed"
TRACKS = ROOT / "music/tracks"
BATCH = "pulse-2026-11"
RIGHTS = "lyria-gemini-api-2026-11"
CDN = "https://music-cdn.shapeof.world/tracks"
GROOVE_EN = "Steady trap groove for explainers: kick and clap backbeat, 16th hi-hats with rolls, 808 sub, a four-bar minor loop, section changes every 8-16 bars."
GROOVE_ZH = "为知识科普视频做的稳定 Trap 律动：底鼓加二四拍拍手、16 分音符踩镲和滚奏、808 低音、四小节小调循环，每 8 到 16 小节换一层。"

# id, source (relative to WORK), prompt file, title en, title zh, styles, instruments, bpm, key, note en, note zh, picks
T = [
    ("pulse-strings", "takes/e6_t.wav", "e6.txt", "Pulse · Strings", "脉搏 · 弦", ["orchestral"],
     ["pizzicato strings", "analog synth arpeggio", "808 sub bass", "trap drums", "synth pad"], 111.6, "",
     "Jackie's pick: the default score for knowledge videos (take E6, sped up 1.5% to 111.6 BPM).",
     "Jackie 精选：知识科普视频默认配乐（E6 版，提速 1.5% 到 111.6 BPM）。", True),
    ("pulse-zheng", "takes/c1_t.wav", "c.txt", "Pulse · Zheng", "脉搏 · 筝", ["guzheng"],
     ["guzheng", "dizi bamboo flute", "808 sub bass", "trap drums", "synth pad"], 111.6, "",
     "Jackie's pick: the Chinese-colour alternative to Pulse · Strings (take C1, sped up 1.5% to 111.6 BPM).",
     "Jackie 精选：「脉搏 · 弦」的国风备选（C1 版，提速 1.5% 到 111.6 BPM）。", True),
    ("pulse-celesta-cut", "takes/w6x_t.wav", "w6.txt", "Pulse · Celesta (cut)", "脉搏 · 钢片琴（剪辑版）", ["orchestral"],
     ["celesta", "pulsing synth bass", "hybrid percussion", "ostinato strings"], 111.6, "",
     "Take W6 re-cut on bar lines (peak extended) and sped up to 111.6 BPM.", "W6 版按小节重剪（高潮加长），提速到 111.6 BPM。", False),
    ("pulse-synth", "takes/e2_t.wav", "e2.txt", "Pulse · Synth", "脉搏 · 合成器", ["trap"],
     ["plucked synth", "felt piano", "808 sub bass", "trap drums"], 111.6, "", "Take E2, sped up to 111.6 BPM.", "E2 版，提速到 111.6 BPM。", False),
]
DRAFTS = [  # raw takes at the model's own tempo (about 110 BPM)
    ("w1", "w1.txt", "Guzheng and dizi", "古筝与竹笛", ["guzheng"], ["guzheng", "dizi", "808", "trap drums"]),
    ("w2", "w2.txt", "Felt piano and marimba", "钢琴与马林巴", ["felt-piano"], ["felt piano", "marimba", "glassy mallets", "electronic drums"]),
    ("w3", "w3.txt", "Pizzicato and arpeggio", "拨弦与琶音", ["orchestral"], ["pizzicato strings", "analog synth arpeggio", "hybrid drums"]),
    ("w4", "w4.txt", "Pipa and erhu", "琵琶与二胡", ["pipa"], ["pipa", "plucked synth", "erhu", "trap drums"]),
    ("w5", "w5.txt", "Guitar and kalimba", "吉他与卡林巴", ["post-rock"], ["electric guitar harmonics", "kalimba", "synth pads", "pop drums"]),
    ("w6", "w6.txt", "Celesta", "钢片琴", ["orchestral"], ["celesta", "synth bass", "hybrid percussion", "ostinato strings"]),
    ("c2", "c.txt", "Zheng", "筝", ["guzheng"], ["guzheng", "dizi", "808", "trap drums"]),
    ("c3", "c.txt", "Zheng", "筝", ["guzheng"], ["guzheng", "dizi", "808", "trap drums"]),
    ("c5", "c.txt", "Zheng", "筝", ["guzheng"], ["guzheng", "dizi", "808", "trap drums"]),
    ("c6", "c.txt", "Zheng", "筝", ["guzheng"], ["guzheng", "dizi", "808", "trap drums"]),
    ("p1", "c.txt", "Zheng (Pro model)", "筝（Pro 模型）", ["guzheng"], ["guzheng", "dizi", "808", "trap drums"]),
    ("p2", "c.txt", "Zheng (Pro model)", "筝（Pro 模型）", ["guzheng"], ["guzheng", "dizi", "808", "trap drums"]),
    ("e1", "e1.txt", "Synth", "合成器", ["trap"], ["plucked synth", "felt piano", "808", "trap drums"]),
    ("e3", "e3.txt", "Mallets", "马林巴", ["trap"], ["marimba", "glassy mallets", "saw synth lead", "808", "trap drums"]),
    ("e4", "e4.txt", "Mallets", "马林巴", ["trap"], ["marimba", "glassy mallets", "saw synth lead", "808", "trap drums"]),
    ("e5", "e5.txt", "Strings", "弦", ["orchestral"], ["pizzicato strings", "analog synth arpeggio", "808", "trap drums"]),
    ("e7", "e7.txt", "Guitar", "吉他", ["trap"], ["clean electric guitar", "bell synth pluck", "808", "trap drums"]),
]


def items():
    out = [dict(id=i, src=WORK / s, prompt=p, en=en, zh=zh, styles=st, inst=ins, bpm=b, key=k, note_en=ne, note_zh=nz, picks=pk,
                meta=WORK / ("takes/" + s.split("/")[1].replace("_t.wav", "").replace("x", "") + ".mp3.meta.json"))
           for i, s, p, en, zh, st, ins, b, k, ne, nz, pk in T]
    for tag, p, en, zh, st, ins in DRAFTS:
        out.append(dict(id=f"pulse-draft-{tag}", src=WORK / f"takes/{tag}.mp3", prompt=p, en=f"Pulse · Draft {tag.upper()} · {en}",
                        zh=f"脉搏 · 草稿 {tag.upper()} · {zh}", styles=st, inst=ins, bpm=110, key="", picks=False,
                        note_en="Draft take at the model's own tempo.", note_zh="草稿，模型原速。", meta=WORK / f"takes/{tag}.mp3.meta.json"))
    return out


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def prepare(it):
    out = PROC / it["id"] / "v1"
    if not (out / "process.json").exists():
        subprocess.run(["node", str(ROOT / "music/scripts/process-audio.mjs"), str(it["src"]), str(out)], check=True, capture_output=True)
    proc = json.loads((out / "process.json").read_text())
    meta = json.loads(it["meta"].read_text()) if it["meta"].exists() else {}
    master = proc["master"]["file"]
    model = meta.get("model") or "lyria-3.5"
    rec = {
        "id": it["id"], "code": "PULSE-" + it["id"].split("-")[-1].upper(),
        "title": {"en": it["en"], "zh": it["zh"]},
        "category": "global", "archetype": "library", "role": "flagship" if it["picks"] else "library", "kind": "music",
        "moods": ["curious", "driving", "steady"], "topics": ["knowledge explainer", "science video", "beat-cut edit"],
        "energy": 4, "bpm": it["bpm"], "key": it["key"], "instruments": it["inst"], "instrumental": True,
        "model": model, "targetDuration": 180, "prompt": (WORK / "prompts" / it["prompt"]).read_text(), "recommendedWorldIds": [],
        "styles": it["styles"], "scenarios": ["explain", "motion"],
        "description": {"en": f"{it['note_en']} {GROOVE_EN}", "zh": f"{it['note_zh']}{GROOVE_ZH}"},
        "batch": BATCH, "status": "pending", "rightsProfile": RIGHTS,
        "collections": ["jackie-picks"] if it["picks"] else [],
        "usage": {"narrationFriendly": True, "placement": "background", "tags": ["explainer", "trap", "beat-synced edits"]},
        "duration": round(proc["duration"], 3), "targetEnergy": 4, "energyBasis": "prompt-intent",
        "generatedAt": meta.get("created") or "2026-11-04T15:30:00Z",
        "generation": {"generator": "Google Lyria 3.5" + ("" if it["id"].startswith("pulse-draft") else " (edited)"), "model": model,
                       "api": "Gemini API Interactions", "interactionId": meta.get("id"), "sha256": proc["master"]["sha256"]},
        "loop": {"seamless": False, "basis": "not seam-tested"},
        "metadataBasis": "description, style, tempo, moods and energy are prompt intent; tempo of edited takes measured by beat-grid fit; duration is measured; no automated audio review",
        "assets": {"preview": f"{CDN}/{it['id']}/v1/preview.mp3", "master": f"{CDN}/{it['id']}/v1/{master}",
                   "waveform": f"{CDN}/{it['id']}/v1/waveform.json"},
        "assetIntegrity": {r: {"sha256": sha(out / f), "bytes": (out / f).stat().st_size, "mimeType": m}
                           for r, f, m in [("preview", "preview.mp3", "audio/mpeg"),
                                           ("master", master, "audio/wav" if master.endswith(".wav") else "audio/mpeg"),
                                           ("waveform", "waveform.json", "application/json")]},
    }
    path = TRACKS / f"{it['id']}.json"
    if path.exists() and json.loads(path.read_text()).get("status") == "published":
        return "kept (published)"
    path.write_text(json.dumps(rec, ensure_ascii=False, indent=2) + "\n")
    return f"{rec['duration']:.0f}s"


def publish(it):
    path = TRACKS / f"{it['id']}.json"
    rec = json.loads(path.read_text())
    if rec["status"] == "published":
        return "already"
    subprocess.run(["node", str(ROOT / "music/scripts/upload-track.mjs"), it["id"], "v1"], check=True)
    for role, url in rec["assets"].items():
        if hashlib.sha256(urllib.request.urlopen(url, timeout=120).read()).hexdigest() != rec["assetIntegrity"][role]["sha256"]:
            raise ValueError("CDN hash mismatch " + url)
    rec.update(status="published", verifiedAt=datetime.now(timezone.utc).isoformat())
    path.write_text(json.dumps(rec, ensure_ascii=False, indent=2) + "\n")
    return "published"


if __name__ == "__main__":
    fn = prepare if sys.argv[1] == "prepare" else publish
    for it in items():
        print(it["id"], fn(it), flush=True)
