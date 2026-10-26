# Car teardown: sources, assembly and model limits

这是一辆虚构的前置后驱双门概念车。车身采用 CarConcept，发动机采用 Innerscene CAD 分件，运动由本项目计算。它不代表某品牌车辆或可制造设计。长度单位 m；+X 向前、+Y 向上、+Z 向右。参数入口是 `vehicle-spec.ts`，资产安装与 URL 配置在 `asset-config.ts`。

This fictional FR coupe combines attributed asset geometry with original kinematics. It is not production CAD or a certified vehicle design.

## Reused assets and licenses

| Asset | Author and primary source | License | Changes and use |
| --- | --- | --- | --- |
| CarConcept | Eric Chadwick, © 2024 Darmstadt Graphics Group GmbH, based on Unity Fan. [Khronos asset](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept), [license](https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/CarConcept/LICENSE.md) | CC BY 4.0; logos/trademarks are excluded | Preserved native scale and exterior proportions. Converted axes, recentered wheelbase, removed Khronos plates/emblem and branded tyre image, removed placeholder engine, axles and incompatible source brakes. Rigid wheels are aligned to their actual axle; doors, hood, cabin and shell separate in stages. Paint adjusted; Draco geometry and embedded KTX2 retained. |
| Original Concept Car 004 | [Unity Fan / unityfan777](https://sketchfab.com/3d-models/free-concept-car-004-public-domain-cc0-4cba124633eb494eadc3bb0c4660ad7e) | Creator description explicitly declares CC0; platform API metadata previously said Free Standard | Attribution chain only. We use the independently licensed Khronos derivative above; the original download is not included. |
| Four Cylinder Inline Piston Engine — Assembled | [Innerscene](https://www.innerscene.com/tools/library/3d-parts/four-cylinder-inline-piston-engine-assembled-bc359a0b) | CC0, public domain | STEP converted to mesh; 1.5 mm casting bevels, authored material palette, baked source transforms and motion pivots. Removed static cams/springs/belt in favor of calculated profiles, deforming springs and moving timing chain. Added hoses, wiring, coils, mounts, radiator and reservoir. |
| Wooden Studio 15, 1K HDR | Alexander Scholten / [Poly Haven](https://polyhaven.com/a/wooden_studio_15), [license](https://polyhaven.com/license) | CC0 | Used for reflection/lighting; the displayed studio and lights are original. No reference screenshot is redistributed. |
| Metal032 | [ambientCG](https://ambientcg.com/view?id=Metal032), [license](https://docs.ambientcg.com/license/) | CC0 | Downloaded for comparison but **not shipped or loaded**. Cast iron, aluminium, steel, rubber and plastic use original numeric materials; the CarConcept surface maps remain part of its CC BY asset. |
| Decoder runtime | Google Draco and Basis Universal, distributed in Three.js | Apache-2.0 | Self-hosted decoder JS/WASM next to assets. Production upload must include the upstream license notices. Three.js MIT; no new runtime package. |

The central lower dashboard, steering assembly and pedals are translated rearward by 0.48 m as rigid parts to accommodate the longitudinal engine. The silhouette, glazing, seats and vehicle scale are unchanged. A new firewall has an opening for the transmission tunnel. The bay inspection view hides the overhanging canopy glazing so the engine remains visible. This is an authored front-engine conversion, not a claim about the source car's factory arrangement.

本项目增加的软管、附件安装件和防火墙为虚构装配。静态外观不是燃油、冷却或 ECU 仿真。参考图仅供私下对照，未复制其几何或图像。

## Measured geometry and chosen parameters

| Parameter | Value and evidence |
| --- | --- |
| Body native envelope | 4.357386 × 2.542321 × 1.148896 m, including original wheel poses/mirrors; no nonuniform scale |
| Wheelbase / axle X | 2.799743 m / ±1.3998715 m |
| Front / rear track | 1.952168 / 1.964218 m |
| Wheel radius | 0.383759 m, measured geometry; used by speed, steering and brake models. Legacy 235/40 R19 constructor data is not asserted as this concept's tyre marking. |
| Engine / crank origin | X = 1.56, Y = 0.305, Z = 0; longitudinal |
| Bore / stroke / rod centres | 89 / 100 / 175 mm, measured CAD; 50 mm crank throw |
| Cylinder pitch / cylinder 1 X | 96 mm / 1.704 m |
| Displacement | π/4 × .089² × .100 × 4 = 2,488.45554 cc; UI rounds to 2.5 L |
| Compression ratio | 10.5:1, illustrative gas-volume choice; not inferred from mesh |
| Idle / limit | 800 / 6,500 rpm, chosen representative values |
| Firing order | 1–3–4–2; firing TDC at 0°, 180°, 360°, 540° |
| Intake / exhaust timing | 350–590° / 130–370° after firing TDC; peak lift 9.5 / 9.0 mm |
| Cam / crank | 1:2; 17 mm base circle; ideal radial follower profiles computed from the valve lift law |
| Ignition | 10° at 800 rpm, linear to 32° at 4,000 rpm; illustrative 20° flash |
| Main sump envelope | X 1.326–1.794, Y .080–.181, Z ±.127 m |
| Enclosure upper envelope | Cover reaches Y .721 m; original mounting frame crossbars X 1.12 / 1.98, side rails Z ±.36 |
| Mass / weight distribution | 1,550 kg / 52% front, representative choices, not measured asset properties |

Core block/head/cover envelope versus every source car triangle is checked during preparation. At this installation no body/hood/dashboard triangle crosses those envelopes after the central controls are moved. This conservative geometry check is not a full collision sweep over every hose, wire or suspension travel.

## What moves

- Crank, flywheel and crank pulley use the same crank angle. The original 45° CAD bind pose is removed. Each piston/rings/pin translates to the exact slider-crank solution; each connecting rod joins its crank pin and wrist pin with constant 175 mm length.
- Camshafts rotate at half speed. Valves and spring lengths use the same timing function. Timing links move continuously; accessory alternator turns at the measured pulley ratio .078/.038.
- Cylinder cutaway retains cylinder 1, removes obstructing covers/accessories, clips the static enclosures and shows gas/spark at the current phase. Labels identify valves, spark plug, piston and crankshaft. The full assembly remains available separately.
- Gearbox, differential, steering, floating caliper and suspension remain original procedural mechanisms. No incompatible fixed caliper or teaching gearbox mesh replaces their kinematics.
- Whole-car separation follows body → cabin → engine/transmission → chassis → wheels/brakes. Distances are display spacing; systems return to their installed coordinates when assembled. Engine internal separation does not claim service removal order.

## Mechanical equations and boundaries

Slider-crank: `s = r cos θ + sqrt(l² − r² sin² θ)`, with cylinder phase `(θ − firingOffset) mod 720`. Valve lift is `L sin²(π(φ−open)/(close−open))` in the open interval. Gas is stroke-colored, not calculated pressure or temperature. Constant prescribed RPM does not model combustion torque, oil, heat, emissions or acoustics.

Five-speed three-shaft gearbox: primary 22→32; first 15→39, second 21→33, third 26→28, fifth 35→19; fourth direct 1:1. Reverse 13→24 idler→36, negative ratio. Final drive 11→41. All directly meshing pairs sum to 54 teeth. Normal module 2 mm, 20° pressure angle, 22° helix. Working flanks use analytic involutes; bevel/hypoid contact, generated root fillets, friction and load deformation are not manufacturing-grade simulations. Synchronizer speed matching is prescribed over a 0.5 s shift. At 800 rpm first gives 56.75 wheel rpm and third 137.02 rpm: **2.414×, +141.4%**. Fourth at 3,000 rpm gives 116.445 km/h with the measured radius. Neutral holds this unloaded output stationary.

Steering uses ideal Ackermann without tyre slip: inner front angle = steering-wheel angle / 15. Wheel path radii determine all four speeds. Cotangent difference = track / wheelbase. At 540° steering: inner angle 36°, rear-centre turning radius 4.8296 m, outer-front turning diameter 12.891 m. Rack/tie-rod poses are illustrative linkages, not a full constrained production linkage. Differential carrier speed = mean of rear wheel speeds; planet spin = half their difference × 16/10.

Hydraulics: pressure = pedal force × 3.5 × 4 / master area (23.8 mm bore). Front/rear piston diameters 57/38 mm. One piston force `F=P A`; rotor torque `2 μ F r`, μ=.40, effective radii .13/.12 m. At 300 N: 94.407 bar, front/rear piston force 24.090/10.707 kN, torque 2,505.41/1,027.86 N·m per rotor. The front piston pushes the inner pad; the floating body slides on guide pins and pulls the outer pad. Clearance/travel is enlarged 20×. Equal four-wheel pressure, fixed friction, a 1 g adhesion cap; no thermal fade, fluid/seal compliance, load transfer or actual ABS controller.

Suspension solves a linear two-degree-of-freedom quarter car at each axle: 360 kg sprung / 40 kg unsprung; spring 30 kN/m; tyre 250 kN/m; damping 2,000 / 3,000 / 4,500 N·s/m. Gravity is balanced at the displayed static ride height. A .9 m raised-cosine bump reaches the rear after wheelbase/speed; RK4 step 1/480 s. Arms, dampers and fixed-turn springs follow the resulting state, including the exposed brake corner. Identical sides; no roll, tyre lift-off, bump stops or full spatial multi-link constraints. Four quarters sum to 1,600 kg, intentionally a separate reference model from the 1,550 kg braking mass.

Body and electrical views describe placement and purpose; no structural stress, crash rating, battery chemistry or electric-current solution is calculated. Source CarConcept material allocation is unknown; old authored safety-cage strength colors are not shown as measured CarConcept metallurgy.

## Principle references

- Heywood, *Internal Combustion Engine Fundamentals*, 2nd ed., 2018: [publisher](https://www.mheducation.com/highered/mhp/product/internal-combustion-engine-fundamentals-2e.html). Four-stroke background; not the source of this model's measured dimensions.
- Naunheimer et al., *Automotive Transmissions*, 2nd ed., 2011: [publisher](https://link.springer.com/book/10.1007/978-3-642-16214-5). Three-shaft transmission background; chosen tooth counts are original.
- [KHK gear dimension reference](https://khkgears.net/new/gear_knowledge/gear_technical_reference/calculation_gear_dimensions.html): involute/helical normal and transverse geometry. No diagrams copied.
- Gillespie, *Fundamentals of Vehicle Dynamics*, 1992: [SAE](https://saemobilus.sae.org/books/fundamentals-vehicle-dynamics-r-114). Steering/suspension background.
- Limpert, *Brake Design and Safety*, 3rd ed., 2011: [SAE](https://saemobilus.sae.org/books/brake-design-safety-third-edition-r-398). Hydraulic braking background. Publisher metadata was consulted; paywalled book contents are not claimed as reviewed.

## Loading and reproduction

`CAR_ASSET_BASE` uses `VITE_CAR_ASSET_BASE`, a versioned remote directory like the existing atlas/data loaders. The default `/assets/car-teardown/v2` is reserved but **has not been uploaded**. Development points it to the local `.local/car-assets/v2` directory with Vite `/@fs/`. First entry fetches only `car.glb`, `studio.hdr` and their Draco/Basis decoders. `engine.glb` and the procedural chassis module load after the first system/open action. Progress includes byte download and decode. Failure offers retry; it does not repeatedly refetch in a loop.

Prepared assets remain local pending publication approval. Asset preparation source is in `tools/`; raw and prepared binary models are intentionally excluded from Git. This checkpoint is not deployed and the default public asset directory will need populated before release.
