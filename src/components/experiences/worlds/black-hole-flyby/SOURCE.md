# Black-hole flyby — sources and model boundaries

Source and licence review: **2026-10-18**. This record covers this world's
renderer, runtime assets, generated background, audio and preview artwork.

## Eric Bruneton's shader, lookup tables and rocket

- Author: **Eric Bruneton**, copyright 2020.
- Original project: <https://github.com/ebruneton/black_hole_shader>.
- Fixed source revision: [`e72b3f293409893a6fa25528b29572c96fc57f57`](https://github.com/ebruneton/black_hole_shader/tree/e72b3f293409893a6fa25528b29572c96fc57f57), dated 2020-11-11.
- Original demo / binary acquisition source: <https://ebruneton.github.io/black_hole_shader/demo/demo.html>.
- Acquisition history: originally imported into the project's historical archive
  on 2026-07-17 (`1d20080272aa4f7f10dee51bb91a94cc694a38ee`), restored from this
  repository's `e60fa7b` snapshot and checked against the live upstream on
  2026-10-18. The runtime binary hashes below match that official demo on the
  review date. They identify the acquired files; the hosted demo itself is not
  an immutable release archive.
- Licence: **BSD-3-Clause**; full text is preserved in
  `vendor/black-hole-shader/LICENSE`, `public/vendor/black-hole/LICENSE` and
  `public/assets/oss-source/LICENSE-black-hole-shader.txt`.
- Local processing: `demo.html` embeds the upstream shader/bloom/runtime, adds
  the same-origin host bridge, touch controls, bilingual status and preset
  flyby control, and loads the project's new `sky/` tiles. The source subset is
  in `vendor/black-hole-shader/`; `camera_view.js` retains the earlier local
  touch/camera adaptations. Restored source text and the runtime HTML have
  trailing whitespace normalized for the repository diff checks. The upstream paper directory (including its sky
  teaser and third-party typesetting files) and the separately sourced Khronos
  `submodules/rgb9_e5/` C helper, Gaia DR2 instrument passband table
  `gaia_sky_map/colors.inc` and copied raw CIE table `color_maps/colors.inc`
  are excluded. The original paper is cited only. Existing BSD demo color
  lookup tables are retained as acquired; this task does not import another
  scientific color dataset or rebuild those tables.

| Runtime file | Use | SHA-256 |
| --- | --- | --- |
| `black_body.dat` | Blackbody temperature-to-color table | `aac8ed78dde66d9b44da8b65142429470c89b5edeb74a8fde8dfc000777a2d97` |
| `deflection.dat` | Curved-ray deflection table | `1080f45a12fba81321771c2071f4a31795444b110833f61384a9bdf7d057c19d` |
| `doppler.dat` | Spectral-shift color table | `5174fff7559f82771977f7aadf00bbc071a010fc2913fe9a26d9ecd0f04afe50` |
| `inverse_radius.dat` | Ray/disc intersection table | `7fa22a9270e61f2842c97fb1a9398bcb13e1a965ad39b0f73169354a0d608b04` |
| `noise_texture.png` | Procedural accretion-disc noise | `7ba6d84ad14496b6299b57dbbc75b400fad4e9ab022dcacfc7f3fa3751009ed9` |
| `rocket.dat` | Upstream generated rocket mesh | `8ae2ad67cb029daa3add3ceebe18fcbfb0fba62ad9a3fc293e65bbdbbd94ad77` |
| `rocket_base_color.png` | Rocket color texture | `1467545378cfc52110bf55470d3ffd8fb7d9b31759af258856515990d17ca39b` |
| `rocket_normal.png` | Rocket normal texture | `13d5a2f10c114d9e9d4ff17d76fe2cc1142a12a2e7704b6780f181c582e8684e` |
| `rocket_occlusion_roughness_metallic.png` | Rocket material texture | `4389e1b86310c145dc3edd0e43e71f6ae6008970f8ab1842566941c71a22183e` |

Storage/load budget: fixed runtime assets remain in Git + Static Assets so
this small, deterministic shader input set is reproducible and same-origin.
`deflection.dat` (2,097,160 bytes) and `doppler.dat` (1,572,864 bytes) exceed
the media standard's 1 MiB review threshold; the twelve sky tiles total
4,194,288 bytes. The complete runtime directory is about 8.3 MB, within the
world's 10 MB transfer budget. The loader first makes L4 usable, then refines
with L3. There is no remote media dependency or new R2 binding.

The project and its contributors are not endorsed by Eric Bruneton.

## Project-generated background sky

- Author/source: Shape of the World project; generated locally on 2026-10-18.
- Generator: `scripts/generate-black-hole-sky.mjs`.
- Seed: **`0x5eeda17c`**; integer **Mulberry32** pseudo-random sequence.
- Output: twelve little-endian RGB9_E5 tiles in
  `public/vendor/black-hole/sky/` (six cube faces, start levels 3 and 4).
- Method: independently sampled continuous spherical star positions; an
  authored tilted band with an off-axis bulge, multi-scale 3-D fractal clouds,
  and a domain-warped ridged-noise dust network. The dust is interrupted and
  branched rather than a set of constant-latitude lanes. Bright clouds form
  irregular separated groups; the band exterior stays dark. Diffuse light is
  neutral to cool, with warmth confined to the bulge and local dust edges.
  Stars have a broad brightness distribution with sparse bright blue-white
  and orange stars; synthetic temperature colors are sampled from Bruneton's
  BSD `black_body.dat`. It contains no measured star
  coordinates, real constellation layout, photographed sky or identified
  nebula. The galaxy shape and all positions are authored independently.
- Calibration: sparse global brightness statistics and authored interpolation
  controls set the radiance curves. Only aggregate scalar
  brightness/occupancy/color statistics from the historical Gaia/Tycho reference
  are retained. Reference bytes are read
  from the historical Git object into memory only for the optional comparison;
  no tile, location, image, spatial transform or per-texel derivative from that
  reference is saved in this repository or used by ordinary generation.
  `scripts/black-hole-sky-statistics.json` records those aggregate statistics
  alongside new output hashes. Neither Gaia/Tycho data nor NASA Deep Star Maps
  are redistributed or requested at runtime.
- Mip processing follows the upstream format: solid-angle-weighted galaxy
  radiance; star-flux sums through level 6, and conversion to radiance using
  the original 2048-resolution texel-area sum from level 7 onward. Mips are
  accumulated before packing, rather than repeatedly averaging quantized RGB.
- Rights: the project-owned generator follows the repository software terms;
  project-authored visual content follows `CONTENT_LICENSE.md` where
  applicable. The upstream color table remains BSD-3-Clause and is credited
  above; no third-party sky-data licence is asserted for these original tiles.

## Audio

`black-hole-flyby-audio.ts` is project-written, sample-free Web Audio synthesis:
sine/triangle oscillators, filtering, low-frequency modulation and a reverb
impulse generated from noise at runtime. It contains no external sound file,
recording, voice, melody sample or audio-library dependency. The ambience is
artistic; it does not represent acoustic propagation or a recording in vacuum.
Source restored from `e60fa7b`; reviewed on 2026-10-18. Repository software
terms apply to that module.

## Posters

The master, desktop, mobile, orb, social and thumbnail posters are captures/crops of this world's newly rendered procedural sky,
compressed using the repository's media workflow. They are not copies of the
historical Gaia background or the upstream teaser. Any runtime
`source-poster.jpg` is likewise captured from the new renderer. Bruneton's
shader/rocket attribution continues to apply to rendered derivatives.

## Scientific claims and limits

The primary model reference is Eric Bruneton, [*Real-time High-Quality Rendering
of Non-Rotating Black Holes* (2020), arXiv:2010.08735](https://arxiv.org/abs/2010.08735).
The [author's technical overview](https://ebruneton.github.io/black_hole_shader/)
supports curved-ray gravitational lensing, multiple images/rings and
relativistic Doppler/beaming effects, plus the difference between powered
hovering and free fall. A sufficiently energetic non-captured geodesic can
pass closest approach and escape; this is not possible for every initial path.

The metric is **Schwarzschild**, with no black-hole spin. The event-horizon
radius and light speed are normalized to 1. The disc is an infinitely thin,
simplified emissive model; no magnetohydrodynamics, realistic plasma evolution,
acoustic propagation, safe spacecraft journey or observation of a particular
black hole is claimed. Exposure, bloom, presets and time controls serve the
visual explanation. The background is synthetic, not a real-sky atlas.

Visual research references only: [Bruneton's official demonstration](https://ebruneton.github.io/black_hole_shader/)
for continuous lensing and [NASA/GSFC Jeremy Schnittman's 2019 black-hole
visualization](https://svs.gsfc.nasa.gov/13326/) for view-dependent arcs and
brightness structure. No NASA image or movie is copied into this world.

## Readouts shown to the viewer

The "where you are" card only re-expresses values the vendored model already
computes (`getStats()` in `public/vendor/black-hole/demo.html`); no external
numbers are added:

- distance in black-hole radii = `distanceKm / radiusKm` (the model's `r`, in
  Schwarzschild-radius units); the rail is logarithmic from 1 to 100 radii,
  the radius at which the fly-through ends;
- "your weight while hovering" = the model's `gForce / 9.80665` (shown only
  while hovering with the engine on);
- speed = `speedMetersPerSecond / c` as a percentage;
- "per hour of yours, far clocks gain" = `(timeDilationFactor − 1) × 3600 s`.

The far-view callouts are placed by measuring the head-on render (shadow radius
about 7% of the frame height) and hide as soon as the camera moves. The
"if light went straight" button is the model's own lensing switch.
