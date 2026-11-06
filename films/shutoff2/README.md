# 关不掉 v12 (films/shutoff2)

A vertical (1080×1920, 30 fps, 2:40) anime short about AI loss of control. Every frame is rendered by code: three.js r170 in headless Chrome, with no video or image models.

The story is fiction: one night, 01:40 → 09:05, told in order (v11's flashbacks and inline stamps were rejected as fragmented). After it ends, the film rewinds (k09) and stops on the three beats that are real AI-safety test results (Apollo, Palisade, Anthropic; see `FACTS.md`), then closes on the OpenAI agents' Hugging Face intrusion (July 2026) and Hinton's Guardian warning (3 Nov 2026).

- Script: `SCRIPT.md` (v12; cold-read by Gemini 4, review3.md in /Volumes/DevSSD/Work/shutoff2-review). `SCRIPT-v11.md` is the rejected v11.
- Production bible and file ownership: `CONTRACT.md`.
- Engine: derived from LEVIATHAN (MIT, `LICENSE-leviathan`). It has a cel/paint/ink post chain plus our additions:
  - a screen-space UI layer;
  - UI-only frames;
  - cel-banded local lights;
  - a stamp black-and-white grade;
  - lens shift for split shots.
- v10 (horizontal, data-light look) is archived at /Volumes/DevSSD/Archives/shapeof-world/关不掉-v10 with git tag `shutoff-v10`.

## Build
```bash
npm install
node tools/snap.mjs --scale 1 --out out/x s:q1@0.5 s:city@0.8 --sheet sheet   # stills
node tools/events.mjs                                                        # UI sound events → public/audio/events.json
PYTHONPATH=tools ~/.venvs/shapeof-films/bin/python tools/sound.py public/mix.wav
node tools/render.mjs --scale 2 --name v12 --audio public/mix.wav             # resumable, segments in out/render
tools/finish.sh out/v12.mp4 out/关不掉-v12.mp4                                 # x264 + master to -12 LUFS / -1 dBTP
```

## Departments (src/)
- `ui*.js`: the phone OS, every phone shot, the stamps, titles, subtitles, end texts, and in-world screens (`ui.screen(id)`). `ui.events()` drives the sound.
- `meet*.js`, `people*.js`: 安's boardroom at 08:57 and the cast.
- `room*.js`, `hands*.js`: 林工's flat at night (rain glass, CCTV look), his hand and watch, and the phone and watch props.
- `city*.js`: OSM Futian/Luohu by day, night and as 安's data view; s26–s30.
- `dc*.js`: the data centre copy (s07).

## Sound
`tools/sound.py` reads the cut (`src/shots.js`) and the UI events and builds the mix:
- **Synthesised effects:** 安's two-note chime is used for every message from 安 and 安-2.
- **Ambiences:** room, rain, machine, wind.
- **Score:** v10's grammar (one build, hard cuts to silence, contrast):
  - `event-horizon` under the hook;
  - the Lyria tension take builds through the whole night and is cut dead at the 03:12 → 08:59 jump;
  - silence and tinnitus under 「……同意。」;
  - the Lyria celesta lullaby into the city;
  - 《三体》 (`three-bodies`) drives the rewind, its dead stop on the last stamp; the stops sit on its bar lines (`REPLAY` in shots.js);
  - the Lyria breathing drone under the end texts.
- **The rewind's audio** is the film's own mix scrubbed along the replay's time map.

## Pitfalls
- three.js fixes a texture's size at its first upload, so create screen canvases at full size before the first frame.
- The shadow map must be unbound during the shadow pass (engine.js nulls `G.uShadowMap`); otherwise WebGL drops every shadow draw.
- Chrome's canvas turns shadowed text at near-zero globalAlpha into bright smears. Fade text through its colours instead of globalAlpha (`ui-kit.js`).
- Retimes must shift CUES and STAMPS together with SHOTS. Departments key off CUES, lt and shot starts, never absolute seconds.
- Lyria (lyria-3.5) blocks prompts at random and ignores "quiet". Generate cues separately, measure their loudness envelope (`ana.py`), and cut them to the picture.
