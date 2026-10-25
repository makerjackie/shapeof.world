# Car teardown — model, provenance and limits

This is an original, fictional front-engine, rear-wheel-drive sedan. It does not reproduce a production car or a manufacturer's CAD. Every numerical specification below is a representative design choice, not a measurement attributed to a real vehicle. `vehicle-spec.ts` is the dimensional entry point, including its re-exported body, road and auxiliary construction sheets. All distances in code are metres unless the field says otherwise. The references below explain principles and material classes; they are not sources for this fictional car's exact dimensions, tooth counts or tuning.

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
| Steering                                      | Ideal Ackermann; ratio 15:1, steering-wheel limit ±540°, inner-wheel limit 36°                                     |
| Front / rear brake discs                      | Ø320 × 28 mm ventilated / Ø300 × 12 mm solid                                                                  |
| Front / rear caliper pistons                  | Ø57 / Ø38 mm                                                                                                  |
| Brake pedal ratio; booster ratio; master bore | 3.5:1; 4:1; Ø23.8 mm                                                                                                |
| Suspension model parameters         | Sprung / unsprung mass 360 / 40 kg; spring 30 kN/m; damping 3,000 N·s/m; tyre stiffness 250 kN/m; bump 0.05 m |
| Electrical                                    | 12 V battery; alternator pulley speed ratio 2.7:1                                                             |

Assembly locations: radiator x = 1.95 m; gearbox clutch x = 0.85 m, output x = 0.20 m at crank height; driveshaft extends to x = −1.30 m; differential x = −1.425 m, y = 0.335 m; steering rack (1.30, 0.28, 0), steering wheel (0.25, 0.95, −0.37); battery (1.75, 0.48, 0.55); fuel tank (−0.9, 0.30, 0). Small construction dimensions, body curves and materials in the specification entry point are original visual design values. The casting rib thicknesses, wiring routes, bearing sizes, panel cuts and separation distances explain an assembly rather than reproduce manufacturing data.

## Gear ratios and driveline / 齿数与传动比

The sign is measured relative to forward input rotation. Ratios are `input RPM / output RPM`; the final drive is listed separately.

| State | Teeth in selected path | Gearbox ratio | Output at input 3,000 RPM |
| --- | --- | --- | --- |
| 1 | 22→32, 15→39 | 3.781818 | +793.27 RPM |
| 2 | 22→32, 21→33 | 2.285714 | +1,312.50 RPM |
| 3 | 22→32, 26→28 | 1.566434 | +1,915.18 RPM |
| 4 | Input locked directly to output | 1.000000 | +3,000 RPM |
| 5 | 22→32, 35→19 | 0.789610 | +3,799.34 RPM |
| R | 22→32, 13→24-tooth idler→36 | −4.027972 | −744.79 RPM |
| N | No gear locked to output | Disconnected | 0 RPM in this unloaded model |
| Final drive | 11→41 | 3.727273 | Wheel RPM = output RPM / (41/11) in a straight line |

The layshaft runs at `−input × 22/32`. Direct forward meshing pairs each total 54 teeth; the reverse driver and driven gears total 49 because they mesh through an idler. Fourth is a direct coupling, not another gear pair. Normal module is 2 mm, normal pressure angle 20°, helix angle 22°, face width 22 mm and illustrative transverse backlash 0.08 mm. Final-drive and differential bevel teaching geometry uses a 4 mm module. Side gears have 16 teeth, the two planet gears have 10 each.

Simplification / 简化：gear dimensions and ratios are authored representative values. Synchronizer speed matching is prescribed over a 0.5-second screen-time shift; friction cones, clutch torque, inertia and driveline losses are not solved. The final drive is represented by bevel teaching surfaces, not production hypoid contact geometry.

## Steering and differential / 转向与差速器

| Parameter | Representative value |
| --- | --- |
| Steering-wheel control | −540° to +540°; steering ratio 15:1 to the inner front wheel |
| Wheelbase L; front / rear track w / t | 2.85 m; 1.58 / 1.60 m |
| Rack pinion | 12 teeth, module 1.5 mm, pressure angle 20°, pitch radius 9 mm |
| Rack travel at ±540° | ±84.823 mm from centre (`0.009 × 3π`) |
| Steering demonstration speed | 0–60 km/h, measured at the rear-axle centre |
| Maximum-lock inner angle | 36° |
| Maximum-lock rear-centre radius R | 4.712688 m |
| Maximum-lock outer-front path diameter | 12.393882 m; rounded readout about 12.4 m |

