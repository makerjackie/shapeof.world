# MaleCNS v1.0 neural atlas

Source: [MaleCNS official download](https://male-cns.janelia.org/download/).
Dataset: `male-cns:v1.0`, released 2026-06-08. Retrieved 2026-09-12.
Credit: FlyEM Project Team, HHMI Janelia Research Campus; University of Cambridge Department of Zoology; MRC Laboratory of Molecular Biology; Google Research.
Licence: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/), full text in LICENSE.txt. These data and derivatives are excluded from the site's blanket original-content licence. No endorsement is implied.

Official source files, under `https://storage.googleapis.com/flyem-male-cns/v1.0/connectome-data/flat-connectome/`:
- `body-annotations-male-cns-v1.0-minconf-0.5.feather`
- `connectome-weights-male-cns-v1.0-minconf-0.5.feather`

## Modifications

Shape of the World, 2026-09-12: retain `status == Traced` cells with a measured `somaLocation`; sort by body ID; assign display colours from annotated superclass; transform 8nm voxel positions using `(x-48000, y-37000, 72000-z)/14000`. This is a uniform scale, translation and axis flip, not a registration to the flybody specimen. Retain only edges between displayed cells with at least five contacts and at most the three strongest outgoing edges per source. Ties are broken by ascending target body ID. No connection is invented.

Binary nodes: 24-byte little-endian records of three float32 display coordinates, uint32 body ID, uint32 display group and uint32 type index. Edges: six uint32 values per cell, alternating target index/contact count for three slots; a zero count means absent. The manifest contains the label table, source/output hashes and exact counts.

Reproduce: `src/components/experiences/worlds/flybody/export-neural.py`, Python3.12, numpy2.2.6, pyarrow21.0.0. Raw Feather files remain in the ignored `.scratch/flybody-malecns` cache; runtime ships only reduced binary data and metadata via Static Assets. This is a bounded, locally reproducible dataset below the world's 12MB transfer target; it introduces no remote service dependency. App/offline packaging is not verified.

## What the animation means

Points are soma locations, not complete neuron morphology. Straight lines encode measured directed connectivity, not axon trajectories. Light pulses illustrate three graph steps, not measured or simulated spikes. Cutting a branch excludes one downstream vertex in this reduced graph; reachability is not a prediction of neural firing or animal behaviour. Omitted nodes, weaker connections, neurotransmitters, physiology and plasticity are not modelled. The male neural specimen and the separate female flybody mesh are not the same animal or a coupled brain/body simulation.

The slvDev ping-pong and FLY ATLAS posts motivated the exploration; no code, trained weights, recordings or visual assets were copied from those posts. The reported game performance was not reproduced.
