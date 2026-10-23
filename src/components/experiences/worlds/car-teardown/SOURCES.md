# Car teardown — model, provenance and limits

This is an original, fictional front-engine, rear-wheel-drive sedan. It does not reproduce a production car or a manufacturer's CAD. Every numerical specification below is a representative design choice, not a measurement attributed to a real vehicle. `vehicle-spec.ts` is the dimensional source of truth; all distances in code are metres unless the field says otherwise.

这是一辆原创、虚构的前置后驱轿车，不对应真实车型。下列数值均为本作品选取的代表值，不是对某款汽车的测量。几何和运动学共用 `vehicle-spec.ts`，代码中的长度默认使用米。

## Representative specifications / 代表规格

| Item                                          | Value                                                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Axes                                          | Forward +X, up +Y, vehicle right +Z. Ground y = 0. Origin below the axle midpoint. Driver sits on −Z.         |
| Length / width / height                       | 4.85 / 1.85 / 1.45 m                                                                                          |
| Wheelbase; front / rear overhang              | 2.85 m; 0.95 / 1.05 m                                                                                         |
| Front / rear axle X                           | +1.425 / −1.425 m                                                                                             |
| Front / rear track                            | 1.58 / 1.60 m                                                                                                 |
| Tyre                                          | 235/40 R19; nominal diameter 670.6 mm; rolling radius 0.335 m                                                 |
| Ground clearance; mass; front load fraction   | 0.14 m; 1,550 kg; 52%                                                                                         |
| Engine                                        | Longitudinal inline-four, DOHC, 16 valves, naturally aspirated                                                |
| Bore × stroke; rod length; crank radius       | 86 × 86 mm; 145 mm; 43 mm                                                                                     |
| Calculated displacement; compression ratio    | 1,998.229 cc; 10.5:1                                                                                          |
| Cylinder spacing; cylinder 1 X; crank Y       | 96 mm; +1.35 m; 0.38 m                                                                                        |
| Firing order; firing TDC offsets              | 1–3–4–2; cylinder 1: 0°, 3: 180°, 4: 360°, 2: 540°                                                            |
| Idle / redline                                | 800 / 6,500 RPM                                                                                               |
| Intake open / close; peak lift                | 350° / 590° after firing TDC; 9.5 mm at 470°                                                                  |
| Exhaust open / close; peak lift               | 130° / 370° after firing TDC; 9.0 mm at 250°                                                                  |
| Cam base radius; timing sprockets             | 18 mm; crank 20 teeth / each cam 40 teeth                                                                     |
| Spark advance (illustrative)                  | 10° at 800 RPM, linear to 32° at 4,000 RPM, then constant; flash lasts 20°                                    |
| Screen slowdown choices                       | 1/10, 1/40, 1/100, 1/400; displayed separately from physical RPM                                              |
| Gearbox                                       | Five-speed longitudinal three-shaft manual; fourth locks input to output directly                             |
| Constant-mesh input / layshaft pair           | 22 / 32 teeth                                                                                                 |
| First / second / third / fifth                | 15→39 / 21→33 / 26→28 / 35→19 teeth                                                                           |
| Reverse                                       | 13→idler→36 teeth; reversed output direction                                                                  |
| Final drive                                   | 11→41 teeth, ratio 41/11                                                                                      |
| Differential side / planet gears              | 16 / 10 teeth; two planets                                                                                    |
| Gear generation defaults                      | Normal module 2 mm, normal pressure angle 20°, illustrative helix angle 22°                                   |
| Steering                                      | Ideal Ackermann prepared for a later round; ratio 15:1, wheel limit ±540°                                     |
| Front / rear brake discs                      | Ø320 × 28 mm ventilated / Ø300 × 12 mm solid                                                                  |
| Front / rear caliper pistons                  | Ø57 / Ø38 mm                                                                                                  |
| Brake pedal ratio; illustrative full pressure | 3.5:1; 100 bar                                                                                                |
| Suspension model parameters, reserved         | Sprung / unsprung mass 360 / 40 kg; spring 30 kN/m; damping 3,000 N·s/m; tyre stiffness 250 kN/m; bump 0.05 m |
| Electrical                                    | 12 V battery; alternator pulley speed ratio 2.7:1                                                             |

Assembly locations: radiator x = 1.95 m; gearbox clutch x = 0.85 m, output x = 0.20 m at crank height; driveshaft extends to x = −1.30 m; differential x = −1.425 m, y = 0.335 m; steering rack (1.30, 0.28, 0), steering wheel (0.25, 0.95, −0.37); battery (1.75, 0.48, 0.55); fuel tank (−0.9, 0.30, 0). Small construction dimensions, body curves and materials in the same spec file are original visual design values.

## Equations and checks / 方程与校验

