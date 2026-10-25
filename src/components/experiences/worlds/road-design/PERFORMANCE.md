# Performance and derived data

The simulation still runs fixed 1/30 s steps, with the same seed, 240 s warmup,
IDM/MOBIL, conflict controls and OD tables. `scene/traffic.worker.ts` owns it.
Only render poses, trail segments and metrics cross the worker boundary. Transfer
buffers are returned for reuse; the main thread permits one advance request in
flight and retains pending simulation time. Pause freezes the last displayed
packet, including any result that was already in flight. Pressure warmup is a
preparation stage and does not accumulate extra wall time as pending model steps.

Sorted lane-body lookup uses binary search for the same leader/follower and a
linear minimum for the sequential merge guard. A deterministic replay test checks
every vehicle against the previous linear lookup at high demand; no driving
threshold or integration rule is changed.

The worker also constructs the unchanged road meshes, highest-deck texture,
lighting atlas, city layouts and drafting-view geometry. A design switch keeps the previous scene alive
until preparation completes. Vehicle and trail GPU buffers survive the switch.
The initial loading surface reuses the existing desktop/mobile poster.

Vehicle body/cabin/lamp transforms run in vertex shaders, retaining the original
geometry, paint, camera-dependent lamp brightness, brake lamps and indicators.
Trail histories retain the original 15.25 s / 256-point limit. Their age-sorted
prefixes let the shutter change immediately while paused without sending an
extra worker request. Only the visible prefix is uploaded to the GPU.

Readouts remain at 2 Hz outside the memoized Canvas. The adaptive DPR ceiling
remains 1.5 and its floor remains 0.85; a control/readout update must not reset a
DPR value selected by `FrameBudget`. The composer's offscreen targets are also
resized when DPR changes: the installed wrapper only observes CSS size, which
otherwise leaves the costly postprocessing passes at the initial Retina size.
The benchmark records both canvas and postprocessing buffer dimensions. The reduction threshold now leaves headroom
at 57 fps instead of waiting for 52 fps. Recovery requires 20 seconds of stable
headroom and eight seconds without camera input, avoiding buffer reallocation
while dragging. The first two seconds of a view change are excluded only from
this adaptive quality controller: shader/texture preparation and the 1.5-second
camera flight are not steady pixel cost. The benchmark still records those
frames, including every switching stall. Bloom, illumination, geometry and camera
parameters are retained. AO stays at half resolution with the same radius and
strength; its samples are reduced from 16 to 12, denoise samples from 8 to 6.
The `quality` preset is deliberately omitted: the installed wrapper applies it
after explicit samples and would overwrite them. Denoise radius stays at the
previous preset's effective value of 12. Default-framebuffer MSAA is disabled because this scene
renders through the composer's offscreen framebuffer (already multisampling 0).

`ComposerResources` handles retired passes in the installed react-postprocessing
wrapper. Removing a pass does not dispose it, and R3F primitives are externally
owned. Retired EffectPass programs detach their borrowed effects before disposal;
retired n8ao 1.10.3 passes release their owned targets, noise texture and fullscreen
materials. Shared geometry, scene/camera and composer depth remain untouched. A
microtask defers disposal until a pass has had the chance to be re-added in the
same React commit. This compatibility code is covered by real EffectPass and
ownership tests; recheck it when upgrading postprocessing (currently 6.39.3).

`PreparePrograms` requests asynchronous shader linking after the layer-stretch
hooks are installed, using the composer's render target to match the eventual
shader variant. It holds the previous composite until those programs are ready;
it does not synchronously wait for the GPU. First texture uploads and native
framebuffer allocation can still produce initialization tasks, especially with
CPU throttling. Worker pose scheduling retains fractional frame intervals so
16.6/16.7 ms RAF jitter does not reduce a 30 Hz update stream to 20 Hz.

## Regenerate the small runtime data

From the repository root:

