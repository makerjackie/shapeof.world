#!/usr/bin/env python3
"""Fetch and export the small Standard Model museum snapshot from PDG 2024.

This has no numeric fallback. Failed or mismatched responses stop extraction;
only absent properties in a verified response are shown as Not listed.
"""
import json
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "src/components/experiences/worlds/standard-model/museum-data"
RAW = OUT / "raw"
API = "https://pdgapi.lbl.gov/summaries/{}/2024"
PARTICLES = {
    "u": "Q002", "d": "Q001", "c": "Q004", "s": "Q003", "t": "Q007", "b": "Q005",
    "e": "S003", "mu": "S004", "tau": "S035", "ve": "S066MNE", "vmu": "S066MNM", "vtau": "S066MNT",
    "gamma": "S000", "gluon": None, "w": "S043", "z": "S044", "higgs": "S126",
}
PROPERTY_IDS = {
    "u": "Q002M", "d": "Q001M", "c": "Q004M", "s": "Q003M", "t": "Q007TP", "b": "Q005M",
    "e": "S003M", "mu": "S004M", "tau": "S035M", "ve": "S066MNE", "vmu": "S066MNM", "vtau": "S066MNT",
    "gamma": "S000M", "w": "S043M", "z": "S044M", "higgs": "S126M",
}
LIFETIME_IDS = {"mu": "S004T", "tau": "S035T"}

def fetch(pdg_id: str | None) -> dict:
    if pdg_id is None:
        return {"status_code": 0, "status_message": "No applicable PDG summary identifier for a massless gauge field", "request_url": "https://pdg.lbl.gov/2024/listings/particle_properties.html"}
    url = API.format(pdg_id)
    try:
        with urlopen(url, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        try:
            return json.loads(body)
        except json.JSONDecodeError:
            return {"status_code": exc.code, "status_message": str(exc), "request_url": url}
    except (URLError, TimeoutError) as exc:
        return {"status_code": 0, "status_message": str(exc), "request_url": url}

def values(data: dict, pid: str) -> tuple[str | None, str | None]:
    """Return mass and lifetime display strings from actual PDG properties."""
    props = data.get("summaries", {}).get("properties", [])
    mass = lifetime = None
    for prop in props:
        desc = prop.get("description", "")
        expected = {PROPERTY_IDS.get(pid), LIFETIME_IDS.get(pid)}
        if prop.get("pdgid", "").split("/")[0] not in expected:
            continue
        assert prop["pdgid"].endswith("/2024"), "Wrong property edition"
        entries = prop.get("pdg_values", [])
        if not entries:
            continue
        value = entries[0]
        text = value.get("value_text")
        if not text:
            continue
        text = text.replace("+-", " ± ").strip()
        unit = value.get("unit")
        if unit in {"eV", "MeV", "GeV"} and "mass" in desc.lower():
            unit = f"{unit}/c²"
        display = f"{text} {unit}" if unit else text
        if value.get("confidence_level"):
            display += " (%g%% CL)" % value["confidence_level"]
        if "mass" in desc.lower() and "atomic mass" not in desc.lower() and mass is None:
            mass = display
        elif ("MEAN LIFE" in desc or "LIFETIME" in desc) and lifetime is None:
            lifetime = display
    return mass, lifetime

def record(pid: str, pdg_id: str, data: dict) -> dict:
    mass, lifetime = values(data, pid)
    unavailable = data.get("status_code") != 200 or (mass is None and lifetime is None)
    if pid in {"ve", "vmu", "vtau"}:
        mass_zh = "未列出（味态不是质量本征态）"
        mass_en = "Not listed (flavour state is not a mass eigenstate)"
        note_zh = "PDG 的味态不能作为单一质量值展示。"
        note_en = "A PDG flavour state is not a single mass eigenstate."
    elif pid == "gluon":
        mass_zh, mass_en = "0（标准模型理论值）", "0 (Standard Model prediction)"
        note_zh = "胶子在标准模型中无质量；不能把禁闭中的胶子当作可自由测量的稳定粒子。"
        note_en = "Gluons are massless in the Standard Model; confinement prevents treating one as a freely measurable stable particle."
    elif pid == "gamma":
        mass_zh = f"{mass}（实验上限；理论上为零）" if mass else "未列出"
        mass_en = f"{mass} (experimental upper limit; theoretically zero)" if mass else "Not listed"
        note_zh = "实验上限与标准模型中的无质量理论状态分开标注。"
        note_en = "The experimental upper limit is kept separate from the massless Standard Model state."
    else:
        mass_zh = mass or "未列出"
        mass_en = mass or "Not listed"
        note_zh = "" if mass else "PDG 2024 API 未返回可用质量值。"
        note_en = "" if mass else "The PDG 2024 API returned no usable mass value."
    if pid == "t":
        note_zh = "直接重建测量的质量参数；不等同于截面法提取的极点质量或 MS-bar 质量。"
        note_en = "Mass parameter from direct reconstruction; distinct from a pole or MS-bar mass extracted from cross sections."
    elif pid in {"u", "d", "s"}:
        note_zh = "MS-bar 方案，重整化尺度 2 GeV；CL 表示置信水平。"
        note_en = "MS-bar scheme at a renormalization scale of 2 GeV. CL denotes confidence level."
    elif pid in {"c", "b"}:
        note_zh = "MS-bar 方案，在该夸克自身质量尺度定义。"
        note_en = "MS-bar mass defined at the scale of the quark mass itself."
    return {
        "mass": mass_zh,
        "massEn": mass_en,
        "lifetime": lifetime or "未列出",
        "lifetimeEn": lifetime or "Not listed",
        "sourceUrl": API.format(pdg_id) if pdg_id else "https://pdg.lbl.gov/2024/listings/particle_properties.html",
        "sourceStatus": "parsed" if not unavailable else "unavailable",
        "edition": "PDG Review 2024",
        "note": note_zh,
        "noteEn": note_en,
    }

def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    RAW.mkdir(parents=True, exist_ok=True)
    records = {}
    for pid, pdg_id in PARTICLES.items():
        raw_path = RAW / f"{pid}.json"
        data = json.loads(raw_path.read_text(encoding="utf-8")) if "--from-raw" in sys.argv else fetch(pdg_id)
        if pid != "gluon":
            assert data.get("status_code") == 200, f"Failed source: {pid}"
            assert data.get("pdgid") == f"{pdg_id}/2024", f"Wrong identity: {pid}"
        raw_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        records[pid] = record(pid, pdg_id, data)
        if "--from-raw" not in sys.argv:
            time.sleep(0.6)  # PDG documents <2 REST requests/second.
    snapshot = {
        "schemaVersion": 2,
        "generatedAt": max(json.loads(p.read_text()).get("request_timestamp", "")[:10] for p in RAW.glob("*.json")),
        "edition": "2024",
        "source": "https://pdgapi.lbl.gov/doc/restapi.html",
        "license": "CC BY 4.0",
        "extraction": "scripts/standard-model/export-museum-snapshot.py",
        "records": records,
    }
    (OUT / "snapshot.json").write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(records)} records and {len(records)} raw PDG responses to {OUT}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
