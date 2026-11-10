# The wind machine / 风的发电机

A freely explorable coastal wind farm, original mechanical cutaway, reference
blade laboratory and schematic electrical conversion chain. It combines NREL
5-MW reference aerodynamic data with original geometry and a deliberately
simplified controller. It is **not OpenFAST, a manufacturer's CAD model, a
calibrated commercial turbine power curve, or a wind-farm engineering tool**.

## Reference data and licensing

`reference-data.json` is adapted from the Apache-2.0-licensed
[OpenFAST/r-test](https://github.com/OpenFAST/r-test/tree/dd5feaaaa500ba7283140107806300d551cff0a7/glue-codes/openfast/5MW_Baseline),
pinned to commit `dd5feaaaa500ba7283140107806300d551cff0a7` (retrieved 2026-10-30).
The accompanying `LICENSE-OpenFAST` is retained in full. These third-party data
retain that license; the repository's original-content license does not replace
it. No external photographs, textures, 3D assets, animation code or audio are used.

Changes from upstream are recorded in the JSON metadata:

- Selected 19 radial blade stations from
  `NRELOffshrBsline5MW_AeroDyn_blade.dat`, retaining span, chord, twist and airfoil
  index. The 61.4999 m numerical endpoint is retained.
- Retained the complete tabulated angle-of-attack / lift / drag polars for
  Cylinder1, Cylinder2, DU40, DU35, DU30, DU25, DU21 and NACA64, dropping unused
  dynamic-stall and moment fields from the runtime table.
- Retained each airfoil's source-description comments: the DOWEC data attribution,
  Koert Lindenburg / ECN provenance and Jason Jonkman's rotational-stall and
  Viterna corrections remain in the data notes.
- Resampled the supplied `*_coords.txt` closed perimeters from 399 contour points
  to 96 equal-perimeter samples, retaining their supplied reference points.
  A loft through these sections uses the reference chord and twist. Prebend and
  sweep are omitted from this rigid display geometry. End caps and root/hub
  transitions are visual closures rather than production blade tooling.

Original code is AGPL-3.0-only; original visual content follows the repository's
CC BY-NC 4.0 policy. The OpenFAST data exception is identified above.

## Primary references

1. Jonkman, Butterfield, Musial and Scott (2009),
   [Definition of a 5-MW Reference Wind Turbine for Offshore System Development](https://www.nrel.gov/docs/fy09osti/38060.pdf),
   NREL/TP-500-38060. Major dimensions, rated speed, gear ratio, generator
   efficiency and brake torque are used as reference quantities. No report
   illustrations or product geometry are copied.
2. [OpenFAST: AeroDyn Theory](https://openfast.readthedocs.io/en/main/source/user/aerodyn/theory.html).
   Background on blade element momentum and the distinction between steady BEM,
   dynamic induction and structural/other model layers. This implementation is
   an independent elementary fixed-point BEM, not AeroDyn's constrained solver.
3. [U.S. DOE: How Do Wind Turbines Work?](https://www.energy.gov/cmei/systems/how-do-wind-turbines-work).
   The lift-driven rotor, gearbox/generator, pitch and yaw mechanisms.
4. [OpenFAST reference data](https://github.com/OpenFAST/r-test/tree/dd5feaaaa500ba7283140107806300d551cff0a7/glue-codes/openfast/5MW_Baseline),
   with the exact data and license described above.

## Reference and chosen parameters

| Quantity | Value | Meaning |
| --- | ---: | --- |
| Rotor radius / blades | 63 m / 3 | NREL reference |
| Hub radius / height | 1.5 m / 90 m | NREL reference |
| Nominal rated electrical power | 5 MW | NREL reference; enforced generator cap |
| Rated rotor / generator speed | 12.1 / 1173.7 rpm | NREL reference |
| Gearbox speed ratio | 97:1 | NREL reference, ideal lossless transmission |
| Generator efficiency | 94.4% | NREL reference; all remaining input counted as loss |
| Cut-in / cut-out wind | 3 / 25 m/s | NREL reference operating markers |
| Reference air density | 1.225 kg/m³ | Fixed reference, no atmospheric solver |
| High-speed-shaft brake torque | 28,116.2 N·m | NREL reference |
| Brake engagement ramp | 0.6 s | Reference deployment interval; release uses the same display ramp |
| Pitch actuator rate | 8°/s | Reference magnitude |
| Yaw actuator rate | 0.3°/s | Teaching actuator choice |
| Reflected rigid inertia | 4×10⁷ kg·m² | Chosen representative, not a reconstructed mass matrix |
| Wind response time | 3 s | Chosen smooth approach to the input target |
| Sub-rated torque law references | Cp 0.482 / TSR 7.55 | Reference design targets, not a fit to displayed output |
| Display tower height | 87.6 m | Hub is above the tower top, at 90 m; rigid geometry |
| Tower diameter | 6 → 3.87 m | Reference taper |
| Shaft tilt / blade precone | 5° / 2.5° | Display orientation references |
| Generator poles / line voltage | 3 pole pairs / 690 V | Chosen teaching electrical circuit |
| Grid step-up / frequency | 33 kV / 50 or 60 Hz | Chosen ideal electrical circuit |

The coastal ground is original procedural scenery. Other turbines provide scale
and composition, sharing the reference rotor state with phase offsets. Readings
and accumulated energy belong only to the foreground machine. No farm production
sum, wake model, terrain-flow calculation or actual geographic site is claimed.

## Aerodynamics

Eighteen annuli span the 19 blade stations. Chord and twist are averaged over each
annulus; its inboard reference airfoil selects a linearly interpolated polar.
The local reference flow is:

```
Uaxial = max(0, U cos(yawError)) × (1 − a)
Utangential = ω r (1 + a')
φ = atan2(Uaxial, Utangential)
α = φ − twist − collectivePitch
Cn = Cl cosφ + Cd sinφ
Ct = Cl sinφ − Cd cosφ
```

A relaxed fixed-point iteration (18 iterations) estimates axial and swirl
induction using solidity `B c / (2πr)` and Prandtl tip/root factors. Axial induction
is limited to [−0.15, 0.48], swirl to [−0.2, 0.4] to keep the teaching iteration
finite. This is not a modern robust Buhl/high-induction or skewed-wake treatment.
Loads are integrated as:

```
dL = ½ ρ W² c Cl B dr
dD = ½ ρ W² c Cd B dr
dT = dL cosφ + dD sinφ
dQ = (dL sinφ − dD cosφ) r
Paero = ΣdQ × ω
Pwind = ½ ρ πR² U³
```

If this elementary approximation yields positive extraction above
`(16/27) Pwind cos³(yawError)`, all integrated loads are scaled to that bound and
the interface displays a model-limit notice. `rawCp` remains available in the
pure-model result for inspection. The bound is explicit, not evidence that the
underlying fixed-point model is reliable in high induction. Negative aerodynamic
power at a feathered or coasting rotor is retained as aerodynamic dissipation.
No dynamic stall, Reynolds interpolation, elasticity, turbulent inflow, wind
shear, tower shadow, aeroacoustics or neighboring wakes are calculated.

The blade section view uses blade-attached coordinates. Its nodal readouts
recompute relative velocity and angle using that node’s own radius, twist and
foil, with the nearest annulus’s induction estimate. Thus the displayed identity
`alpha = inflow − nodalTwist − pitch` remains consistent. Lift/drag directions
follow the local relative-flow angle, but arrow lengths are illustrative. The
view is not a pressure field or a CFD result. The blade mesh and the aerodynamic
model use the same chord/twist/foil table; the whole blade is rigid.

## Control, dynamics and accounting

The controller is our teaching design. Below rated speed it uses a `Kω²` opposing
torque law and a smooth transition to the capped rated electrical power near
rated speed. A feed-forward pitch schedule is solved from this BEM at rated
speed, combined with proportional/integral speed feedback. Pitch and yaw have
finite rate limits. A 3-second first-order wind response avoids an instantaneous
wind discontinuity. This does not reproduce the NREL/OpenFAST controller,
region boundaries or measured transient response.

Low-speed-shaft dynamics use `J dω/dt = Qaero − Qgenerator − Qbrake`, with a maximum
0.15-second integration substep. Speed cannot reverse in this teaching model.
Cut-out wind or 120% rated rotor speed latches shutdown. Feathering and a ramped
mechanical brake then stop the rotor. After wind falls below cut-out and the
manual brake is released, the user can release the latch. This simplified
shutdown/restart state machine is original; it is not a turbine safety controller.

Instantaneous accounting is calculated from those same torques:

```
Pshaft = Qgenerator × ω
Pelectric = 0.944 × Pshaft
PgeneratorLoss = Pshaft − Pelectric
Pbrake = Qbrake × ω
Pstorage = Paero − Pshaft − Pbrake
```

Thus `Paero = Pelectric + PgeneratorLoss + Pbrake + Pstorage`. Accumulated kWh
integrate `Pelectric dt`. The displayed gearbox is ideal and lossless. Converter
and transformer are also ideal; no fictitious additional energy is created by
the voltage step-up. Unextracted wind power is not assigned to a simulated wake.

## Original mechanical layout

The overall 97:1 ratio is reference data; the three-stage layout is original:

- First planetary: fixed ring 72, sun 18, three 27-tooth planets → `1+72/18 = 5`.
- Second planetary: fixed ring 96, sun 24, three 36-tooth planets → `1+96/24 = 5`.
- Final external pair: 97-tooth wheel / 25-tooth pinion → `97/25 = 3.88`.
- Total magnitude: `5 × 5 × 3.88 = 97`. The final external mesh reverses direction.

For each planetary stage the carrier follows its input, the sun rotates five
carrier turns, and each planet both orbits and spins, obeying the fixed-ring
kinematic relation. The tooth counts permit three equally spaced planets.
Tooth profiles, bearings, brake calipers and supports are original explanatory
geometry; contact stress, lubrication, tolerances and detailed bearing or tooth
contact are not solved. Explosion separates display parts, not service steps.

## Electrical representation

The original schematic generator has three pole pairs, so normalized three-phase
traces use `phase = 3 × generatorAngle` and `f = 3 × generatorRPM / 60`. They are
phase illustrations, not solved terminal-voltage or current waveforms. The
reference line voltage is held at 690 V and current is the ideal unity-power-
factor RMS `Pelectric/(√3 × 690 V)`. A schematic AC/DC/AC stage then produces the
selected fixed grid frequency and an ideal transformer steps to 33 kV. No DFIG,
field winding, power-electronics switching, grid faults, reactive power or actual
reference-machine electromagnetic design is claimed.

## Verification

Pure-model tests cover source dimensions and polars, Cp bounds over a parameter
sweep, yaw/feather response, 97:1 speed and planetary assembly constraints, the
instantaneous energy identity, steady rated operation, actuator rates and
brake/cut-out/restart states. Browser QA covers the farm, cutaway, blade/section
and electrical paths, wind/pitch/load changes, pause/time controls, orbit, mobile
layout, guide operation, English coverage and resource errors. Posters are
actual renders of this world, with no unrelated imagery.

## Inspectable blade stations and polars (2026-10-30)

The 19 cross-section ribs use the same OpenFAST `reference-data.json` perimeter, chord, reference axis and twist transformation as the blade loft; 0.6% radial expansion prevents z-fighting and does not change aerodynamic inputs. The selectable station map follows the same indices as the existing radius slider.

The polar plot samples the exact `polar()` linear interpolation already used by the BEM calculation, with 241 samples across ±30° or ±180°. Cl and Cd have **separate, labelled vertical axes** and both are dimensionless; axes expand to the actual table range. The live dots are the selected nodal section's existing `sectionSample()` alpha and coefficients, with the same nearby annular induction approximation. An angle outside the current horizontal range hides both dots and explicitly offers full-range viewing. It is reference-table visualization, not measured live data or a newly computed CFD field. No third-party plot or image is copied.

The optional transparent skin reveals the same airfoil-outline loft, not internal spars, laminate lay-up or a structural cutaway. No fabricated internal blade structure is shown.
