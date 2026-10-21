# Elements: material studies — sources and boundaries

Rewritten 2026-09-10. The current renderer, procedural geometry, layout and
bilingual explanatory copy were created for this project. The current museum includes a complete photographic table; the earlier seven CC BY 3.0 originals remain at
`public/assets/worlds/periodic-table/NOTICE.md` and its per-file `sources.json`. The expanded collection has its own `collection/NOTICE.md` and per-image manifest.
No external meshes, HDR photographs, RSC illustrations, Wikipedia summaries or
Bowserinator JSON were imported. The user-supplied reference image was used only
for visual discussion, not incorporated in the work.

Project-controlled code follows the root AGPL-3.0-only license. Original eligible
editorial content follows the root CONTENT_LICENSE.md. This notice does not
relicense the existing third-party dependencies.

## Rendering dependency

Three.js and its RoomEnvironment are used as the existing MIT dependency (r183
package range; resolved version in pnpm-lock.yaml). RoomEnvironment procedurally
constructs lighting, so there is no external HDR asset. React Three Fiber and Drei
remain existing dependencies under their upstream licenses. No code from the old
CSS3D demonstration was copied into this renderer. Its vendor directory and
historical notices remain intact but are no longer loaded by this world.

## Factual data

`element-reference.json` is a private, byte-identical snapshot of the project-curated
factual table in `vendor/three-periodic-table/element-data.json`. The existing data
regression test checks equality; the runtime imports only its private snapshot. This is the corrected CIAAW 2024
snapshot, not the outdated numeric literals in the Three.js example. Names,
numbers, positions, weights and isotope mass-number distinction are retained.
The dataset includes source URLs and its edition. It is not automatically
replaced with a later edition. Values checked against:
- https://ciaaw.org/abridged-atomic-weights.htm
- https://ciaaw.org/radioactive-elements.htm

Original summaries and interactions were checked on 2026-09-10 against the Royal
Society of Chemistry's individual pages. These pages are factual references, not
licensed asset packs; their prose, illustrations and database are not copied.
- Gallium: https://periodic-table.rsc.org/element/31/gallium
- Mercury: https://periodic-table.rsc.org/element/80/mercury
- Caesium: https://periodic-table.rsc.org/element/55/caesium
- Bromine: https://periodic-table.rsc.org/element/35/bromine
- Neon: https://periodic-table.rsc.org/element/10/neon
- Carbon: https://periodic-table.rsc.org/element/6/carbon
- Copper: https://periodic-table.rsc.org/element/29/copper
- Gold: https://periodic-table.rsc.org/element/79/gold

## Earlier procedural studies (retained privately, not rendered by the museum preview)

## Model

Four pure-substance phase comparisons use reference melting temperatures at
ordinary pressure (Ga 29.7646°C, Hg −38.829°C, Cs 28.5°C, Br −7.2°C).
The selected temperature represents an equilibrium condition, not an elapsed
heating experiment. Exactly at a transition, either phase can coexist; the
illustrated fraction has no quantitative meaning. No interpolation of the melting
threshold is used. The rendering eases towards the selected state, not through a
fictional melting-temperature interval. It does not model latent heat, heat
transfer, nucleation, supercooling, density, wetting, oxidation, vapour or hazards.
Ranges remain below boiling. Cs assumes an inert environment.

Neon is colourless when off. Orange-red discharge colour is an illustrative
screen approximation, not a full spectrum or voltage-current simulation.
Carbon buttons choose separate graphite/diamond samples, not a physical
transmutation. All samples are original geometric material studies; none claims
to be a measured crystal, a scan, an atom image or a specimen at its real size.
Other elements display typography, never speculative solid lumps. In particular,
no macroscopic specimen is invented for a superheavy element.

## Museum preview

The current renderer is an original specimen gallery with continuous case-to-detail
transitions, a full 118-element table, search, same-group highlighting and a
property heatmaps. The atom renderer adapts MIT source from Future-Style-Periodic-Table; its separate CC BY-SA dataset was not imported. Original photographs remain unaltered.
The original procedural scene is not imported by the current renderer.

## Comparative collection and factual enrichment — 2026-09-10

