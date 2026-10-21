# Shape of the World data and evidence ledger

The public catalogue is data-driven and changes over time. Heavy models, volumes,
map data, and external scientific tiles load only after a visitor opens that
world; discovery surfaces use lightweight poster variants.

Audio-library provenance is stored with each record under `music/tracks/`.
The `scene-audio-2026-09` campaign uses Google Cloud Lyria 3; the
`sound-design-2026-09` campaign uses original deterministic synthesis with no
external recordings or samples. See [audio permissions](./music/AUDIO_LICENSE.txt)
and [rights profiles](./music/rights-profiles.json). Synthetic environments are
designed textures, not scientific or location recordings. 音频来源逐条记录；
合成环境声不得被视为真实地点、动物或科学观测录音。

## 1. Universe map

- Renderer: [WorldWide Telescope](https://github.com/WorldWideTelescope/wwt-webgl-engine), MIT.
- Runtime: the official WWT Research App embed, loaded only inside the
  experience. OneWorld uses WWT's documented `postMessage` control protocol to
  move between four fixed astronomical coordinates; no telescope imagery is
  copied into the OneWorld bundle.
- Imagery: open astronomical surveys selected and served by WWT. The WWT
  interface carries its own source credit and OneWorld links the project page.
- Caveat: this lane needs the WWT scientific tile service. It keeps a local
  poster and loading state, but it is not an offline sky atlas.

## 3. Historical global flight network

- Renderer: [Flowmap.gl](https://github.com/FlowmapBlue/flowmap.gl) 9.4.0
  (Apache-2.0) on [deck.gl](https://github.com/visgl/deck.gl) 9.3.6 (MIT).
- Routes and airports: [OpenFlights](https://openflights.org/data), ODbL-1.0
  / DbCL-1.0. The route source stopped updating in June 2014, so the interface
  says **historical snapshot** and never presents it as current traffic.
- Derived database: `public/assets/flow/global-routes.json`, containing the 220
  best-connected airports and 1,800 strongest aggregated airport pairs from
  the 67,663-record source. It remains available under ODbL-1.0.
- Boundaries: Natural Earth 110m countries, public domain. They are visual
  context, not a political-boundary claim.
- Rebuild: `node scripts/build-openflights-data.mjs`.
- Shared land mask: `public/assets/submarine-cables/land.json` is a simplified
  public-domain Natural Earth derivative retained for `earth-spin-orbit`.
  Rebuild with `node scripts/generate-earth-land-mask.mjs`; provenance is
  recorded beside the asset.

## 6. Cranial CT volume

- Renderer: [NiiVue](https://github.com/niivue/niivue) 0.69.0, BSD-2-Clause.
- Data: SCI Institute `CT_Electrodes`, distributed from the pinned NiiVue demo
  dataset and identified there as MIT-licensed SCI Institute data.
- Exact upstream license and provenance live beside the volume under
  `public/assets/volume/`.

## 10. Manhattan 1917

- Renderers: [Allmaps](https://github.com/allmaps/allmaps) MapLibre plugin
  1.0.0-beta.43 (MIT) and [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js)
  5.24.0 (BSD-3-Clause).
- Map: C.S. Hammond & Company, *Hammond's complete map of New York City*,
  1917, Boston Public Library / Digital Commonwealth. Its JSON record states
  “No known copyright restrictions” and “No known restrictions on use.”
- Georeference: Allmaps annotation `d180902cb93d5bf2`, released as CC0. Image
  regions stream from the Digital Commonwealth IIIF service.

## 11. Shape of the World original soundtrack

- Default / fallback bed is GLO-B01 `hidden-shapes` (`世界的形状`), bundled as `public/assets/audio/hidden-shapes.mp3`. SHA-256: `a75b94159a431536486fe0d6a657686341199bdcd5252d7b23b899acbd4656c9`.
- Canonical stream: `https://music-cdn.shapeof.world/tracks/hidden-shapes/v3/preview.mp3`. Page: `https://music.shapeof.world/track/hidden-shapes`.
- Track catalog source is `music/tracks/*.json`. The public catalog site is `apps/music` at `https://music.shapeof.world`.
- Other category tracks are assigned in `src/data/soundtrack.json` and `src/data/generated/world-soundtrack.json`. The website streams their CDN previews.
- These tracks are project original soundtrack, AI-generated. Do not use `r2.dev` URLs.

## 12. Google Cow anatomy

- Source model: Open 3D Viewer `cow_anatomy`, originally released with Google Body and archived at [jah120/open-3d-viewer](https://github.com/jah120/open-3d-viewer/tree/master/web/models/cow_anatomy).
- Model artist and notice: Leo White, 2010. Model, metadata and material files are Apache-2.0; the exact license and required notice are shipped beside the derived asset.
- OneWorld converted `Bessie.obj` and its named body-system groups to glTF, then applied Meshopt compression. The resulting `public/assets/cow/bessie-anatomy.glb` is 4.16 MB and retains seven independently selectable systems.
- SHA-256: `d86e6e9811a8a6bbd842a842fefe6d12076cb11f3063a2a72360baddb509aff4`.
- Poster: a 1440 × 1000 capture of the digestive-system view, WebP-compressed without synthesized anatomy.

## 15. The shape of elements

- The default entrance is a complete 118-position specimen wall. Photo-referenced AI display illustrations have a separate original-photo view with credit, source and licence; contextual research photos are not represented as bulk specimens.
- The original photographs and their download URLs, conditions, licences and hashes are recorded in [`collection/sources.json`](public/assets/worlds/periodic-table/collection/sources.json). AI derivatives retain per-image input/output hashes and prompts in [`display/`](public/assets/worlds/periodic-table/display/NOTICE.md).
- The 118-element private table preserves project-curated CIAAW 2024 values, including atomic weights versus representative isotope mass numbers. PubChem supplies the additional physical properties and electron configurations; NIST supplies 354 reference isotope records. Missing values and predictions remain explicit.
- The persistent atom stage adapts the MIT-licensed Future-Style-Periodic-Table renderer, using independent factual data. It illustrates particle counts and shells, not measured electron trajectories. The upstream CC BY-SA data package is not imported.
- Original bilingual material explanations refer to RSC facts without copying its prose or artwork. Scientific limits and pinned upstream sources are recorded in [`the renderer notice`](src/components/experiences/worlds/periodic-table/NOTICE.md).
- Earlier procedural studies and the historical Three.js example remain preserved but are not loaded by this world. Posters are local captures of the current renderer.

## 17. Moon voyage (Apollo-style transfer)

- Lunar surface texture: NASA/GSFC/Arizona State University, Scientific Visualization Studio **CGI Moon Kit #4720** (`lroc_color_2k.jpg`, LROC WAC global color mosaic, public domain). OneWorld ships a locally enhanced copy at `public/assets/solar-system/moon-lroc-2k.jpg` (contrast/saturation graded for screen output); full provenance in `public/assets/solar-system/SOURCES.md`.
- Earth textures reused from the solar-system set: NASA Visible Earth Blue Marble (day), NASA Earth Observatory / NOAA VIIRS Black Marble 2016 (night lights).
- Mission model: real constants (μ_E, μ_M, real Earth/Moon radii and 384,400 km circular lunar orbit) with scripted patched conics — 190 km parking orbit, TLI onto a transfer ellipse whose semi-major axis is solved so TLI→LOI totals 73 h, lunar hyperbola (v∞ = 0.85 km/s) into a 110 × 314 km capture ellipse, then circularization at 110 km. Timeline anchors follow Apollo 11 (LOI ≈ GET 75.9 h).
- Caveat shown in-world: circular lunar orbit, no Earth rotation, mission plane = lunar orbital plane (real 28.5° parking-orbit inclination omitted); ascent is a scripted profile anchored to Saturn V milestones, not an integrated guidance solution.

## 18. Black-hole flyby

- Renderer: [Eric Bruneton Black Hole Shader](https://github.com/ebruneton/black_hole_shader/tree/e72b3f293409893a6fa25528b29572c96fc57f57), BSD-3-Clause, with the local runtime in `public/vendor/black-hole/` and its source subset in `vendor/black-hole-shader/`.
- Model: [Bruneton (2020), arXiv:2010.08735](https://arxiv.org/abs/2010.08735), a non-rotating Schwarzschild black hole with precomputed curved-ray tables, relativistic Doppler/beaming effects, and a simplified infinitely thin accretion disc. It is a visualization model, not a numerical magnetohydrodynamic disc simulation or an observation of a specific black hole.
- Background sky: original procedural generation by `scripts/generate-black-hole-sky.mjs`, fixed seed `0x5eeda17c`. Stars are independently sampled spherical positions; a tilted galaxy band, bulge and fractal dust absorption are synthetic. Temperature colors use the upstream BSD `black_body.dat`. No third-party star catalogue, photograph, sky-map texture, real constellation or identified nebula is reproduced.
- Calibration retains only global scalar radiance/occupancy/color statistics from the historical reference; no reference coordinates, tiles or spatially derived image are copied. The generator's ordinary run has no catalogue input or network dependency. Summary statistics and output hashes: `scripts/black-hole-sky-statistics.json`.
- Audio: `black-hole-flyby-audio.ts` synthesizes oscillators and a generated-noise reverb with Web Audio; no recording, sample or downloaded audio is used by this module. It is an artistic soundtrack, not sound recorded in space.
- Posters: captures and crops of this world's newly generated sky in the live renderer; the historical sky posters are not reused. Detailed asset origins, dates, checksums and limits: [SOURCE.md](src/components/experiences/worlds/black-hole-flyby/SOURCE.md) and [runtime NOTICE](public/vendor/black-hole/NOTICE.md).

## 18a. Cosmic scale stills

- Photo plates shipped with `cosmic-scale` are cropped, square WebP derivatives of named public communication images. Per-file credit, source page, and processing notes live in [`public/assets/cosmic-scale/SOURCES.md`](public/assets/cosmic-scale/SOURCES.md).
- JWST SMACS 0723: NASA / ESA / CSA / STScI, ESA/Webb `webb-first-deep-field`.
- Hubble M51: NASA / ESA / S. Beckwith (STScI) / Hubble Heritage Team, ESA/Hubble `heic0506a`.
- Earth: NASA Apollo 17 photograph AS17-148-22727.
- Sun: NASA SDO/AIA full-disk image of 19 August 2010.
- Milky Way band: ESO / S. Brunier all-sky panorama `eso0932a`. ESO public-website images are [CC BY 4.0](https://www.eso.org/public/outreach/copyright/) unless a page says otherwise: commercial reuse is allowed with a clear, unaltered credit (here: ESO / S. Brunier). The ESO logo is not licensed. This plate is not project-owned CC BY-NC content.
- Virus: NIAID public-domain transmission electron micrograph of SARS-CoV-2.
- Remaining rungs are original schematics, not observational photographs. The Sun-to-universe stretch also includes schematic plates for Earth’s orbit, the Oort cloud, and a galaxy wall at the published Sloan Great Wall scale.
- Caveat shown in-world: characteristic lengths are published sizes, not a single 3-D scene that can be true at every scale at once.
- The play-journey film `journey-micro-to-macro.mp4` is a continuous logarithmic camera move through those same plates, not a cut sequence.

## 20. Periodic three-body orbits

- Initial conditions for 695 equal-mass families and 1,349 unequal-mass
  families are numerical values transcribed from the authors’ arXiv TeX
  sources. Visualization, integration, and interface code are original.
- Equal mass: Xiaoming Li and Shijun Liao, *Sci. China Phys. Mech. Astron.*
  **60**, 129511 (2017), arXiv:1705.00527v4, supplementary tables S.XVII–XXX.
- Unequal mass: Xiaoming Li, Yipeng Jing, and Shijun Liao, *PASJ* **70**, 64
  (2018), arXiv:1709.04775, supplementary initial-condition tables.
- Named moth / butterfly / dragonfly / yarn / goggles orbits follow
  Šuvakov & Dmitrašinović, *Phys. Rev. Lett.* **110**, 114301 (2013),
  arXiv:1303.0181 Table I. Figure-eight uses the Chenciner–Montgomery
  choreography; Euler and Lagrange solutions are constructed from the
  classical rigid configurations.
- Adjacent notice: `src/components/experiences/worlds/three-body/data/NOTICE.md`.
- Spatial 3D orbits: Li and Liao, arXiv:2508.08568 (CC BY 4.0). The world
  includes 2,416 of the 10,059 reported orbits (all linearly stable, all
  piano-trio, and the shortest of each mass).
- Caveat shown in-world: the browser uses 3D adaptive RK4, not the authors’
  clean numerical simulation; periodic mode reseeds published initial
  conditions after each period. Planar families still move in a plane inside
  3D space; spatial families leave that plane.

## 21. Human atlas — BodyParts3D

- Viewer kernel adapted from [ashemag/human-atlas](https://github.com/ashemag/human-atlas),
  commit `7a383d3ee2759e3ddf157c704fb8814fd0c50bcb`, MIT. License:
  `public/assets/oss-source/LICENSE-human-atlas.txt`.
- Anatomy data: BodyParts3D 4.0 adult male reference, © The Database Center
  for Life Science, CC BY 4.0. Source archive `isa_BP3D_4.0_obj_99.zip`.
  License: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html
  Dataset: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html
  Publication: Mitsuhashi et al. (2009), https://doi.org/10.1093/nar/gkn613
- Local copy: `public/assets/human-atlas/models/` (gzipped binary chunks and
  `atlas.json`). Adjacent credit: `public/assets/human-atlas/ATTRIBUTION.md`
  and `public/assets/human-atlas/NOTICE.md`.
- Adaptations retained from the upstream viewer: millimetre/Z-up to metre/Y-up,
  meshoptimizer simplification at 0.2% relative error per structure, quantized
  normals, packed chunks. Shape of the World rewrote the surrounding UI,
  lighting, and bilingual labels. The geometry is not relicensed under the project's software license.
- Caveat shown in-world: adult male reference anatomy, not a complete account
  of human variation, and not a diagnostic or surgical tool.

## Interpretation policy

- `verified` means a traceable model, image, structure, or measured volume.
- `compiled` means OneWorld transformed a named open dataset and states its
  date and limits in the interface.
- Upstream project names identify provenance and never imply endorsement.
- The source link shown inside each world is the authoritative current record.

### Periodic-table museum preview photographs

Seven photographs from [Chemical Elements — A Virtual Museum](https://images-of-elements.com/),
CC BY 3.0, individually checked 2026-09-10. Original pixels retained.
Per-image URLs, hashes, credit and scientific context: [asset notice](public/assets/worlds/periodic-table/NOTICE.md)
and [manifest](public/assets/worlds/periodic-table/sources.json). These third-party
images retain their upstream terms and are excluded from project-owned content licensing.

## Periodic-table full element and isotope records

The private `complete-element-data.json` snapshot contains factual PubChem
periodic-table fields for 118 elements; its adjacent notice records the endpoint,
retrieval date, response hash, unit conversions, missing values and predictions.
`isotopes.ts` contains 354 reference isotope records from NIST's Atomic Weights
and Isotopic Compositions table, covering all 118 atomic numbers. Abundance is
not a stability flag. Neutron counts use the selected isotope's integer mass
number, never a rounded atomic weight. Existing CIAAW weights remain authoritative.

### Periodic-table expanded photo collection (2026-09-10)

The complete photo mapping and image kinds are in
`src/components/experiences/worlds/periodic-table/photo-data.ts`.
The active collection combines CC BY 2.0, 3.0 and 4.0 photographs with
explicitly public-domain NASA, DOE and USGS references. The generic historical
cyclotron file is retained with attribution but no longer displayed. Each derivative
has its own source, terms, credit and hash in
[the collection manifest](public/assets/worlds/periodic-table/collection/sources.json)
and [adjacent notice](public/assets/worlds/periodic-table/collection/NOTICE.md).
The six element-specific additions cover Po, At, Rn, Fr, Th and Pa, with
exposure, material and apparatus context in their captions. Seventeen heavy
elements instead use original, explicitly labelled synthesis drawings with
per-reaction sources in [the synthesis notice](public/assets/worlds/periodic-table/synthesis/NOTICE.md).
Contextual research images are not claimed to be specimens. Project licences
do not relicense photographic material or linked scientific publications.

## Cat Anatomy (making)

- The whole-body teaching view adds original schematic surface, major muscle,
  and organ geometry informed by the anatomical references below. Its fitted
  westerly skeleton is an approximate positional reference, not registration
  to a scan or an individual specimen. It remains distinct from the separately
  presented abdominal and skeletal source models.
- Abdominal viscera model: [Normal Feline Anatomy - Digestive System](https://sketchfab.com/3d-models/normal-feline-anatomy-digestive-system-ab92a2a9d9024447b0ed4c080ad17106)
  by Pixelbeaker, CC BY 4.0. The source itself is a torso excerpt containing
  the liver, stomach and upper gastrointestinal tract, intestines, pancreas,
  kidneys, bladder and vessel group; it does not provide the heart, lungs or
  skeleton. Source group forms and relative registration are preserved while
  the delivery asset is decimated and compressed.
- Independent whole-body skeleton: [Feline Skeleton Dec](https://sketchfab.com/3d-models/feline-skeleton-dec-a5d0bb8f55dc4f49b103cd20d65e0b17)
  by westerly, CC BY 4.0. The author describes an ecorche practice study made
  from reference images. The source provides no verifiable evidence of
  scanning or medical validation and is not registered or fused with the
  abdominal viscera.
- Historical reference: [Anatomy of the Cat](https://www.gutenberg.org/files/58394/58394-h/58394-h.htm)
  by Jacob Reighard and H. S. Jennings (1901), illustrated by Louise Burridge
  Jennings. The selected figures are public-domain historical plates.
- Specimen reference: [Diaphragma-cat.jpg](https://commons.wikimedia.org/wiki/File:Diaphragma-cat.jpg)
  by Uwe Gille (2006), CC BY 2.5. It is a dissected and retracted specimen
  photograph, not an intact-animal measurement image.
- The [Merck Veterinary Manual respiratory](https://www.merckvetmanual.com/cat-owners/lung-and-airway-disorders-of-cats/introduction-to-lung-and-airway-disorders-of-cats),
  [digestive](https://www.merckvetmanual.com/cat-owners/digestive-disorders-of-cats/introduction-to-digestive-disorders-of-cats),
  [liver](https://www.merckvetmanual.com/cat-owners/digestive-disorders-of-cats/disorders-of-the-liver-and-gallbladder-in-cats),
  [pancreas](https://www.merckvetmanual.com/cat-owners/hormonal-disorders-of-cats/disorders-of-the-pancreas-in-cats),
  and [urinary](https://www.merckvetmanual.com/cat-owners/kidney-and-urinary-tract-disorders-of-cats/the-urinary-system-of-cats)
  articles support the explanatory anatomy text. The [University of Minnesota
  Veterinary Anatomy abdominal-vessel figure](https://vanat.ahc.umn.edu/carnLabs/Lab18/Img18-3.html)
  provides an additional teaching reference for the pancreas, duodenum, kidney
  and vessel relationships. The sources provide no verifiable evidence of
  CT/MRI reconstruction or clinical validation, and the world does not present
  the bundled views as a complete veterinary reference. Asset-level licenses,
  conversion details and hashes are stored in `public/assets/worlds/cat-anatomy/model/` and
  `public/assets/worlds/cat-anatomy/plates/`.
- External body: [Fripouille](https://sketchfab.com/3d-models/3d-modelling-my-cat-fripouille-0ab14bf98e754f8d90fe1bf1c84ca66c)
  by guillaume bolis, CC BY 4.0. Modeled exterior and textures, not scan data;
  kept separate from the schematic organ reconstruction. Static-pose baking,
  subdivision, normal-map conversion and compression are recorded in
  `public/assets/worlds/cat-anatomy/body/`.

## flybody body geometry

- Pinned model: [TuragaLab/flybody d015e9bf](https://github.com/TuragaLab/flybody/tree/d015e9bfe441bd90ae431bac24c55cb74bdbce26), Apache-2.0.
- Scientific reference: [Whole-body physics simulation of fruit fly locomotion, Nature (2025)](https://doi.org/10.1038/s41586-025-09029-4).
- This world uses simplified body meshes and a single-joint kinematic demonstration, not recorded locomotion or full physics. Separately licensed Figshare data and trained policies are excluded. Input and output hashes: [asset manifest](public/assets/worlds/flybody/manifest.json); [modifications and rights](public/assets/worlds/flybody/SOURCES.md).

### MaleCNS neural atlas (flybody)

Official MaleCNS v1.0 neuron annotations and directed contact counts, CC BY 4.0. Credit FlyEM/HHMI Janelia, University of Cambridge, MRC LMB and Google Research. Source hashes, filtering, coordinate transform and exclusions are recorded in [the asset source record](public/assets/worlds/flybody/neural/SOURCES.md). Pulses show graph traversal, not neural activity or behaviour prediction.

### flybody synchronized replay and photograph

Neural Canvas revision `776d115ee5aa934578a87fd6d260d138084f59c1` supplies a MaleCNS LIF model and engineered body decoder. This repository computes its own offline replay, rather than redistributing an upstream experimental recording. See `public/assets/worlds/flybody/replay/SOURCES.md` for parameters, hashes and scope. Real photo: Rolf Dietrich Brecher, 2018-03-13, Flickr `38978426500`, CC BY 2.0; compressed to WebP with original image content retained.


### flybody pose-matched AI opening (2026-09-13)

The active opening is now `fly-render-404267a77b19.webp`, an AI illustration referenced to the existing Apache-2.0 flybody model, not a real photograph. The earlier Brecher photograph is unused and retains its CC BY 2.0 record. See [asset provenance](public/assets/worlds/flybody/SOURCES.md) for the generation prompt, model attribution and output hash. No claim of measured anatomy or exclusive ownership of the model-derived visual is made.

## Standard Model elementary particle museum

- **PDG Review of Particle Physics 2024**: a small, edition-pinned property extract from the [official API](https://pdgapi.lbl.gov/doc/restapi.html), under CC BY 4.0. Raw responses and display data are in `src/components/experiences/worlds/standard-model/museum-data/`; extraction and limitations are in [the data workflow](scripts/standard-model/README.md). Scikit-HEP Particle 0.24.0 was used for offline cross-checking, not as a substitute edition or a browser dependency.
- **CMS Collaboration, Zmumu 2010 education sample**: one candidate from [CERN Open Data record 307](https://opendata.cern.ch/record/307), DOI `10.7483/OPENDATA.CMS.XBN9.HFGT`, CC0. The original renderer projects reconstructed four-momenta; it does not display measured detector hits or establish a discovery from one event. See [event provenance](src/components/experiences/worlds/standard-model/evidence/NOTICE.md).
- **CMS Run2010B dimuon spectrum**: 100,000 selected events from [CERN Open Data record 700](https://opendata.cern.ch/record/700), DOI `10.7483/OPENDATA.CMS.CB8H.MFFA`, CC0. The museum bundles 108 mass-bin counts, not a simulated or unbiased spectrum; source checksum, cuts and local reproduction instructions are in [spectrum provenance](src/components/experiences/worlds/standard-model/evidence/DIMUON_SPECTRUM_NOTICE.md).
- **Particle stories and discovery history**: original bilingual summaries with paragraph-level links to CERN, PDG, Fermilab, SLAC, DESY, Brookhaven and Nobel Prize institutional references, listed in `particle-dossiers.ts`. These summaries do not redistribute institutional photographs or diagrams. The card illustrations are qualitative behaviour schematics, not photographs or measured particle shapes.

## Solar System and Voyager journeys

Voyager 1/2 use frozen NASA/JPL NAIF SPKs with matched local flyby solutions,
not live telemetry. JPL SBDB supplies epoch-specific elements for eleven selected
minor bodies. Nine credited NASA/JPL mission images retain acquisition dates
and processing caveats. Kernel/image hashes, regeneration commands, sampling
limits and source-solution discontinuities are documented in the
[adjacent source record](public/assets/solar-system/voyager/SOURCES.md).
Future motion and Oort Cloud distribution are explicitly schematic.

## Population distribution classroom (2020 statistics)

- World Bank WDI: population `SP.POP.TOTL` and land area `AG.LND.TOTL.K2`, observed in 2020 and retrieved 2026-10-02. The dated snapshot retains 217 nonaggregate statistical economies; 216 have a valid density denominator. CC BY 4.0 attribution and source links appear in the classroom. Missing is not zero, and statistical economies are not a sovereignty classification.
- NBS: [2020 census Communiqué No. 3](https://www.stats.gov.cn/sj/zxfb/202302/t20230203_1901083.html), observation at midnight 2020-11-01; original charts use published factual counts, not copied artwork. The 31 provincial units exclude the separately listed active-service personnel row. No provincial density is invented without matching area. The [2020 migrant-worker survey](https://www.stats.gov.cn/sj/zxfb/202302/t20230203_1901074.html) is a separate employment-group statistic.
- UNESCO Hoh Xil and NCERT population geography support original, limited factual explanations; no source maps, figures, photographs or textbook pages are copied. Local high-altitude context is not numerical attribution of provincial population.
- The two spatial districts are entirely fictional, each with 100 km² and 10,000 people. They demonstrate different internal patterns at the same mean. There is no real geographic basemap, outline or locator in this classroom; real-world distribution/map-reading goals remain outside its current coverage. Runtime data, hashes and source references: [SOURCES.json](src/components/experiences/worlds/population-distribution-lab/SOURCES.json).
