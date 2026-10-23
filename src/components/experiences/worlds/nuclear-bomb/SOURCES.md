# Nuclear-bomb · sources and scope

This is a museum-level illustration of the order of layers and events. Geometry is original and deliberately not to scale. It contains no engineering specifications. Source pages were checked on 2026-10-23.

## Physics used in this round

| Quantity | Value used | Source and interpretation |
| --- | --- | --- |
| Energy per fission | 3.20 × 10⁻¹¹ J | [Nuclear fission](https://en.wikipedia.org/wiki/Nuclear_fission#Output): approximately 200 MeV, rounded for this illustration. |
| TNT-equivalent energy | 1 kt = 4.184 × 10¹² J | [TNT equivalent](https://en.wikipedia.org/wiki/TNT_equivalent#Kiloton_and_megaton): a conventional energy unit. |
| Time per generation | 10 ns | [Shake (unit)](https://en.wikipedia.org/wiki/Shake_(unit)): an order-of-magnitude teaching approximation, not a measured clock for the displayed object. |
| Fission and chain reactions | Splitting releases fragments and further neutrons | Atomic Heritage Foundation / National Museum of Nuclear Science & History, [Science Behind the Atom Bomb](https://ahf.nuclearmuseum.org/ahf/history/science-behind-atom-bomb/), section “Fission”. Only the broad explanation of fission is used. |

## Mathematical and visual simplifications

- Each generation has twice as many fissions as the preceding one. This is an idealized branching model; the displayed two or three emitted neutrons do not imply that every neutron causes another fission.
- After `g` generations, the cumulative count is `2^g − 1`. Values between whole generations are a smooth interpolation. A 15 kt reference energy therefore requires approximately `1.96 × 10^24` fissions, about 81 generations and about 0.81 microseconds. The value is a teaching example, not a prediction for the displayed historical casing.
- The last `m` generations account for approximately `1 − 2^(−m)` of the total energy. The small finite-series correction is negligible at the illustrated generation count. The code computes these results; the time and energy axes remain linear.
- The chemical segment has a separate, unitless storyboard coordinate. Its screen duration is an editorial choice. No physical duration or slowdown factor is assigned to that segment.
- Chain playback gradually changes from 2.5 to 0.3 screen seconds per generation. The slowdown readout uses the instantaneous speed, including the user-selected playback rate.
- Internal layer thicknesses, spacing, displayed compression, particle paths, particle size, and heat colors are chosen for legibility. They do not reproduce measured structures, temperatures or motion. The heat field represents cumulative energy, not a temperature calculation.
- The first twelve generations are a seeded abstract illustration; subsequent generations use a continuous light field. Changing time only samples this fixed illustration. No particle state is accumulated.
- The endpoint stays on a white field. The illustration adds no numerical “disassembly duration” to the physical clock.
- All geometry and animation are programmatically authored for this project. No third-party models, images or textures are incorporated.

## Not implemented in this round

Gun-type and thermonuclear configurations, effects at a distance, and the historical timeline are outside this round. No scaling coefficient or effect-radius claim is taken from *The Effects of Nuclear Weapons* here.
