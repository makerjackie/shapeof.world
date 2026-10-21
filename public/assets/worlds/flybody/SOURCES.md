# flybody — source and modifications

Upstream: https://github.com/TuragaLab/flybody
Pinned revision: d015e9bfe441bd90ae431bac24c55cb74bdbce26
Original body model: HHMI Janelia Research Campus and Google DeepMind.
License: Apache License 2.0, included in LICENSE. No separate upstream NOTICE file was present in the pinned tree.
Publication: Vaxenburg et al., Whole-body physics simulation of fruit fly locomotion, Nature 643, 1312–1320 (2025), https://doi.org/10.1038/s41586-025-09029-4.

## Modification notice

Modified by Shape of the World, 2026-09-12. The adjacent GLB is a modified conversion of the upstream OBJ meshes and MJCF hierarchy: quadratic mesh simplification, conversion to binary glTF, PBR materials and retained local segment transforms. Runtime lighting, exploded views and a single-joint kinematic demonstration are original adaptation code. This does not run MuJoCo or a trained policy and is not an observed walking sequence.

The third-party model remains under Apache 2.0; the site's original-content licence does not replace it. No upstream brand endorsement is claimed. Separately licensed Figshare datasets, weights, videos and article figures are not included.

Reproduce with `src/components/experiences/worlds/flybody/export-model.py` in the source repository, Python 3.12, trimesh 4.7.4, numpy 2.2.6 fast-simplification 0.1.12, Pillow 11.3.0 and SciPy 1.16.1 (build-time tools; see requirements-model.txt). The manifest records input hashes, output hash, bytes and simplification counts.

Storage: the large original OBJ/XML files stay in a local build cache. One derived GLB is stored with source-controlled Static Assets, loaded only when opening this world; the 6 MB world budget includes room for its JS runtime. This avoids introducing a separate online model service and preserves reproducibility. App packaging and offline operation have not been validated by this adaptation.

The shipped model is 2,127,260 bytes with 115,742 triangles (272,550 before simplification). It contains no textures or remote resource references.

## Continuous journey revision — 2026-09-12

The same pinned geometry is now rendered in one persistent scene with the separately licensed MaleCNS atlas. Runtime welding of coincident mesh vertices and recomputation of surface normals smooth the body lighting; physical materials and studio lighting are artistic choices. The opening is a rendered model, not a real photograph. Parts separate according to the existing node hierarchy; this does not simulate an actual animal dissection or movement. The head anchor guides an editorial camera move. MaleCNS brain points are illustratively placed near that anchor, scaled and rotated before expanding into their native atlas view; this is not anatomical registration between the female body and male neural specimen. The ventral cord is revealed after the head transition. No new third-party assets or dependencies were introduced.

## Head opening and teaching circuit (2026-09-13)

Runtime splits head shell triangles into two illustrative halves, fits a separate MaleCNS brain atlas to the shell bounds and shares the head transform. The 20-second journey preserves their relation. Forelegs are repositioned in the exploded view and driven by illustrative inverse kinematics. A separate dimensionless teaching circuit links virtual dust to sensory input, descending output and cleaning feedback; it uses no trained weights, connectome dynamics or biological joint constraints. These are display transformations, not validated anatomical registration or physiological simulation. Original asset bytes and licences are unchanged.

## Network and actuator presentation (2026-09-13)

The penultimate chapter now removes all body surfaces and presents the brain alone. The final chapter adds original cube/paddle geometry driven by a separate hand-parameterized teaching controller. The former dust/foreleg exercise is replaced. These actuators do not use MaleCNS weights or external trained policies. Cube moves are individual layer turns, not puzzle solving; paddle control demonstrates error feedback. Existing model and dataset licences are unchanged.

## 2026-09-13 synchronized neural/body revision

The standalone cube/paddle teaching apparatus is superseded by Neural Canvas model-based replay. See `replay/SOURCES.md` and adjacent licences. The story retains a brain-only penultimate stage and reintroduces a complete articulated NeuroMechFly body for the final stage.

`real-fly-451fa4816052.webp`: genuine photograph by Rolf Dietrich Brecher, 13 March 2018; source https://commons.wikimedia.org/wiki/File:Drosophila_melanogaster_%E2%99%80_(38978426500).jpg (original Flickr 38978426500), CC BY 2.0 https://creativecommons.org/licenses/by/2.0/ . Changes: resized to 1600 px wide and compressed as WebP; display uses an elliptical edge mask. No generated imagery. Credit and licence links appear with the photo.

Photo original SHA-256: `6c1ec3ca1aec92b2df32d071539a34580b90811516ccd5b5da26007feeb4f134`; WebP SHA-256: `451fa4816052aa967b324bb6ba9501fce5889aa795594acc8fbfa4b1f3dfe195`.


## Pose-matched AI opening — 2026-09-13

Current opening: `fly-render-404267a77b19.webp` (1440 × 1080). Generated with the built-in OpenAI image generation tool in this task, using a screenshot of the existing Apache-2.0 flybody geometry as the pose reference. No original photograph was used as an input. The previous Brecher photo is retained as an unused historical asset with its CC BY 2.0 attribution; it is no longer the opening.

This is an AI illustration, not microscopy or a measured specimen. Project licensing does not override the underlying flybody attribution. This mixed model-derived asset is excluded from claims of exclusive project-owned visual content. Preserve the adjacent Apache licence and model attribution.

Prompt: photoreal Drosophila with exactly the reference camera, silhouette, head/wing/leg positions; amber chitin, red compound-eye facets, bristles and transparent veined wings; no text or extra objects. Refinement: remove checkerboard, use a dark #12151b background and match the reference 4:3 framing, eye at 59%/50%, left wing at 23%/58%, upper wing at 68%/33%, foot at 44%/76%. The first output was rejected for a baked checkerboard and altered framing. The final output was compressed to WebP at quality 88.

SHA-256 (shipped): `404267a77b193afecff3f7c7eb22d8c00c3cf2d4b636ef2969b03991a2ba0397`.

The opening image and perspective camera share viewport framing. Image fading finishes before explosion and orbit begin. Story orbit follows editorial time; pausing, rewinding and reduced motion preserve the intended pose. None of these camera movements are biological dynamics.

Reference screenshot SHA-256: `e1908c6c3160bcfba24cef46bbf6ec8733ab1f567875b724a55a4a73c83666ea`. Original generated PNG SHA-256: `3deab19e1b564e0abfd74d28d0f04ed0cf646fed27b68dc45b9f7a245baf397d`. The runtime image is scaled by 0.94 with a 0.5% vertical calibration after browser comparison; there is no claim of pixel-perfect or anatomical registration.
