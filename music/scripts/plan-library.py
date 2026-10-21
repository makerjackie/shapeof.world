#!/usr/bin/env python3
"""Build a deterministic, diverse production manifest; no API calls or publication."""

import argparse
import json
import re
from pathlib import Path

# Each family has a distinct ensemble and compositional grammar, not just a title.
PROFILES = [
    (
        "felt-piano",
        "毡音钢琴",
        "neoclassical felt piano",
        "felt piano, soft cello",
        "spacious broken chords, intimate close room",
        64,
        1,
    ),
    (
        "chamber",
        "室内乐",
        "chamber classical",
        "string quartet, clarinet",
        "interlocking counterpoint and expressive legato",
        86,
        2,
    ),
    (
        "harp",
        "竖琴",
        "pastoral acoustic",
        "concert harp, flute, viola",
        "rolling harp figures and long woodwind answers",
        72,
        1,
    ),
    (
        "minimalism",
        "极简主义",
        "acoustic minimalism",
        "marimba, piano, muted strings",
        "phase-shifted repeating figures with small harmonic changes",
        108,
        2,
    ),
    (
        "organ",
        "管风琴",
        "contemporary organ music",
        "pipe organ, low strings",
        "slow pedal tones and open suspended harmony",
        56,
        2,
    ),
    (
        "orchestral",
        "管弦乐",
        "orchestral adventure",
        "strings, French horn, timpani, flute",
        "rising motifs, dynamic arcs and clear melodic development",
        104,
        4,
    ),
    (
        "jazz-trio",
        "爵士三重奏",
        "acoustic jazz",
        "piano, upright bass, brushed drums",
        "relaxed swing, walking bass and conversational piano",
        96,
        2,
    ),
    (
        "bossa",
        "波萨诺瓦",
        "bossa nova",
        "nylon guitar, shaker, upright bass, electric piano",
        "syncopated guitar chords with gentle Latin groove",
        112,
        2,
    ),
    (
        "cool-jazz",
        "冷爵士",
        "cool jazz",
        "muted trumpet, vibraphone, double bass, brushes",
        "spare melodic answers, extended chords and unhurried swing",
        82,
        2,
    ),
    (
        "gypsy-jazz",
        "吉普赛爵士",
        "acoustic swing jazz",
        "acoustic guitar, violin, upright bass",
        "crisp rhythmic guitar and playful violin phrases",
        144,
        4,
    ),
    (
        "lofi",
        "低保真",
        "lo-fi instrumental hip hop",
        "Rhodes piano, muted drums, warm bass",
        "laid-back swung beat and hazy jazz harmony",
        78,
        2,
    ),
    (
        "soul",
        "灵魂律动",
        "instrumental neo-soul",
        "electric piano, electric bass, clean guitar, drums",
        "pocket groove with syncopated seventh chords",
        88,
        3,
    ),
    (
        "funk",
        "放克",
        "instrumental funk",
        "clavinet, slap bass, tight drums, rhythm guitar",
        "sixteenth-note syncopation with short call-and-response riffs",
        114,
        4,
    ),
    (
        "dub",
        "回声律动",
        "instrumental dub",
        "round electric bass, organ, rimshot, echo guitar",
        "spacious offbeat chords with restrained tape delay",
        76,
        2,
    ),
    (
        "acoustic-folk",
        "原声民谣",
        "fingerstyle acoustic folk",
        "steel-string guitar, mandolin, light hand percussion",
        "alternating bass picking and a clear acoustic melody",
        92,
        2,
    ),
    (
        "celtic",
        "凯尔特",
        "Celtic acoustic instrumental",
        "fiddle, tin whistle, bodhran, harp",
        "lilting compound-meter dance and modal melody",
        108,
        3,
    ),
    (
        "guzheng",
        "古筝",
        "Chinese chamber instrumental",
        "guzheng, xiao, soft wooden percussion",
        "pentatonic melodic arcs, plucked ornament and spacious breath",
        70,
        1,
    ),
    (
        "pipa",
        "琵琶",
        "Chinese plucked-string ensemble",
        "pipa, yangqin, dizi, frame drum",
        "crisp plucked ostinato with bright bamboo-flute answers",
        106,
        3,
    ),
    (
        "koto",
        "筝与尺八",
        "Japanese acoustic instrumental",
        "koto, shakuhachi, soft hand drum",
        "sparse plucked phrases and gentle breathy flute, no voice",
        68,
        1,
    ),
    (
        "oud",
        "乌德琴",
        "Middle Eastern acoustic instrumental",
        "oud, qanun, darbuka",
        "ornamented modal melody with rolling hand-drum rhythm",
        98,
        3,
    ),
    (
        "sitar",
        "西塔琴",
        "Indian acoustic instrumental",
        "sitar, bansuri, tabla, tanpura",
        "gradually unfolding modal melody and intricate tabla",
        90,
        2,
    ),
    (
        "kora",
        "科拉琴",
        "West African acoustic instrumental",
        "kora, balafon, calabash percussion",
        "interlocking plucked patterns and buoyant polyrhythm",
        106,
        3,
    ),
    (
        "gamelan",
        "甘美兰",
        "gamelan-inspired instrumental",
        "metallophones, soft gong, bamboo flute",
        "cyclic interlocking metallic patterns with long gong punctuation",
        80,
        2,
    ),
    (
        "ambient",
        "氛围电子",
        "ambient electronic",
        "analog pads, granular synth, soft sub bass",
        "slow evolving textures without drums or a beat",
        52,
        1,
    ),
    (
        "downtempo",
        "缓拍电子",
        "downtempo electronica",
        "analog bass, soft breakbeat, electric piano, pluck synth",
        "steady restrained broken beat with wide atmospheric space",
        92,
        2,
    ),
    (
        "synthwave",
        "合成器浪潮",
        "instrumental synthwave",
        "analog arpeggiator, synth bass, electronic drums",
        "steady retro pulse with luminous melodic synth phrases",
        110,
        3,
    ),
    (
        "house",
        "浩室",
        "deep instrumental house",
        "warm synth chords, four-on-floor drums, sub bass",
        "consistent dance groove, small filter movement, no large drop",
        122,
        4,
    ),
    (
        "breakbeat",
        "碎拍",
        "melodic breakbeat electronica",
        "breakbeat drums, rounded bass, shimmering synth",
        "syncopated chopped drum rhythm under an evolving melody",
        132,
        4,
    ),
    (
        "chiptune",
        "芯片音乐",
        "melodic chiptune",
        "pulse-wave lead, triangle bass, noise percussion",
        "clear arpeggiated game-like melody and concise rhythmic phrases",
        136,
        3,
    ),
    (
        "post-rock",
        "后摇",
        "instrumental post-rock",
        "clean electric guitars, electric bass, live drums",
        "delay guitar figures and patient layered crescendos",
        96,
        3,
    ),
]
SCENES = [
    (
        "reading",
        "静读",
        "Reading",
        "quiet reading and reflective study",
        "calm, intimate, warm",
        "Keep the arrangement sparse and dynamics even; leave space for thought.",
        60,
    ),
    (
        "focus",
        "专注",
        "Focus",
        "coding, deep work and analytical tasks",
        "focused, steady, precise",
        "Keep a stable repeating texture with very few distracting fills.",
        120,
    ),
    (
        "rest",
        "休憩",
        "Rest",
        "rest, unwinding and breathing exercises",
        "peaceful, soft, spacious",
        "Use a restrained arrangement, soft attacks, no sudden accents.",
        180,
    ),
    (
        "nature",
        "山野",
        "Wildlands",
        "nature documentary, landscape and gentle exploration",
        "organic, open, fresh",
        "Introduce a gently rising motif and a sense of open air.",
        150,
    ),
    (
        "explain",
        "发现",
        "Discovery",
        "science explainer, tutorial and educational narration",
        "curious, clear, thoughtful",
        "Keep the lead sparse and the midrange uncluttered for spoken narration.",
        90,
    ),
    (
        "travel",
        "漫游",
        "Roaming",
        "travel montage, walking and urban exploration",
        "moving, bright, relaxed",
        "Use a forward-moving motif and recurring short instrumental answers.",
        120,
    ),
    (
        "puzzle",
        "线索",
        "Clues",
        "puzzle game, strategy and patient problem solving",
        "curious, playful, precise",
        "Use offset accents and question-and-answer motifs without dramatic shocks.",
        90,
    ),
    (
        "motion",
        "跃动",
        "Motion",
        "exercise, action montage and energetic motion",
        "energetic, driving, determined",
        "Use strong rhythmic articulation and maintain momentum from the first bar.",
        150,
    ),
    (
        "suspense",
        "暗影",
        "Shadows",
        "mystery, nocturnal exploration and restrained suspense",
        "mysterious, tense, nocturnal",
        "Use unresolved suspended harmony, careful space and subtle low-register movement; no jump scares.",
        180,
    ),
    (
        "celebrate",
        "初光",
        "First Light",
        "celebration, positive conclusion and project reveal",
        "hopeful, joyful, uplifting",
        "Introduce a memorable rising motif, develop it, and end with a confident resolved cadence.",
        60,
    ),
]
KEYS = [
    "D major",
    "A minor",
    "F major",
    "D dorian",
    "G major",
    "E minor",
    "C lydian",
    "B minor",
    "G minor",
    "C major",
]


