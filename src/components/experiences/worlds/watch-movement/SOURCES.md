# The machinery of time / 时间的机芯

An original, hand-wound teaching movement. No branded CAD, teardown photographs,
third-party geometry, textures, audio or animation code are used. Geometry and
finishing are procedural; the tick sound is synthesized after an explicit user
request. Project code: AGPL-3.0-only; original content: CC BY-NC 4.0, under the
repository licensing policy.

## Mechanisms and references

- [Habring², Foudroyante 2010](https://www.habring2.com/index.php/en/291-press/press-info/119-foudroyante-2010-pressinfo): the manufacturer describes a 4 Hz balance, eight half-swings per second, and one half-tooth release per beat. This supports the beat-counting mechanism; no product geometry, images or patented complication is reproduced.
- [Fondation Haute Horlogerie, Balance spring](https://www.hautehorlogerie.org/en/watches-and-culture/watchmaking-knowledge/encyclopedia/balance-spring): the active spring length and balance inertia set the period; changing active length regulates the rate.
- [KHK, Calculation of Gear Dimensions](https://khkgears.net/new/gear_knowledge/gear_technical_reference/calculation_gear_dimensions.html): reference pitch diameter `d = mz` and external mesh center distance `a = m(z₁ + z₂)/2`. Original layout uses these equations. No diagrams are copied.
- [Horopedia, Ruby / Jewel](https://horopedia.org/ruby-jewel/): synthetic corundum is used for low-wear pivot bearings and pallets.
- [Horopedia, Motion work](https://horopedia.org/motion-work-2/): the separate reduction between the minute indication and hour indication. Our displayed 10:40 and 12:36 train is an original illustrative arrangement.

References consulted 2026-10-30. Sources are factual references only; no third-party
art assets are bundled. The model is not a replica of any manufacturer's calibre.

## Designed parameters

Dimensions below are chosen for this teaching movement, not measured from a real
watch. Coordinate units are millimetres; plate diameter is 25.8 mm.

| Driver | Driver teeth | Driven pinion leaves | Module (mm) | Speed multiplier |
| --- | ---: | ---: | ---: | ---: |
| Barrel | 96 | 12 | 0.100 | −8 |
| Center | 80 | 10 | 0.075 | −8 |
| Third | 75 | 10 | 0.065 | −7.5 |
| Fourth | 96 | 6 | 0.035 | −16 |

The center arbor turns once per indicated hour. Its downstream compound ratio is
`8 × 7.5 × 16 = 960`, so the escape wheel turns 16 times per indicated minute.
With 15 escape teeth and two beats per tooth, `16 × 15 × 2 / 60 = 8 beats/s`.
The fourth wheel turns 60 times per center turn, hence once per indicated minute.
The barrel turns once per eight indicated hours, in the opposite direction to
the center wheel. At reference regulation the indication and physical elapsed
time agree. Changing frequency leaves all tooth ratios fixed and changes the
rate, as it would in a mechanical counter driven by a different oscillator.

Every compound gear and its pinion share one rotation. The animated angular
positions use the same integer beat count as the hands; no gear has an independent
animation speed. Initial angular phases are solved to present tooth/gap alignment
at every mesh. Pitch-center distances and signed velocity ratios are tested.
The separate motion works use 10 → 40 and 12 → 36, a total 12:1 reduction.
The winding display uses 40 → 50 → 50 → 60, a signed −2/3 ratio from
crown reference rotation to the barrel ratchet; the perpendicular input transfer
is depicted schematically. Winding-wheel pitch center distances use module 0.08 mm.
A nonlinear radial ribbon mapping compacts the mainspring as reserve increases;
this is a legibility deformation, not a constant-length elastic-rod solution.

## Calculated oscillator and counted time

For an ideal torsional oscillator, `f = sqrt(κ/I)/(2π)`. Holding material and
cross section fixed, active spring length is modeled with `κ ∝ 1/L`:

```
f = 4 / sqrt(lengthScale × inertiaScale) Hz
rateSecondsPerDay = (f/4 − 1) × 86400
completedBeatSeconds = integerHalfSwings / 8
displayedIndication = interpolatedReleaseCount / 8
```

This ideal isochronous oscillator is prescribed rather than numerically solving
contact and torque transfer. Lower stored energy reduces the *displayed* balance
amplitude through a chosen smooth mapping. The hands and digital indication share the gear train’s release interpolation.
The ideal frequency does not change
with amplitude; the model does not claim to reproduce real low-amplitude rate
errors. The on-screen scope is this ideal balance-angle trace, not a microphone
measurement or timegrapher diagnostic.

## Explicit illustration limits

- Gear teeth use truncated involute-style geometry for clear motion. Real watch
  teeth often use cycloidal or specialized profiles; these shapes are not
  manufacturing drawings. Undercut, tooth interference, stress, contact, oil,
  backlash and tolerances are not solved.
- The 15-tooth escape wheel and pallet fork show the lever-escapement sequence,
  but contact faces, fork reach and banking are simplified. A beat releases half
  a tooth pitch over a prescribed 18% of the beat (6% unlocking, 12% impulse), then
  locks. This window is a display choice, not a measured lift angle.
- Hairspring geometry breathes with a fixed outer endpoint and rotating inner
  endpoint. It is a smoothly deformed spiral ribbon, not a solved elastic rod.
- Reference energy is normalized from 0–1. A full store corresponds to 40 h at
  reference load; load drains energy proportionally. Twenty-four reference crown
  turns fill that store. These are intentional interaction parameters, not
  claims about an actual watch's reserve or winding count.
- Exhaustion freezes the mechanism; rewinding resumes it. Real start-up impulse,
  frictional stalling, amplitude decay after exhaustion, beat error and shock
  response are not modeled.
- Ruby colors, pivot diameters and bevels are enlarged for legibility. Bridge
  shapes and arbor lengths are original display geometry. Upper supports are
  selectively omitted to expose operation. Exploded trajectories are display
  layouts, not a safe servicing order.
- The skeleton dial and small-seconds indication expose their separate arbors;
  dial and bridges may be hidden to explore internal parts. Hand motion is
  counted directly from the same train. Higher time multipliers are temporal
  sampling, not a physically slower oscillator.
- Tick sound is a short synthesized alternating triangle-wave pulse, not a real
  acoustic recording or a model of specific collision acoustics.

## Verification

`model.test.ts` checks every mesh ratio and center distance, 4 Hz counting,
minute/escape rotations, locked-phase invariance, frequency/length/inertia,
reserve exhaustion, load behavior and frame-subdivision invariance. Browser QA
checks freely orbiting/zooming, all four observation views, paused single-beat
stepping, winding/restart, exploded layers, lab controls and both languages on
desktop and phone. Screenshots used for posters are renders of this scene.

## Instrument presentation (2026-10-30)

The fine overlapping brushing in the plate bump map is generated locally with Canvas; it is a surface finish illustration, not metrology or material simulation. Added rim/hub turning marks do not change gear pitch circles, tooth counts or physical timing. Camera fitting uses a bounding sphere and actual viewport field of view so the mechanism clears the transport bar. No external textures or environment images.

The open-work mainplate's four clearance pockets are an original display-calibre design, not a historical calibre reconstruction. Tests require a supported margin around every wheel/balance pivot and the plate perimeter. They do not calculate plate stiffness or production tolerances.