For nonzero steer, `R = L / tan(δinner) + w/2`, `δouter = atan(L / (R + w/2))`, hence `cot(δouter) − cot(δinner) = w/L`. A left turn puts the instantaneous centre on −Z; a right turn mirrors it. At zero steer the path radii are infinite and all wheels have the same speed.

Front-wheel path radii are `sqrt(L² + (R ± w/2)²)`; rear-wheel radii are `R ± t/2`. Each wheel's RPM is its path radius divided by R, multiplied by rear-centre road speed / tyre circumference. This makes all four wheel speeds distinct in a turn. Carrier/ring speed is `(left rear RPM + right rear RPM)/2`; planet spin about its own axis is `(right rear RPM − left rear RPM)/2 × 16/10`. In a straight line planet spin is zero, while the planets still orbit with the carrier. Final-drive pinion speed is carrier speed × 41/11.

Simplification / 简化：ideal Ackermann directly drives the wheel angles, with no tyre slip angle or compliance. The displayed tie rods illustrate the layout, rather than determine the angles through a production linkage solve. The two phased Cardan joints show intermediate-shaft speed variation and restore the column-to-pinion angle. Rack travel is derived from pinion pitch radius, not adjusted independently to match a steering arm. There is no limited-slip mechanism, friction or wheel-torque model.

## Braking calculation chain / 制动计算链

| Parameter | Representative value |
| --- | --- |
| Pedal force | 0–400 N; held demonstration 300 N |
| Pedal leverage; vacuum boost | 3.5:1; constant 4:1 |
| Master-cylinder bore / area | 23.8 mm / 4.44881 cm² |
| Front piston bore / area | 57 mm / 25.51759 cm² |
| Rear piston bore / area | 38 mm / 11.34115 cm² |
| Front rotor | Ø320 × 28 mm, ventilated; 36 radial vanes between two 6 mm faces |
| Rear rotor | Ø300 × 12 mm, solid |
| Pad friction coefficient | 0.40 at every wheel |
| Effective friction radius | Front 0.13 m; rear 0.12 m |
| Vehicle mass / rolling radius | 1,550 kg / 0.335 m |
| Adhesion ceiling | 1.0 g = 9.81 m/s² |
| Physical pad gap / drawing scale | 0.1 mm / 20× (2 mm shown) |
| Traveling pressure highlight | 0.3 seconds of screen time |
| Initial road speed | Default 40 km/h; control 0–120 km/h |

`P = Fpedal × 3.5 × 4 / (π × 0.0238² / 4)` in pascals. Each caliper's displayed clamp force is **one piston force** `Fclamp = P × Apiston`. Both pad faces contribute to rotor torque: `T = 2 × 0.40 × Fclamp × reffective`. Four-wheel torque is `2 × (Tfront + Trear)` and raw deceleration is total torque / 0.335 / 1,550; the displayed moving-car deceleration is capped at 9.81 m/s².

At 300 N: pressure **94.407 bar**, front piston force **24,090.46 N**, rear piston force **10,706.87 N**, front torque **2,505.41 N·m** per rotor and rear torque **1,027.86 N·m** per rotor. The uncapped deceleration is 13.609 m/s², so the adhesion cap activates. Pressure itself is not capped at 100 bar: 400 N produces about 125.876 bar. “About 100 bar” is an order-of-magnitude description.

The piston pushes the inner pad toward the rotor. Reaction moves the C-shaped floating caliper body oppositely on its two guide pins, pulling the outer pad inward. The four pipes remain in their installed routes during parts separation. Wheel angle and stopping distance are integrated in the same slowed physical time as the other mechanisms.

