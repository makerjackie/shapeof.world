#!/usr/bin/env python3
"""Reproduce the offline CMS record 700 dimuon histogram from a local CSV.

This script intentionally has no network/download path. Obtain the CSV from
the CERN Open Data record manually, then pass its local path with --input.
"""
import argparse
import csv
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT = ROOT / "src/components/experiences/worlds/standard-model/evidence/dimuon-spectrum.json"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="local MuRun2010B.csv; the script never downloads it")
    parser.add_argument("--snapshot", type=Path, default=SNAPSHOT, help="fixed JSON to check (defaults to the repository extract)")
    args = parser.parse_args()
    expected = json.loads(args.snapshot.read_text(encoding="utf-8"))
    digest = hashlib.sha256()
    bins = [0] * len(expected["bins"])
    rows = 0
    with args.input.open("rb") as raw:
        for chunk in iter(lambda: raw.read(1024 * 1024), b""):
            digest.update(chunk)
    actual_sha256 = digest.hexdigest()
    if actual_sha256 != expected["provenance"]["sha256"]:
        raise SystemExit(f"FAIL: sha256 {actual_sha256} does not match snapshot {expected['provenance']['sha256']}")
    with args.input.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames or "M" not in reader.fieldnames:
            raise SystemExit("FAIL: CSV has no M invariant-mass column")
        for row in reader:
            try:
                mass = float(row["M"])
            except (TypeError, ValueError) as error:
                raise SystemExit(f"FAIL: invalid M value on row {rows + 2}: {error}") from error
            rows += 1
            index = int((mass - expected["min"]) / expected["binWidth"])
            if 0 <= index < len(bins):
                bins[index] += 1
            else:
                raise SystemExit(f"FAIL: mass {mass} lies outside [{expected['min']}, {expected['max']})")
    if rows != expected["eventCount"]:
        raise SystemExit(f"FAIL: counted {rows} rows, expected {expected['eventCount']}")
    if bins != expected["bins"]:
        raise SystemExit("FAIL: recomputed bins differ from snapshot")
    print(f"OK: {rows} rows, {len(bins)} bins, sha256={actual_sha256}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
