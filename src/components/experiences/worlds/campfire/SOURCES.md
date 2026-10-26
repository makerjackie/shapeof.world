# Campfire — sources and model contract

## Engine and license

[procedural-fire](https://github.com/Leonxlnx/procedural-fire), Leon Lin, commit
`95ab0a9003e20f1b0a5556ac14b401dfa0a37596`, MIT © 2026 Leon Lin.
The complete notice remains in `engine/LICENSE`. Vendored JS preserves upstream filenames so patches can be compared directly. The surrounding application remains AGPL-3.0; the MIT engine keeps its own notice.

Copied runtime modules: `sim`, `renderer`, `gpu`, `noise`, `camera`, `scene`, `blackbody`, `sparks`, `shaders/*`, `audio/{engine,worklet,fire-dsp}`. No upstream server, capture, Puppeteer or offline mastering tools enter the website.

Local engine patches:

- `renderer.js`: destroy per-resize uniform buffers before replacing render targets.
- `gpu.js`: suppress the expected `device.lost` error on explicit destruction (React unmount / StrictMode).
- `audio/engine.js`: bundle the worklet and its DSP import with Vite `?worker&url` in production; use its module URL during development because Vite's development Worker wrapper uses `importScripts`, which is unavailable inside an AudioWorklet.

`runtime.js` is a separate host adapter: lifecycle/disposal, touch orbit and pinch, actual simulation timestep scaling, startup preroll, adaptive pixel resolution, sound gesture, and the GPU section/probe. It uses upstream real-time medium/low grids and `tools/render_final.mjs`'s `FINAL` source/laminar/render parameters. These are visual calibration parameters, not new chemistry. The upstream combustion equations are unchanged.

`section.js` samples original fields on the GPU. A probe reads five trilinear local stencils into an 80-byte buffer (one in flight, normally ≤9 reads/s). It never copies the whole volume to the CPU. Section colors are independent of the camera's flame tone mapper. Switching to natural color preserves the plane and probe; the natural image integrates a ray and is not a unique voxel measurement.

## Channel contract (verified against `sim.js`, not only upstream DESIGN.md)

Domain: 1.2 × 1.8 × 1.2 m; origin (−0.6,0,−0.6), y up. Medium grid 80×120×80, h=0.015 m; low 64×96×64, h=0.01875 m. All five textures are `rgba16float`.

| Texture / channel | Stored meaning | Unit / displayed conversion | Qualification |
|---|---|---|---|
| S.r | θ, gas temperature above ambient divided by 1000 | T = 293 + 1000θ K; °C = K − 273.15 | Post-cooling temperature; no solid-wood temperature |
| S.g | f, lumped pyrolysis fuel | dimensionless, nominal mass fraction; display ×100 % | No individual CH₄/H₂/CO concentrations |
| S.b | soot volume fraction | ppm; ×10⁻⁶ gives volume fraction | Reduced soot model, not particles or a species mechanism |
| S.a | q / 10⁴, combustion temperature increment / dt | ×10⁴ K/s | Pre-radiative-cooling increment, capped by 2100 K. Not W/m³ or whole-fire kW |
| S2.r | P, products **plus source inert gas** | dimensionless carrier fraction | Includes imposed source dilution; decays numerically. Not a CO₂ fraction |
| S2.g | fuel-derived gas age weighted by Z=f+P | stored Z·s; age = channel/Z for Z>10⁻⁴ | Age clamped to 4 s; fresh ambient has no defined age |
| S2.b | M, organic smoke tracer | model units | DESIGN suggests 100 mg/m³ units, but source/decay in code are not mass-calibrated; do not display that as measured concentration |
| S2.a | coal-bed CO-like fuel tag | dimensionless 0–1 | Inhibits soot; not an independently conserved CO concentration. DESIGN's tar interpretation is stale |
| vel.rgb | projected velocity vector | m/s | Magnitude displayed; vectors projected onto section for arrows |
| vel.a | 0 after projection | none in final vel | Expansion φ is in intermediate velX.a, s⁻¹; final vel.a is **not** divergence |
| vort.rgb | half central velocity differences in cell index space | divide xyz by h to obtain curl, s⁻¹ | From advected velocity **before** sources/forces/projection |
| vort.a | length of stored curl vector | divide by h, s⁻¹ | For a point, we interpolate xyz then take length; not interpolate precomputed magnitudes |
| geo.r | hot log pyrolysis-band weight | dimensionless | Cached source geometry |
| geo.g | coal-bed weight | dimensionless | Not coal temperature or mass |
| geo.b | solid-log mask | 0 / 1 (interpolated at probe) | >0.5 is hatched and gas readouts withheld |
| geo.a | closest modified log signed distance | m | Negative inside; rendering SDF detail differs from simulation capsules |

Derived quantities:

- Available air `o = clamp(1 − f − P,0,1)`. This is the **air carrier**, not O₂ fraction. An explicitly labeled approximation is `Y_O2 ≈ 0.232 o`, assuming fresh air's oxygen mass fraction. Do not confuse mass fraction with the roughly 21% mole fraction.
- Upstream `main.js profile()` estimates a thermal power density `(354800/T) q` W/m³. This is an ideal-gas ρcp proxy using post-cooling T, not a chemical HRR measurement. It is not exposed as measured kW in this round.
- Source and cooling scalars are calibrated graphical approximations. Fuel, P and soot have imposed dissipative terms. There is no full conserved-species chemistry, solid conduction/pyrolysis evolution, depletion, water, detailed radiation transport, or molecular diffusion.
- Actual soot age gate is **15–50 ms**, temperature gate **1000–1400 K**. The 20–60 ms / 1300–1800 K ranges in DESIGN are an earlier proposal. `heatOut=7700 K`, `rs=4.7`, `ignT=550 K`, `kMix=30 s⁻¹`. Defaults use a constant-density projection with an expansion source and McCaffrey-inspired buoyancy. Calling it a validated variable-density fire prediction code would overstate it.
- 60 kW, 0.6 m flame height and 1.94 Hz are upstream design targets. They have not been independently validated as simultaneous measured properties of this interactive configuration. No UI counter fabricates them.

## Scientific and design references

- [McCaffrey 1979, NBSIR 79-1910](https://nvlpubs.nist.gov/nistpubs/Legacy/IR/nbsir79-1910.pdf): buoyant diffusion-flame profiles; upstream buoyancy calibration, not proof of our solver's validation.
- [Xia & Zhang, 2018](https://arxiv.org/abs/1803.10400): vortex dynamics and flicker scaling; reserved for the later measurement panel.
- [Nguyen, Fedkiw & Jensen 2002](https://graphics.stanford.edu/papers/fire-sg02/): physically based fire animation lineage.
- [NIST Smokeview](https://pages.nist.gov/fds/): established field slices and vectors; a research comparator, no code/assets copied.
- [Smith & van der Walt, Inferno](https://github.com/BIDS/colormap/blob/master/colormaps.py): CC0/public-domain color values, five-stop interpolation for temperature and heating. Cool sequential map is project-authored. Five-stop interpolation is an approximation of Inferno, not its full 256-entry map.

Visuals, sparks and audio are generated by the engine; no external texture or audio samples. Poster derivatives come from the upstream MIT preview. A silent loop, when supplied through `/assets/campfire/campfire-loop.mp4`, is rendered from this same engine and supplied separately as a binary asset. Browser feature detection requires both WebGPU and the formats/filtering features the upstream renderer uses; browser brand alone is insufficient.
