# Shape of the World music

Git holds track metadata, production manifests and scripts. Audio binaries and private
runtime records stay in `music/.cache/`; published MP3s and waveforms are served by
`music-cdn.shapeof.world` from R2.

- `tracks/*.json`: source of truth for tracks; only `status: published` is public.
- `batches/*.json`: production requests, not proof that audio exists.
- `taxonomy.json`: stable bilingual style/scenario labels.
- `rights-profiles.json` and `AUDIO_LICENSE.txt`: the licence and per-asset provenance profiles.
  From 2026-11-17 every asset is offered under CC BY-NC 4.0 only (non-commercial, attribution
  "Shape of the World / MakerJackie, CC BY-NC 4.0"); commercial use needs the author's written
  permission. Earlier terms stay in each profile's `history`. The catalog build refuses a profile
  that is not CC BY-NC 4.0.
- `usedIn` on a track: the films that use it (`film` {zh,en}, `urls`, `role` {zh,en}, `date`);
  shown on the track page and card. `scripts/import-ukraine-scores.py` is the example.
- `packs/*.json`: verified scene kits with exact source files and timeline examples;
  mixes and alternate formats are not additional compositions.
- `scripts/plan-library.py`: example diverse production plan (no API calls).
- `scripts/generate-library.py`: resumable generation, full-audio automated review,
  processing and optional verified upload.
- `AGENT_HANDOFF.md`: generated summary, rebuilt with the music catalog.


```sh
python3 music/scripts/generate-library.py --help
pnpm --dir apps/music test
pnpm --dir apps/music build
```

The site publishes `/catalog.json`, `/catalog.ndjson`, `/tracks/{id}.json` and `/llms.txt`
from the same published records used by its player. `/taxonomy.json` links to small
`/styles/{id}.json` and `/scenarios/{id}.json` summaries for agents with limited context. Use the exact URLs in `assets`;
master formats and immutable versions differ between tracks. Do not assume `v1/master.wav`.

Descriptions are bilingual. Style, scenario, BPM and key describe production intent; energy uses the audio reviewer estimate
when available and targetEnergy preserves the request.
`kind` is `music`, `sfx` or `ambience`. `/audio-index.json` provides small type pages
and style links; `/rights.json` exposes the licence and provenance profiles. Every asset has
`rights.commercialUse === false` (CC BY-NC 4.0). `/sounds`, `/ambience`
and `/games` share the same playback and retrieval source. Designed natural sounds
are clearly labeled synthesis, not field recordings.

`duration` is measured, `targetDuration` is requested, and `audioReview` records model-inferred
properties and full-audio checks. Automated review is not human listening. A fade-out is not
proof of a seamless loop. `loop.asset` names the actual verified loop download;
its measured duration may differ from the preview. Lyria loop WAVs are decoded
and edited MP3 sources, not lossless originals. Generated provenance does not imply
blanket third-party licensing. Preserve `assetIntegrity` with project downloads.