def manifest(batch="library-2026-09", prefix="lib"):
    out = []
    for p, (style, zh, genre, ensemble, grammar, tempo, energy) in enumerate(PROFILES):
        for s, (scene, sz, se, use, moods, arrangement, duration) in enumerate(SCENES):
            bpm = max(48, tempo + [-8, 0, -16, -4, 0, 8, 4, 16, -10, 12][s])
            e = max(
                1, min(5, energy + (-1 if s in [0, 2] else 1 if s in [7, 9] else 0))
            )
            key = KEYS[s]
            rhythm = [
                "a compact three-note motif",
                "an ascending fourth answered by a stepwise descent",
                "a repeating five-note figure with space between phrases",
                "alternating short and long phrases",
                "a descending melody with an upward answer",
            ][(p + s) % 5]
            end = f"{duration // 60:02d}:{duration % 60:02d}"
            mid = duration // 3
            late = duration * 2 // 3
            stamp = lambda n: f"{n // 60:02d}:{n % 60:02d}"
            prompt = f"Create an original {duration} second {genre} instrumental composition for {use}. Mood: {moods}. Instruments: {ensemble}. Style: {grammar}. Tempo approximately {bpm} BPM; {key}. Main idea: {rhythm}. {arrangement} Instrumental only. No vocals, no choir, no humming, no singing, no speech, no lyrics, no vocal samples. Do not imitate any existing artist or melody. [00:00-{stamp(mid)}] Establish the main idea immediately with the core ensemble. [{stamp(mid)}-{stamp(late)}] Develop the motif with a complementary instrumental counterline, preserving the intended energy. [{stamp(late)}-{end}] Return to the main idea and give a musically resolved ending with a short natural tail. Finish around {end}."
            out.append(
                {
                    "id": f"{prefix}-{style}-{scene}",
                    "code": f"{prefix.upper()}-{p + 1:02d}-{s + 1:02d}",
                    "title": {
                        "en": f"{se} — {style.replace('-', ' ').title()}",
                        "zh": f"{sz} · {zh}",
                    },
                    "category": "global",
                    "archetype": "ambient"
                    if e <= 2
                    else "discovery"
                    if e <= 3
                    else "event",
                    "role": "library",
                    "moods": moods.split(", "),
                    "topics": [scene, style],
                    "energy": e,
                    "bpm": bpm,
                    "key": key,
                    "instruments": ensemble.split(", "),
                    "instrumental": True,
                    "model": "lyria-3-pro-preview",
                    "targetDuration": duration,
                    "prompt": prompt,
                    "recommendedWorldIds": [],
                    "styles": [style],
                    "scenarios": [scene],
                    "description": {
                        "en": f"{genre.capitalize()} for {use}; {moods}.",
                        "zh": f"{sz}场景的{zh}纯音乐。",
                    },
                    "metadataBasis": "prompt-intent; duration measured from audio",
                    "batch": batch,
                    "status": "prompt-ready",
                }
            )
    return {"schemaVersion": 1, "batch": batch, "tracks": out}


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--out")
    p.add_argument("--batch", default="library-2026-09")
    p.add_argument("--prefix", default="lib")
    a = p.parse_args()
    if any(
        not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", value)
        for value in [a.batch, a.prefix]
    ):
        p.error("batch and prefix must be lowercase slug ids")
    dest = Path(a.out or f"music/batches/{a.batch}.json")
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(
        json.dumps(manifest(a.batch, a.prefix), ensure_ascii=False, indent=2) + "\n"
    )
    print(f"Wrote 300 independent compositions to {dest}")
