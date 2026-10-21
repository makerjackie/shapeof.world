# Neural Canvas precomputed replay

- Source: https://huggingface.co/spaces/Xenova/fruit-fly-simulation/tree/776d115ee5aa934578a87fd6d260d138084f59c1
- Fixed revision: `776d115ee5aa934578a87fd6d260d138084f59c1`.
- Downloaded 2026-09-13. Original application files use MIT (adjacent LICENSE), not the Space metadata's broader Apache label. Forward kinematics retains its separate MIT licence in `scripts/vendor/flybody-xenova/body/LICENSE`.
- Measured MaleCNS v1.0 connectivity: FlyEM / HHMI Janelia, University of Cambridge, MRC LMB, Google Research, CC BY 4.0, https://male-cns.janelia.org/download/ and https://creativecommons.org/licenses/by/4.0/ .
- NeuroMechFly/FlyGym geometry: Apache-2.0; see BODY-LICENSE and BODY-NOTICE. Geometry converted from upstream STL to welded GLB; materials changed. Segments retain upstream names, mm units and mirror convention.
- These are **new offline computations of the pinned upstream model**, not already published experimental recordings. No neural weights were trained for this integration.
- `scripts/build-flybody-replay.mjs <download-root>` verifies every connectivity chunk against the upstream manifest. Source requires `public/data/*` and `body-model.json` from `public/body/assets/model.json`.
- `scripts/build-flybody-replay-mesh.mjs <download-root>` converts corresponding STL assets.
- 166,700 cells, 25,582,938 directed edges, seed 1, dt 0.1 ms. Each record has 250 ten-ms samples. Input begins at 200 ms. Walking uses bilateral LC9 with the upstream paint envelope; turns use same-side LC9 + DNa02 and the upstream turn envelope. Sign convention is the actual data manifest / neuron row, not the stale `public/model.json` sign summary.
- Each frame stores six descending readout rates, velocity, yaw rate, yaw, x, z and height; poses store all 69 segment transforms. Sparse activity stores dataset body ID and spike count per 10 ms, for all fired cells shared with the existing anatomical atlas. No activity selected by visual proximity; no fabricated firing.
- The browser interpolates translation/quaternion, replays at 0.25 speed, and renders 25 ms decaying spike afterglow. Sparse soma activity does not depict axon propagation. Full atlas graph tracing remains a separate anatomical teaching view.
- Controller and gait are engineered upstream animations, not muscles, collision physics, learned skill or a closed sensorimotor loop. Female body and male atlas are separate specimens. Turn presets directly stimulate descending cells as well as visual cells.
- Files are gzip-compressed little-endian typed arrays, described by manifest.json. Reproduction needs the full ~80 MB upstream download; visitors download only compact results.

Runtime files live under immutable `v1/`; changes to computed values require a new version path. Hosting cache headers are declared in `public/_headers`; this task does not claim production cache verification.