Simplification / 简化：all wheels receive equal pressure, friction and boost are constant, and load transfer, temperature, fade, fluid compressibility and seal elasticity are omitted. “ABS active” means the 1 g adhesion cap is reached; this is not a per-wheel slip controller. The moving amber segment explains pressure delivery and does not claim that pressure takes 0.3 seconds to propagate. Pad clearance and caliper travel are enlarged 20 times.

## Suspension and road input / 悬架与路面输入

| Parameter | Representative value |
| --- | --- |
| Front / rear layout | MacPherson strut / five-link rear suspension |
| Sprung / unsprung mass per quarter model | 360 / 40 kg |
| Spring rate / tyre stiffness | 30,000 / 250,000 N/m |
| Damping presets | Soft 2,000; standard 3,000; firm 4,500 N·s/m |
| Speed / default | 10–80 km/h / 30 km/h |
| Bump height / default | 2–10 cm / 5 cm |
| Bump length | 0.90 m |
| First front-wheel contact | 0.5 physical seconds after replay |
| Rear-wheel delay | L / v; 0.342 s at 30 km/h |
| Fixed integration step | RK4 at 1/480 physical second |
| Sample interval | Every 8 integration steps (1/60 physical second) |
| Static spring / tyre deflection | 117.72 / 15.696 mm |

Displacements are measured from the statically loaded ride height, so zero displacement is equilibrium on a flat road. Let `zs`, `zu`, `zr` be sprung, unsprung and road displacement; `ks`, `kt`, `c` the spring rate, tyre stiffness and damping. With `Fs = ks(zs−zu) + c(zs'−zu')`, the model solves `ms zs'' = −Fs` and `mu zu'' = Fs − kt(zu−zr)`. RK4 evaluates the road input at each intermediate time. The rounded bump is a single raised cosine, `h[1 − cos(2πx / 0.9)]/2`, flat outside its 0.9 m footprint.

Front and rear sprung displacements form body heave (their mean) and pitch (their difference over wheelbase). The two sides of each axle move identically. Springs keep their turn count while their pitch changes; dampers extend and arms pivot to follow the wheel centres.

Simplification / 简化：the same 360/40 kg reference quarter is used at both axles; multiplying it by four gives 1,600 kg, so it is not a detailed allocation of the 1,550 kg braking mass or its 52:48 static distribution. Spring and damping laws are linear. Roll, tyre lift-off, bump stops, tyre damping and complete spatial multi-link constraints are omitted. The rounded speed bump uses a cosine profile rather than a literal circular arc.

## Body-in-white and electrical / 白车身与电气

| Steel group | Representative strength label | Diagram color | Assigned purpose in this model |
| --- | --- | --- | --- |
| Press-hardened steel | About 1,500 MPa tensile strength | Muted orange `#c46a32` | A/B pillars, roof side rails, sill reinforcements, tunnel and cowl crossmember help resist cabin intrusion |
| High-strength steel | Illustrative 340–800 MPa strength band | Cool blue-grey `#6f8fae` | Front rails are assigned controlled crush/energy absorption; floor crossmembers, rear rails and strut towers carry loads |
| Mild steel | No numerical grade assigned | Neutral grey `#8d9197` | Floor, wheel housings, rear bulkhead and panel inner skins |

The 1,500 MPa label is consistent with the commonly used PHS1500 class described by WorldAutoSteel. The 340–800 MPa band, part assignments and colors are authored explanatory choices, not a bill of materials for a production car. Strength alone does not determine crash performance; section shape, thickness, joining, strain rate and the complete structure matter. No collision or stress analysis is run. “Body-in-white” refers to the joined structure before paint and trim; colors here identify material groups, not actual finish or calculated stress.

Exterior coverings are split into separate procedural meshes. Doors hinge about 60° before moving outward; glass separates along its surface direction; lids, bumpers, seats and dashboard move along explanatory assembly directions. The safety cage, floor and structural rails remain as the reference. Same-kind pieces share a numbered group; its card quantity counts represented pieces rather than label bubbles.

Electrical reference values are a **12 V** battery and an alternator pulley speed ratio of **2.7:1** to the crankshaft. The assembly also shows a starter, ECU, fuse box, four ignition coils and front/rear lamp groups. The branched wiring harness stays in place during component separation.

