# Nuclear-bomb · sources and scope

This is a museum-level illustration of the order of layers and events. Geometry is original and deliberately not to scale. It contains no engineering specifications. Source pages were checked on 2026-10-23.

## Chain-reaction physics

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
- The first twelve generations are a seeded abstract illustration in a dense, dark field of nuclei. Its spherical front is a visual arrangement, not a spatial simulation. Generations 12–14 crossfade back to the closed cutaway; internal emission then represents cumulative energy. Changing time only samples this fixed illustration. No particle state is accumulated.
- At the endpoint the physical clock freezes. A separate two-second presentation clock fades white back to a dim, closed cutaway with a residual red glow; it can also be played backward. The numerical summary stays in the readout panel. Scrubbing directly to the physical endpoint shows its white frame. No numerical “disassembly duration” is added to the physical clock.
- All geometry and animation are programmatically authored for this project. No third-party models, images or textures are incorporated.

## Exterior reference

The [National Naval Aviation Museum display article](https://navalaviationmuseum.org/museum-marches-to-commemorate-end-of-world-war-ii/) documents a Fat Man exterior replica. The elongated painted shell and open tail frame are broad visual references only. The decorative flange, bolts and museum cradles are original display geometry; no historical engineering dimensions are reproduced. No source image is embedded in the experience.

## Effects view: fixed illustrative relations

`W` is the TNT-equivalent yield in kilotons. The slider is logarithmic over `0.001 ≤ W ≤ 50,000`, while distances in the scene are linear. Below 1 kt, only the energy equivalence is displayed: no fireball, height or effect circles are calculated or shown. The visual model is bounded to this range and is not a general prediction tool.

| Quantity | Relation used, in km unless noted | Source and interpretation |
| --- | --- | --- |
| Energy | `4.184 × 10^12 × W` joules; `1,000 × W` tons TNT | [TNT equivalent](https://en.wikipedia.org/wiki/TNT_equivalent#Kiloton_and_megaton). |
| Illustrative air-burst height | `0.2 × W^(1/3)` | The height family accompanying the [Wikipedia effects summary table](https://en.wikipedia.org/wiki/Effects_of_nuclear_explosions#Summary_of_the_effects). This fixed comparison condition is not an optimization for any target or overpressure. |
| Maximum fireball radius | `0.06096 × W^0.4` | Glasstone & Dolan, *The Effects of Nuclear Weapons* (1977), [§2.127](https://www.atomicarchive.com/resources/documents/effects/glasstone-dolan/chapter2.html): air-burst breakaway radius approximately `100 × W^0.4` feet; maximum radius approximately twice the breakaway radius. Converting twice that radius to km gives the displayed coefficient. |
| 20 psi (about 140 kPa) ground range | `0.24 × W^(1/3)` | Cube-root scaling from [§§3.60–3.61](https://www.atomicarchive.com/resources/documents/effects/glasstone-dolan/chapter3.html); reference coefficient from the summary table’s 1 Mt column, 2.4 km divided by 10. |
| 5 psi (about 34 kPa) ground range | `0.62 × W^(1/3)` | The same scaling; reference coefficient from 6.2 km at 1 Mt, divided by 10. |
| 1 psi (about 6.9 kPa) ground range | `1.72 × W^(1/3)` | The project brief explicitly fixes this coefficient. The current summary table rounds its 1 Mt value to 17 km, which implies **1.70**, not 1.72. The supplied 1.72 is preserved as an exhibit approximation, not attributed as an exact derivation from that table. |
| Third-degree-burn ground range, clear skies | Log-log interpolation of `(W, km) = (1, 0.6), (20, 2.5), (1,000, 12), (20,000, 38)` | The four anchors are the summary table’s third-degree-burn row. Above 20 Mt the last log-log segment is extrapolated only as far as the 50 Mt exhibit limit. |

The book sections above were checked in Atomic Archive’s transcription of the 1977 text. The government-hosted full-book PDF could not be retrieved during this check; it is not presented as separately verified evidence.

Verification examples calculated by `effects.ts`:

| Yield | Maximum fireball radius | Illustrative height | 5 psi ground range | Third-degree-burn ground range |
| --- | --- | --- | --- | --- |
| 15 kt | 0.18009 km | 0.49324 km | 1.52905 km | 2.17982 km |
| 1,000 kt | 0.96615 km | 2 km | 6.2 km | 12 km |
| 50,000 kt | 4.61990 km | 7.36806 km | 22.84100 km | 54.06305 km |

At 50,000 kt the 1 psi circle is 63.36534 km. Tests verify that the fireball radius stays below the illustrative height **within 1–50,000 kt only**. No claim is made for unbounded yields.

The abstract city has no real geographic location, population or casualty estimate. The circles assume flat ground and clear skies. Buildings, terrain, shielding, reflections, weather, fallout and radiation are not modelled. The source table itself cautions that simple scaling can overestimate real-world effects. A fireball radius in the air and a ground-effect radius are distinct quantities. Historical yield presets change only this comparison’s energy input; they do not reconstruct each historical event’s actual conditions. The marker height and circles appear together to explain scale, not to choose a real detonation condition.

## Historical yield presets

The first two presets are energy-unit references, not historical events: 1 ton TNT (`0.001 kt`) and 1 kt. The remaining seven use the following dates and widely cited approximate yields. Source use is limited to these public historical facts.

| Preset | Year | Yield | Source |
| --- | --- | --- | --- |
| Hiroshima / Little Boy | 1945 | 15 kt | [Little Boy](https://en.wikipedia.org/wiki/Little_Boy) |
| Nagasaki / Fat Man | 1945 | 21 kt | [Fat Man](https://en.wikipedia.org/wiki/Fat_Man) |
| China’s first atomic test / 596 | 1964 | 22 kt | [596](https://en.wikipedia.org/wiki/596_(nuclear_test)) |
| China’s first hydrogen-bomb test / Test No. 6 | 1967 | 3,300 kt | [Test No. 6](https://en.wikipedia.org/wiki/Test_No._6), currently redirects to Project 639 |
| Ivy Mike | 1952 | 10,400 kt | [Ivy Mike](https://en.wikipedia.org/wiki/Ivy_Mike) |
| Castle Bravo | 1954 | 15,000 kt | [Castle Bravo](https://en.wikipedia.org/wiki/Castle_Bravo) |
| Tsar Bomba | 1961 | 50,000 kt | [Tsar Bomba](https://en.wikipedia.org/wiki/Tsar_Bomba) |

The Tsar Bomba article notes historical estimates from 50 to 58 Mt; this exhibit retains its common 50 Mt reference. Little Boy and Fat Man yields are estimates, not exact measurements. No internal specifications are extracted from these articles.

## Historical timeline

Dates and claims were checked against the linked articles on 2026-10-23. Month-only dates retain that precision. The “Today” endpoint marks the present day; it adds no claim about present policy or treaty status.

| Date | Fact used | Source |
| --- | --- | --- |
| 1938-12 | Hahn and Strassmann’s fission discovery; Meitner and Frisch publish its explanation in early 1939 | [Discovery of nuclear fission](https://en.wikipedia.org/wiki/Discovery_of_nuclear_fission) |
| 1942-12-02 | First human-made, self-sustaining nuclear chain reaction | [Chicago Pile-1](https://en.wikipedia.org/wiki/Chicago_Pile-1) |
| 1945-07-16 | Trinity, first nuclear explosion | [Trinity](https://en.wikipedia.org/wiki/Trinity_(nuclear_test)) |
| 1945-08-06 / 1945-08-09 | Hiroshima and Nagasaki; estimated deaths by the end of 1945, respectively 90,000–166,000 and 60,000–80,000 | [Atomic bombings of Hiroshima and Nagasaki](https://en.wikipedia.org/wiki/Atomic_bombings_of_Hiroshima_and_Nagasaki) |
| 1949-08-29 | First Soviet nuclear test | [RDS-1](https://en.wikipedia.org/wiki/RDS-1) |
| 1952-11-01 | First full-scale two-stage thermonuclear test | [Ivy Mike](https://en.wikipedia.org/wiki/Ivy_Mike) |
| 1954-03-01 | Castle Bravo, about 15 Mt | [Castle Bravo](https://en.wikipedia.org/wiki/Castle_Bravo) |
| 1961-10-30 | Tsar Bomba, largest nuclear test conducted, about 50 Mt | [Tsar Bomba](https://en.wikipedia.org/wiki/Tsar_Bomba) |
| 1963-08-05 | Partial Test Ban Treaty signed | [Partial Nuclear Test Ban Treaty](https://en.wikipedia.org/wiki/Partial_Nuclear_Test_Ban_Treaty) |
| 1964-10-16 | China’s first nuclear test; same-day no-first-use declaration | [596](https://en.wikipedia.org/wiki/596_(nuclear_test)); [No first use, China](https://en.wikipedia.org/wiki/No_first_use#China) |
| 1967-06-17 | China’s first hydrogen-bomb test, 3.3 Mt | [Test No. 6](https://en.wikipedia.org/wiki/Test_No._6) |
| 1968-07-01 | Non-Proliferation Treaty opened for signature | [Treaty on the Non-Proliferation of Nuclear Weapons](https://en.wikipedia.org/wiki/Treaty_on_the_Non-Proliferation_of_Nuclear_Weapons) |
| 1996-09-24 | Comprehensive Nuclear-Test-Ban Treaty opened for signature | [Comprehensive Nuclear-Test-Ban Treaty](https://en.wikipedia.org/wiki/Comprehensive_Nuclear-Test-Ban_Treaty) |

Source-check clarifications:

- Meitner and Frisch formed their explanation around Christmas 1938; the relevant papers appeared in early 1939. The display says “publish its explanation” to distinguish publication from conception.
- The 1967 China entry says that this exhibit does not display the internal configuration. It does not make the unsupported blanket claim that no configuration information is public.
- The CTBT’s opening for signature on 24 September 1996 is distinct from its adoption on 10 September.
- The casualty ranges are historical estimates through the end of 1945. They are never derived from, or altered by, the scale controls.

## Calendar-month comparison

The bars compare each country’s first atomic test with its first two-stage or megaton-scale thermonuclear test. Width is linear from zero. Code computes **complete calendar months**, without rounding up remaining days. These are dates of milestones, not scores of scientific or national capability.

| Country | Start | End | Complete months |
| --- | --- | --- | --- |
| United States | [Trinity](https://en.wikipedia.org/wiki/Trinity_(nuclear_test)), 1945-07-16 | [Ivy Mike](https://en.wikipedia.org/wiki/Ivy_Mike), 1952-11-01 | 87 |
| Soviet Union | [RDS-1](https://en.wikipedia.org/wiki/RDS-1), 1949-08-29 | [RDS-37](https://en.wikipedia.org/wiki/RDS-37), 1955-11-22 | 74 |
| United Kingdom | [Operation Hurricane](https://en.wikipedia.org/wiki/Operation_Hurricane), 1952-10-03 | [Grapple X](https://en.wikipedia.org/wiki/Operation_Grapple#Grapple_X), 1957-11-08 | 61 |
| France | [Gerboise Bleue](https://en.wikipedia.org/wiki/Gerboise_Bleue), 1960-02-13 | [Canopus](https://en.wikipedia.org/wiki/Canopus_(nuclear_test)), 1968-08-24 | 102 |
| China | [596](https://en.wikipedia.org/wiki/596_(nuclear_test)), 1964-10-16 | [Test No. 6](https://en.wikipedia.org/wiki/Test_No._6), 1967-06-17 | 32 |

Hurricane uses the local date of 3 October; its UTC date is 2 October. China’s interval is 32 complete months plus one day, shown as 2 years and 8 months.

## Scope

Only the implosion cutaway is available. Gun-type and thermonuclear internal configurations are not implemented. The scale and history views add effects comparisons and historical facts, without extending the internal construction model. No new weapon architecture, material specification, critical calculation or operational procedure is provided.