```sh
node src/components/experiences/worlds/road-design/prepare-runtime-data.mjs
node src/components/experiences/worlds/road-design/prepare-presentation.mjs
pnpm exec vitest run src/components/experiences/worlds/road-design/performance-data.test.ts
```

`data/huangjuewan-roads.json`, `huangjuewan-terrain.json` and `capacity.json` remain
the auditable inputs. The runtime derivatives are:

- `huangjuewan-runtime.json`: signed millimetre road-coordinate deltas, signed
  centimetre terrain predictor residuals, base64 binary payloads. This preserves
  every source coordinate/elevation exactly; it introduces no further rounding.
  Audit-only node IDs, raw DEM samples and solver records stay in the source data.
  This file is fetched only when Huangjuewan is selected.
- `capacity-display.json`: the two measured capacities and saturation status.
- `presentation.json`: catalogue metadata, measured geometry costs, conflict
  counts and small SVG thumbnail polylines. Thumbnail simplification does not
  affect rendered roads or simulation routes. The consistency tests rebuild all
  14 models and compare every displayed cost/count with the authoritative inputs.

These are derivatives of the same licensed data, not independent measurements;
see [SOURCES.md](./SOURCES.md) and [HUANGJUEWAN-SOURCES.md](./HUANGJUEWAN-SOURCES.md).
Do not replace the original capacity measurement or OSM/DEM audit inputs with
these presentation files.

## Reproduce the benchmark

Use a production build and an exclusively owned preview port. Never launch a
visible browser. Both scripts use headless Chrome/Metal with Playwright's own
temporary profile and close it on exit.

```sh
pnpm exec vite build
pnpm exec vite preview --port 3211 --strictPort
# In a second terminal:
mkdir -p .local
node src/components/experiences/worlds/road-design/measure-performance.mjs .local/perf.json
node src/components/experiences/worlds/road-design/profile-performance.mjs .local/perf-profile
```

The default matrix covers all 14 designs, three samples per state and two device
profiles: 1512×900/DPR 2 and 390×844/DPR 3 with CDP CPU throttling 4. Each drag sample
lasts 2 s plus paired zoom gestures; three samples cover at least 6 s. Options
`--seconds=6`, `--device=mobile`, `--ids=stack,turbine` and `--runs=3` narrow or
extend the matrix. Existing output files resume completed rows; use a fresh file
for an independent run. The maximum-demand/16× state settles for 12 wall seconds
before measurement. Vehicle counts, actual simulation time, DPR and system load
are recorded so unlike workloads can be identified.

CDP page CPU throttling is not a whole-device performance model: this Chrome
version does not slow the dedicated simulation worker by the same factor. Report
worker step time, pending simulation seconds and observed simulation speed
alongside rendering FPS; 60 rendered frames do not imply 60 pose packets, or that
a heavily loaded model always maintains the requested 16× wall-clock rate.

The comparison table is measured while scrolling, without clicking its rows;
clicking a row deliberately closes it and changes the design. The guide is
measured at each of its 14 camera positions; dragging deliberately exits the
shared guide, so those samples do not drag. Ordinary camera samples cover drag
and zoom on the same designs. Main-thread long tasks and RAF interval metrics
are collected without enabling the profiler.

Profiling runs separately because sampling perturbs timing. `?profile=1` enables
`RenderProbe`, reporting main-thread frame callbacks, renderer submission time,
draws, triangles, DPR and asynchronous GPU timer queries when the driver exposes
them. It never calls `gl.finish` or reads pixels. Null GPU timings mean the driver
did not expose that measurement, not zero GPU cost.

For screenshots use the owner's `gpu-shot.mjs`, matching URL, viewport and wait
before/after. Set the CDP `prefers-reduced-motion` media feature to `reduce` for
visual comparisons: both builds then retain the identical seeded 240 s warmup
and default camera. The scored benchmark runs with motion enabled. It defaults to DPR 1; screenshots are visual evidence, not the
Retina/throttled performance samples. Local gzip size measurements are estimates
of download compression; the preview's uncompressed transfer size is not a
Cloudflare production bandwidth measurement.