Simplification / 简化：body strength classes and structural shapes are teaching geometry, not homologation or crash evidence. Separation distances are diagram spacing, not service removal instructions or fastening sequences. Electrical animation shows placement and pulley motion; battery chemistry, alternator regulation, starter engagement, current and ECU software are not simulated.

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

- Thomas D. Gillespie, _Fundamentals of Vehicle Dynamics_, SAE International, 1992. [Publisher record](https://saemobilus.sae.org/books/fundamentals-vehicle-dynamics-r-114). Background reading for steering, ride and vehicle dynamics. Publisher metadata was checked; the paywalled text was not reviewed here. Quarter-car masses/rates and the steering ratio are original choices, not values extracted from this book.
- Rudolf Limpert, _Brake Design and Safety_, 3rd edition, SAE International, 2011. [Publisher record](https://saemobilus.sae.org/books/brake-design-safety-third-edition-r-398). Background reading for brake physics and hydraulic systems. Publisher metadata was checked; the paywalled chapters were not reviewed here. The force chain above is stated explicitly and tested from this model's chosen dimensions.
- [Tyre markings explained](https://www.michelin.co.uk/auto/advice/tyre-basics/tyre-markings-explained), Michelin's own explanation of section width in millimetres, aspect ratio as a percentage, and rim diameter in inches. This supports decoding 235/40 R19 and the nominal geometric diameter `19 × 25.4 + 2 × 235 × 0.40 = 670.6 mm`; **0.335 m rolling radius is this model's approximation**, not a measured loaded radius.
- WorldAutoSteel / AHSS Insights, [PHS and PQS Overview](https://ahssinsights.org/forming/press-hardened-steels/phs-and-pqs-overview/), _AHSS Application Guidelines_. The published overview describes the approximately 1,500 MPa tensile-strength PHS class. It supports the material-class context; it does not certify this fictional body's part zoning or the illustrative 340–800 MPa band. No source figures or datasets are reused.

## Explicit simplifications / 明示简化

- Motion is an ideal rigid kinematic demonstration, not a structural, thermal, lubrication, emissions or acoustic simulation. Constant prescribed RPM has no torque or flywheel-speed fluctuation model.
- Fixed timing, sinusoidal-squared valve lift and RPM-only ignition advance are illustrative. Actual valve profiles and ignition maps also depend on production design, load and ECU controls.
- The cam construction uses an ideal follower/contact convention. It does not model tappet compliance, lash or a production roller-envelope design.
- Involute working flanks are real curves. The region below the base circle uses radial joins; generated trochoidal root fillets, undercut, profile shift and load deformation are omitted. The gearbox uses 0.08 mm transverse backlash. The gear generator is not a manufacturing drawing.
- Gas colour, sparks, translucent X-ray surfaces and exploded distances are explanatory visual encodings. Exterior curves, trim, hoses, wiring routes and simplified chassis assemblies are original representative forms.
- Steering uses ideal Ackermann geometry without tyre slip angles. Inner front wheel angle is steering-wheel angle / 15. All four speeds use their own path radii; road speed refers to the rear-axle centre. Tie-rod pose illustrates the steering layout rather than solving a production linkage. The differential uses straight-bevel teaching surfaces instead of manufacturing-grade hypoid flanks.
- Braking uses fixed friction coefficient 0.40, equal line pressure at all wheels and a 1.0 g tyre-adhesion cap. ABS is that cap, not an individual wheel-slip controller. Pressure = pedal force × 3.5 × 4 / master-cylinder area. Clamp force means the force at one piston; both pad faces contribute to torque. Gaps and caliper sliding travel are enlarged 20×. The 0.3-second highlight is a screen-time explanation, not hydraulic propagation.
- Suspension uses a linear two-degree-of-freedom quarter-car model per axle, with the two sides responding identically: 360 kg sprung / 40 kg unsprung, 30 kN/m spring, 250 kN/m tyre and 2,000 / 3,000 / 4,500 N·s/m damping. Gravity is already balanced at the displayed static ride height. A single cosine bump travels rearward; the rear axle responds after L/v. Fixed-step RK4 uses 1/480 s. Body heave/pitch come from front/rear sprung displacements; roll, tyre lift-off and complete spatial multi-link constraints are omitted.

## Assets and dependencies / 素材与依赖

Body, wheels, engine, gears and supporting components are generated in code. No downloaded vehicle models, engine meshes, HDRIs, texture images or third-party geometry are used. The studio environment is built with procedural lights. This world uses the repository's existing React Three Fiber / drei / Three.js / postprocessing dependencies and adds no package. References are links for attribution and further reading, not imported assets. The 3 MB catalogue transfer budget is a budget for code and poster fallback, not a measured claim of zero network traffic; procedural geometry requires no mesh downloads.

## Round-five inspection views / 子总成近景

Parts views isolate one front/rear brake corner, the hydraulic actuation hardware, clutch and gearbox, propeller shaft, rear axle, one suspension corner, or the rack/column. Translations are dimensionless lanes scaled to the assembly's dimensions; they are explanatory spacing, not a repair procedure. Cameras fit the final extracted geometry, with separate portrait framing. The rear axle's outboard housing and halfshafts are shortened to keep its gears legible; their cards identify this truncation. Electrical parts are placed on an evenly spaced floor grid while the harness remains faintly in its installed position.

零件级按子总成展示；位移是教学排版，并非维修拆装行程。后桥远端桥管和半轴截短，齿轮及运动比例不变，零件卡注明截短。电气件在地面等间距平铺，线束留在原处作为淡背景。竖屏以主体高度安全区优先，避免被仪表抽屉遮住。

The body-in-white uses tapered rounded box sections with narrow weld flanges, an embossed floor/tunnel, roof crossmembers, a ribbed bulkhead and formed strut towers. These are representative stamped/welded shapes, not manufacturing tooling or finite-element crash models. The floating caliper uses a 68-degree arcuate casting outside the disc rim, a single inner piston boss, two outer fingers, guide ears/boots, inlet/bleeder details and separate friction/backing layers. Internal clearances remain exaggerated 20 times for visibility; no seal deformation or fluid-flow simulation is implied. No additional third-party assets or dependencies were added.

白车身的变截面盒形梁、翻边和压筋为代表性冲压焊接结构，不是可制造图纸；不模拟焊点、压溃或碰撞。浮动卡钳为跨过盘缘约 68° 的铸件，含单侧活塞缸、外侧双钳爪、导向耳、防尘套和双层制动片；沿用 20 倍间隙示意，不模拟橡胶密封圈变形或液体流场。未新增依赖或第三方素材。

## Rendering performance

- Rigid rotor grooves, cooling vanes, rim spokes, crank journals/webs, flywheel bolts, alternator slots/fan, radiator fins and gear dogs are merged without changing their vertex topology or mechanical dimensions.
- Hidden systems retain resources but suspend local animation callbacks. Their shared mechanism clock continues; visible mechanisms retain their original timing.
- The soft floor reflection is cached at up to 30 Hz on desktop / 12 Hz on narrow screens. Contact shadows update on assembly motion at up to 10 Hz (5 Hz on narrow screens), and stay cached during camera-only movement. The main image, metal/paint environment reflections and mechanism animation retain the display frame rate. Shadow-map resolution and all material parameters are unchanged.
- `StudioReflection.tsx` and `StudioShadows.tsx` adapt the already installed drei reflector/contact-shadow implementations. Source: `@react-three/drei/core/MeshReflectorMaterial` and `ContactShadows`; MIT license reproduced in `DREI-LICENSE.txt`. No new dependency or external visual asset.
- Pointer hit testing uses a 4 mm line tolerance and retains only the nearest hit for each object. Camera drag/wheel gestures bypass 3D selection; hover and part selection remain available. This changes interaction cost, not visible geometry.

- Rigid opaque subassemblies batch only exactly matching materials, preserving part boundaries, shadow flags, layers and all vertices. Transparent glass and custom clipped paint remain separate; articulated groups are not batched.

- Retina rendering caps the WebGL pixel ratio at 1.5 (previously 1.6); narrow screens retain 1.15. Desktop MSAA is 2× (previously 4×); narrow screens retain 2×. AO quality, geometry and material settings remain unchanged. Four bounded brake-geometry templates avoid repeated casting/edge construction; each mounted corner owns disposable copies.