- Exact rigid slider-crank: `s = r cos θ + √(l² − r² sin² θ)`, measured from crank centre to piston pin. It reaches `r + l` at TDC and `l − r` at BDC. The connecting-rod length remains constant throughout rotation.
- Cylinder cycle angle: `φᵢ = (θ − Fᵢ) mod 720`. Power 0–180°, exhaust 180–360°, intake 360–540°, compression 540–720°. Cylinders 1/4 share piston height, as do 2/3.
- Valve lift during the open interval: `L sin²(π (φ − open)/(close − open))`; zero outside. Each open interval is 240° crank angle. Both valves are slightly open between 350° and 370°.
- Camshafts rotate at half crankshaft speed. Cam profiles are generated from the same lift function used to position the valves, with follower direction and each cylinder's firing phase incorporated.
- Gas volume: bore area × (piston travel from TDC + stroke/(compression ratio − 1)). Gas colour identifies stroke; it is not calculated combustion temperature or pressure.
- Forward indirect ratio: `(32/22) × (driven/driver)`. Fourth is 1:1. Reverse has a negative ratio. Neutral disconnects the output; this unloaded demonstration holds the output and wheels stationary.
- All **direct constant-mesh forward pairs** sum to 54 teeth, giving one shaft centre distance. Reverse's 13 + 36 = 49 is intentional: its idler creates a separate three-gear path, so that pair is not constrained to directly span the same centre distance.
- Vehicle speed: engine RPM / gearbox ratio / (41/11) × `2π × 0.335 / 60`; converted to km/h. Fourth at 3,000 RPM gives approximately 101.65 km/h, assuming no slip.
- Differential carrier speed is the mean wheel speed. Planet spin is half the wheel-speed difference multiplied by 16/10.
- Gear working flanks use the analytic involute `inv α = tan α − α`. Normal module/pressure angle are converted to the transverse plane for helical gears; extrusion twists by `z tan β / pitch radius`.

`model.test.ts` checks geometric invariants, firing order and phase, valve boundaries and overlap, cam/follower agreement, volume ratio, RPM/time scaling, tooth sums and speed. `gear-geometry.test.ts` checks pitch thickness, curved flanks, winding, shared centre distance, bore and finite helical extrusion.

The gearbox shafts use one shared motion state. Input speed equals prescribed engine speed; layshaft speed is −input × 22/32. All free gears turn continuously; the selected sleeve locks one to the output. Fourth locks input directly to output. A 0.5-second screen-time shift opens the clutch, returns the old sleeve to neutral, moves the requested sleeve, then closes the clutch. Speed matching is prescribed, not a friction/torque simulation. Rotation uses the same slow-motion divisor as the engine.

The 13 gearbox gears use real involute flanks and opposite-hand 22° helical extrusions, with phases derived from the line of centres. Geometry tests inspect actual tooth outlines at front, middle and back cross-sections over a full input revolution, including the 13→24→36 reverse train. The 24-tooth idler is a construction choice; it cancels from the reverse ratio. The final-drive 11/41 teeth use an illustrative bevel loft, not production hypoid contact geometry.

Engine exploded offsets are translations outside each moving assembly. The pistons and rods, crankshaft, cams, valves, springs and chain share the same underlying crank phase while separated. Gas volumes are hidden once the cylinder is disassembled, since it no longer encloses gas. Castings have open bores, water-jacket volumes, through ports, bearing saddles, plug wells and a hollow sump; they are explanatory shapes rather than manufacturing CAD.

## References and evidence status / 原理参考与核验范围

- John B. Heywood, _Internal Combustion Engine Fundamentals_, 2nd edition, McGraw-Hill, published 2018. [Publisher record](https://www.mheducation.com/highered/mhp/product/internal-combustion-engine-fundamentals-2e.html). Background reference for four-stroke engines, kinematics, gas exchange and ignition. The publisher record was checked; no claim is made that this fictional engine's precise dimensions or timing values were taken from the book, and the paywalled chapters were not reviewed in this implementation.
- Harald Naunheimer, Bernd Bertsche, Joachim Ryborz and Wolfgang Novak, _Automotive Transmissions: Fundamentals, Selection, Design and Application_, 2nd edition, Springer, ©2011. [Publisher record and table of contents](https://link.springer.com/book/10.1007/978-3-642-16214-5). Background for three-shaft transmissions and gear selection. The publisher record/table of contents were checked; the chosen tooth counts are original representative design values.
- KHK, [Calculation of Gear Dimensions](https://khkgears.net/new/gear_knowledge/gear_technical_reference/calculation_gear_dimensions.html), technical reference, sections on spur and normal-system helical gears. The manufacturer's page was consulted for base/reference diameters, normal/transverse systems and opposite-hand helical meshing. No diagrams or source code were copied.

## Explicit simplifications / 明示简化

- Motion is an ideal rigid kinematic demonstration, not a structural, thermal, lubrication, emissions or acoustic simulation. Constant prescribed RPM has no torque or flywheel-speed fluctuation model.
- Fixed timing, sinusoidal-squared valve lift and RPM-only ignition advance are illustrative. Actual valve profiles and ignition maps also depend on production design, load and ECU controls.
- The cam construction uses an ideal follower/contact convention. It does not model tappet compliance, lash or a production roller-envelope design.
- Involute working flanks are real curves. The region below the base circle uses radial joins; generated trochoidal root fillets, undercut, profile shift and load deformation are omitted. The gearbox uses 0.08 mm transverse backlash. The gear generator is not a manufacturing drawing.
- Gas colour, sparks, translucent X-ray surfaces and exploded distances are explanatory visual encodings. Exterior curves, trim, hoses, wiring routes and simplified chassis assemblies are original representative forms.
- Suspension, steering and hydraulic-brake specifications are stored for subsequent rounds; a stored parameter is not evidence of a completed dynamic simulation.

## Assets and dependencies / 素材与依赖

Body, wheels, engine, gears and supporting components are generated in code. No downloaded vehicle models, engine meshes, HDRIs, texture images or third-party geometry are used. The studio environment is built with procedural lights. This round uses the repository's existing React Three Fiber / drei / Three.js / postprocessing dependencies; this model and gear implementation adds no package.