`material-properties.ts` contains seven individually checked property records:
melting and boiling points at ordinary pressure, room-temperature density,
Pauling electronegativity, common oxidation states, and neutral ground-state
configurations. Shell sums are tested against atomic numbers. Data values were
checked against the RSC individual pages for Cu, S, Si, Bi, Hg, Br and O. The
additional references are listed in the world catalog. No upstream prose, images
or full data package was copied. Historical and application summaries are original.

Temperature changes a reference-state label, not the original photograph. It does
not model reaction, heating kinetics, allotrope transitions, vapor pressure,
dissociation or pressure dependence. Exact transition temperatures are labelled
as boundaries. Density sorting uses room-temperature reference densities, not the
slider temperature. Missing data (including Og) sorts last and is not imputed.
Electronic dots show shell counts, not measured positions or planetary orbits.

## Adapted atom renderer

`atom-specimen.tsx` adapts ring construction, electron placement, CSS3D transforms,
WAAPI rotation and pointer drag logic from SeanWong17/Future-Style-Periodic-Table,
`src/modules/atom3d.ts`, commit `6f76f56078ed6cd388493e080e77bad6b026645f`.
Upstream: https://github.com/SeanWong17/Future-Style-Periodic-Table
MIT copyright (c) 2025 SeanWong17; full license in `upstream-LICENSE.txt`.
Changes: React lifecycle cleanup, deterministic ring orientations, museum styling,
verified shell populations, shell highlighting, keyboard/pinch controls and pause.
No upstream fallback electron-filling algorithm, prose or CC BY-SA data is used.

The atom is a pedagogical shell-count schematic, not a quantum orbital, a measured
trajectory, a nuclear model or an illustration to scale. Protons and neutral
atom electrons equal Z. Neutrons are A−Z for the selected reference isotope;
standard atomic weights are never rounded to infer neutron counts. NIST isotope
availability or natural abundance must not be interpreted as nuclear stability.
Data-specific provenance is adjacent to the complete element and isotope modules.

## Complete photographed entrance and persistent atom stage — 2026-09-10

The full 118-position table is the default. There are 101 photographic positions and 17 explicitly labelled nuclear
synthesis drawings. Photo kinds distinguish actual elemental samples, electrical
discharge, minerals/compounds, experimental observations and related research photographs. A contextual
apparatus photo is never represented as an element sample or necessarily its
actual discovery apparatus. Photo-referenced AI display images are stored separately from the real inputs. Original photographs are
resized/compressed with attribution and per-file terms in the collection manifest.

A selected photo stays visible while its atom schematic and proton, neutron and
neutral-electron ledger stay available. Selecting a particle type isolates its
visual markers. Changing isotope adds/removes only the appropriate neutrons;
packing positions are pedagogical, not measured nuclear geometry. Paused or
reduced-motion states retain viewing orientation and electronic shell counts.

## Daylit specimen wall and photo-referenced display images — 2026-09-10

The wall uses reviewed AI adaptations of individual real photographs to unify
background and lighting. Every generation supplied the corresponding original
photograph as image input. The display/original switch and Sources tab preserve
the original as evidence with credit and licence. Per-image prompts, input/output
hashes and review notes live in `public/assets/worlds/periodic-table/display/`.
These are labelled illustrations, not new documentary photographs. Elements
without confirmed specimen references show clearly labelled experimental
photographs or sourced synthesis drawings; no generic cyclotron placeholder remains.
The entrance remains the full periodic table; hovering previews a specimen and
opening it enlarges the image into the inspection view. Atom counts stay visible
in either image mode. Reduced-motion disables the expansion animation.

## Element-specific evidence and synthesis drawings

Po, At, Rn, Fr, Th and Pa use new direct-reference photographs with exact
observational boundaries in `collection/sources.json`. Seventeen heavy-element
positions use `synthesis-data.ts` and the shared static/live drawing function
`synthesis-graphic.ts`; each representative measured channel has a scientific
source, a charge/nucleon conservation test and an explicitly schematic presentation.
The product isotope initializes the particle ledger, independently of subsequent
manual isotope selection. Rights and modelling limits are recorded in
`public/assets/worlds/periodic-table/synthesis/NOTICE.md`.
