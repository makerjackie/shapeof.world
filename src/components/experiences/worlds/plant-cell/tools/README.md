# Molecular asset build

Run from the repository root with the existing dependencies:

```sh
node src/components/experiences/worlds/plant-cell/tools/build-molecules.mjs
pnpm exec vitest run src/components/experiences/worlds/plant-cell/molecule-data.test.ts
```

A list of PDB IDs can be supplied for a partial rebuild. The full build also exports ideal ATP, ADP and phosphate atoms/bonds from the PDB Chemical Component Dictionary. No new package or graphical application is needed. Downloads are cached under ignored `node_modules/.cache/plant-cell-pdb/`. Generated deliverables live in `public/assets/plant-cell/molecules/`.

The CIF parser handles loop records, quoted values and semicolon text. The build selects the first deposited model, retains the highest-occupancy alternative of each atom, and removes hydrogen, deuterium and water. It retains bound cofactors and lipids. Entity descriptions classify the ATP synthase parts, rather than relying on fragile alphabetic chain order.

## Assemblies and coordinates

The build applies the deposited assembly 1 transformations. In particular, `8RUC`'s asymmetric unit is only L4S4, and the second operation is necessary to obtain L8S8. `1RWT` is the explicit exception: its deposited assembly 1 is a 60-mer proteoliposome. The native LHCII trimer is reconstructed from author chain A and its associated ligands using the threefold operations 1, 2 and 3. These choices are recorded in each structure's metadata.

Coordinates are nanometres, with +Y in the stroma and -Y in the lumen. For PSII, PSI and b6f, the common normal of long transmembrane helices is estimated with sign-invariant principal-axis iteration. The normal's sign is set by the PSII manganese cluster, PSI PsaC, or b6f cytochrome f head. Tests also independently check the oxygen-evolving extrinsic proteins, PsaD/PsaE and the Rieske head. This is a geometry-based membrane placement estimate, not an OPM embedding or a free-energy membrane calculation.

For `6FKF`, the c14-ring heavy-atom centroid is exactly the origin. Its axis points toward the gamma-chain centroid, placing CF1 in the stroma. Alpha, beta and the peripheral arm stay separate from gamma, epsilon and all 14 c chains. The original origin, normal and transformed biochemical landmarks are preserved in JSON.

## Geometry and binary format

Each smooth surface is a Gaussian heavy-atom density isosurface (sigma 0.29 nm, isovalue 3.5), generated with the repository's MIT-licensed Three.js marching cubes. The existing Three.js edge-collapse modifier reduces it to approximately 2,500–12,000 triangles. The nearest atom supplies its entity/group colour. This is a deliberate molecular-envelope approximation, not a solvent-excluded atomic surface.

Gzip-compressed binary files use little-endian numbers and a 32-byte header:

| Format | Header | Contiguous arrays after the header |
| --- | --- | --- |
| PCMS v1 surface | magic, version, vertex count, index count, coordinate quantum | int16 XYZ (0.002 nm), int8 normals, uint8 linear RGB, uint16 triangle indices |
| PCAT v1 atoms | magic, version, atom count, coordinate quantum | int16 XYZ (0.001 nm), uint8 atomic number, uint8 group, uint8 occlusion, uint8 chain |

Atomic occlusion is the number of other heavy atoms within 1 nm, divided by 240 and clamped to [0, 1]. It is an inexpensive local-density shading proxy. It does not represent electron density, charge or a physical radiative-transfer calculation. Radius and group colour tables live in `molecule-data.ts`.

All structural coordinates and CCD data are **CC0** under [RCSB's usage policy](https://www.rcsb.org/pages/usage-policy). Per-structure JSON records the PDB ID, source URL, title, source organism, resolution, article DOI and dataset DOI. `5L8R` is pea (currently labelled *Lathyrus oleraceus* in PDB taxonomy, synonym *Pisum sativum*), and `1A70` is the E92K spinach ferredoxin mutant. Neither is silently described as an unmodified spinach leaf isolate.

Read-only capture URLs use `scale` (log10 horizontal metres), `light` (PPFD),
`speed` (0, .001, 1, 60, 3600), `t` (initial hour, wrapped over 24 h),
`az` / `el` (degrees in the current anatomical frame), and `capture=1` (hide UI).
Setting `t` sets the clock only; run the simulation to obtain light adaptation.
For example: `/plant-cell?scale=-7.4&light=400&speed=.001&az=26&el=18`.

`verify-round3.mjs <private-output-dir>` checks camera continuity, orbit, mobile
pinch, rotor/stator motion, dark inhibition, capture params and hint expiry.
It uses an isolated temporary profile and headless Chrome with Metal. It does
not capture screenshots; use the project owner's private `gpu-shot.mjs`.

`benchmark.mjs <private-result.json>` uses a new isolated headless Chrome for
each view, settles for 7 seconds and samples 5 seconds of frame intervals.
This separates steady rendering from repeated navigation and retained contexts.
`guide=1` opens the optional tour for capture; ordinary entry stays in free exploration.
