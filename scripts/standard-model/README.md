# Standard Model museum data

`snapshot.json` is a small, reviewed offline snapshot for the 17 `ParticleId` values. It was assembled on 2026-09-14 from the PDG REST API's historical `/2024` summaries, with the PDG API documentation warning that every item must be checked before scientific use. The museum describes these energy-equivalent masses as `MeV/c²` or `GeV/c²`; raw API units remain `MeV`/`GeV` and are not silently converted. Uncertainty text, limits, edition, and source URLs are retained as display strings.

The PDG REST API is incidental-access only and rate-limited to fewer than two requests per second. The snapshot is therefore the runtime input; the museum does not call the API from the browser. Run `python3 scripts/standard-model/check-museum-snapshot.py` after edits.

The exporter selects fixed property identifiers (`Q007TP` for the top direct-measurement definition, `S035M` and `S035T` for tau, `S004M`/`S004T` for muon, and the corresponding `*M` entries for masses). PDG responses can report top-level `edition: 2026` while the requested identifier and property rows carry `/2024`; the exporter validates the property identifier suffix and records the requested 2024 endpoint.

`particle==0.24.0` was used in a temporary `.scratch/particle-venv` for offline cross-checking. Reproduction command: `.scratch/particle-venv/bin/pip install 'particle==0.24.0'`; inspected fields were `name`, `pdgid`, `mass`, `mass_lower`, `mass_upper`, and `lifetime` (neutrino masses were `None`). This package's bundled data is not a substitute for the PDG 2024 API and is not shipped or imported by the web app. `DecayLanguage` was evaluated and excluded because no decay-chain field is required by the museum contract.

Rebuild from the retained raw responses, without network access:

```sh
python3 scripts/standard-model/export-museum-snapshot.py --from-raw
python3 scripts/standard-model/check-museum-snapshot.py
```

Omit `--from-raw` only to intentionally refresh the fixed 2024 source responses. Missing raw files, failed responses, wrong identifiers and wrong property editions stop extraction. Acquisition dates come from the retained response timestamps. The checker compares every rendered fact against the fixed-property extraction, rather than merely checking JSON syntax. “Not listed” means that this extract does not provide that property, not that a physical lifetime does not exist. The gluon zero is explicitly a Standard Model prediction; neutrino flavour states are not assigned a single mass.
