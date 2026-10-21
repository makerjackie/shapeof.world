# Black-hole flyby runtime — sources and notices

Reviewed: **2026-10-18**.

## Shader, tables, noise and rocket — Eric Bruneton

This directory adapts [Eric Bruneton's Black Hole Shader](https://github.com/ebruneton/black_hole_shader),
copyright (c) 2020 Eric Bruneton, **BSD-3-Clause**. The fixed source revision is
[`e72b3f293409893a6fa25528b29572c96fc57f57`](https://github.com/ebruneton/black_hole_shader/tree/e72b3f293409893a6fa25528b29572c96fc57f57)
(2020-11-11). Full licence text is preserved at `LICENSE` beside this file,
`vendor/black-hole-shader/LICENSE` and
`public/assets/oss-source/LICENSE-black-hole-shader.txt`.

The original [official demo](https://ebruneton.github.io/black_hole_shader/demo/demo.html)
is the source of `black_body.dat`, `deflection.dat`, `doppler.dat`,
`inverse_radius.dat`, `noise_texture.png`, `rocket.dat`,
`rocket_base_color.png`, `rocket_normal.png`, and
`rocket_occlusion_roughness_metallic.png`. The project first imported them on
2026-07-17; on 2026-10-18 every restored file was checked byte for byte against
the official hosted demo. Their SHA-256 values are in
`src/components/experiences/worlds/black-hole-flyby/SOURCE.md`.

Local `demo.html` changes provide the same-origin host bridge, bilingual
loading/status messages, touch support, flyby presets and the new `sky/`
background. The restored source subset in `vendor/black-hole-shader/` excludes
the paper directory (including the old sky teaser and external typesetting
files), the separately sourced Khronos RGB9_E5 C helper, the copied Gaia
DR2 instrument passband table `gaia_sky_map/colors.inc`, and the raw CIE table
`color_maps/colors.inc`. Existing BSD demo color lookup tables are retained
as acquired; no new scientific color dataset is imported. The paper is
[referenced](https://arxiv.org/abs/2010.08735), not redistributed here.

Redistribution must retain the BSD copyright, conditions and disclaimer.
Eric Bruneton's name may not be used to imply endorsement.

## Background sky — original procedural generation

The twelve `sky/*.dat` files were generated locally by the Shape of the World
project on 2026-10-18 with `scripts/generate-black-hole-sky.mjs`, seed
**`0x5eeda17c`** (Mulberry32). They use independently sampled star positions,
an authored tilted galaxy band with an off-axis bulge, irregular multi-scale
fractal clouds, and a domain-warped ridged-noise dust network with interrupted
branches. The band exterior stays dark; diffuse light is neutral to cool with
localized warmth. A broad star-brightness distribution includes sparse bright
blue-white and orange stars, with temperatures mapped through the credited
BSD `black_body.dat` table. They depict an imaginary sky, not observed
constellations or measured astronomical objects.

Sparse global brightness statistics and authored interpolation controls set
the radiance curves. Only aggregate scalar statistics are kept from the
historical reference for brightness/occupancy/color calibration; no source
location, tile, photograph,
per-texel transform or spatial derivative is included. Normal regeneration
requires neither a catalogue nor network access. No Gaia DR2, Tycho-2, NASA
Deep Star Maps or other third-party star-map data is shipped or fetched.
The seed, star count, calibration parameters, summary statistics and output
hashes are recorded in
`scripts/black-hole-sky-statistics.json`.

Project software/content terms apply to the project's own work where
applicable; they do not replace Bruneton's BSD terms. The former sky-derived
posters are not reused: preview artwork is captured from this new renderer.

## Model boundary

This is a Schwarzschild (non-rotating) black-hole visualization with curved-ray
lookup tables and relativistic Doppler/beaming effects. The accretion disc is
infinitely thin and simplified. It is neither an observed black hole, a real
sky atlas, a full plasma simulation nor a safe-flight prediction.
