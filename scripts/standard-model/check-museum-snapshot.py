#!/usr/bin/env python3
"""Check the small, hand-reviewed Standard Model museum snapshot."""
import json
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT = ROOT / "src/components/experiences/worlds/standard-model/museum-data/snapshot.json"
IDS = {"u", "d", "c", "s", "t", "b", "e", "mu", "tau", "ve", "vmu", "vtau", "gamma", "gluon", "w", "z", "higgs"}

def main() -> int:
    raw = SNAPSHOT.read_text(encoding="utf-8")
    data = json.loads(raw)
    records = data.get("records", {})
    assert set(records) == IDS, f"ParticleId coverage mismatch: {set(records) ^ IDS}"
    assert data["edition"] == "2024"
    for pid, record in records.items():
        for key in ("mass", "massEn", "lifetime", "lifetimeEn", "sourceUrl", "edition"):
            assert isinstance(record.get(key), str) and record[key], f"{pid}.{key} missing"
        assert record["sourceUrl"].startswith("https://pdg"), f"{pid} source is not PDG"
        if pid in {"ve", "vmu", "vtau"}:
            assert "Not listed" in record["massEn"] and "质量" in record["mass"]
    spec = importlib.util.spec_from_file_location("exporter", ROOT / "scripts/standard-model/export-museum-snapshot.py")
    exporter = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(exporter)
    for pid, pdgid in exporter.PARTICLES.items():
        source = json.loads((SNAPSHOT.parent / "raw" / f"{pid}.json").read_text())
        if pdgid:
            assert source.get("status_code") == 200, f"{pid}: failed source"
            assert source.get("pdgid") == f"{pdgid}/2024", f"{pid}: wrong PDG identity"
        assert exporter.record(pid, pdgid, source) == records[pid], f"{pid}: snapshot differs from raw-source extraction"
    assert records["u"]["sourceUrl"].endswith("Q002/2024")
    assert records["d"]["sourceUrl"].endswith("Q001/2024")
    assert records["tau"]["sourceUrl"].endswith("S035/2024")
    assert "Direct" not in records["t"]["massEn"] and "direct reconstruction" in records["t"]["noteEn"]
    print(f"OK: {len(records)} records, PDG Review {data['edition']}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
