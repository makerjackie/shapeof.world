# How bridges stand — model and asset provenance

Verified 2026-10-26. This is a quasi-static teaching prototype, not structural design software. The three-dimensional scene extrudes planar load paths; it is not a three-dimensional finite-element solution.

## Assets and implementation

All bridge geometry, terrain cutouts, truck geometry, icons and flow markers are procedural originals. No photographs, drawings, models, textures, film footage or external web fonts are downloaded by this world. No external solver code was copied. Existing Three.js, React Three Fiber and Drei dependencies are MIT licensed; their notices remain with the installed dependencies ([Three](https://github.com/mrdoob/three.js/blob/dev/LICENSE), [Fiber](https://github.com/pmndrs/react-three-fiber), [Drei](https://github.com/pmndrs/drei/blob/master/LICENSE)). Original source code follows the repository AGPL-3.0 license; original visual content follows LICENSING.md.

## Physical reference and independent derivation

- [NOVA: Build a Bridge](https://www.pbs.org/wgbh/nova/education/tech/build-bridge.html): bridge-type topology and trade-offs. Link/reference only, no prose or images reproduced. Its historical indicative span ranges are not used as present-day limits.
- [Felix Udoeyo: Arches and Cables](https://eng.libretexts.org/Bookshelves/Civil_Engineering/Structural_Analysis_(Udoeyo)/01%3A_Chapters/1.06%3A_Arches_and_Cables): cross-check of three-hinge equilibrium and cable equilibrium. Page license is **CC BY-NC-ND 4.0**; none of its text, images or code is incorporated. The equations below and implementation are independently derived from force and moment balance.
- [WSDOT: suspension bridge basics](https://wsdot.wa.gov/TNBhistory/suspension-bridges.htm): hangers, main cables, towers and anchorages. No imagery reused. Its old longest-span ranking is not current and is not repeated.
- [WSDOT: lessons from failure](https://wsdot.wa.gov/TNBhistory/bridges-failure.htm): torsional flutter is a self-excited aerodynamic instability, not merely a driven resonance. Wind dynamics are not implemented here.

## Parameters

Units are metres and kN. All dimensions and loads below are **chosen teaching parameters**, not measurements of a named bridge: L = 120 m; deck elevation = 28 m; equivalent beam couple depth = 4 m; arch rise f = 24 m; main-cable tower elevation = 60 m; prescribed midspan sag s = 18 m; stayed tower head = 64 m (36 m above deck); suspension backstay run = 32 m, rise = 36 m; uniform deck load w = 12 kN/m; truck P = 80–640 kN, default 320 kN; 20 deck panels. The common span is for controlled comparison, not an economic recommendation for a 120 m suspension bridge. The planar force represents the whole idealized bridge; the second white cable/arch is an extruded visual counterpart, not a second copy of the numerical load.

Truck position a is clamped to [0,L]. Point load interpolation between adjacent deck nodes preserves total force and its first moment. End nodes receive half a panel's distributed load. Foundations, towers, cables and posts have no separately modeled self-weight; w is the prescribed equivalent deck load. Axle spacing and moving-load dynamics are omitted.

## Four models

**Beam:** R_A=wL/2+P(L−a)/L, R_B=wL+P−R_A; M(x)=R_A x−wx²/2−P max(0,x−a). Positive sagging produces top compression and bottom tension. The displayed pair is ±M/h with h=4 m, not uniform axial force or a material stress distribution. Maximum M is evaluated at the point load and valid zero-shear positions. Shear, elastic deflection, shear lag, prestress, reinforcement and material failure are omitted.

**Arch:** a three-hinged, untied parabolic arch with y(x)=4fx(L−x)/L². Discrete deck loads enter through the shown posts. Compute the simply supported moment diagram M₀ from those nodal loads, then H=M₀(L/2)/f. On each segment N_compression=H cos(theta)+V sin(theta); theta follows the prescribed arch tangent and V is the cumulative vertical-load equilibrium. The color shows this axial compression only. Under eccentric truck loading the real ideal arch also has M_arch=M₀−Hy and shear; those are not visualized. This is not a pure-compression funicular shape for every truck position. The red arrows show the force the arch applies outward to the banks; the banks supply equal inward reactions. Tied arches are explicitly outside this topology.

**Suspension:** an ideal funicular polygon under discrete panel loads, with **prescribed midspan sag**: H=M₀(L/2)/s, y_i=60−M₀(x_i)/H, T_i=H sqrt(1+(Δy_i/Δx)²). Each hanger has T=P_i. Tower compression is the central-span reaction plus backstay downward component H·36/32; each anchorage resists the corresponding upward component. Including anchor uplift yields total vertical ground reaction wL+P. Changing truck position changes the equilibrium cable polygon. This is a form-finding family, **not one fixed-length elastic cable under moving traffic**; neither cable-length compatibility nor deck stiffening is solved. The undeformed deck is a reference surface. Its overall dimensions are not displacement predictions. End panel loads go directly to the tower supports.

**Cable-stayed:** one central tower and ideal independently supported deck panels. Each stay carries its tributary vertical load P_i, giving T_i=P_i sqrt(x_i²+36²)/36. The deck carries cumulative horizontal components toward the tower. A load directly at the tower goes into it without a stay. Tower vertical load is wL+P; the foundation resists the eccentric moment P(a−L/2), with opposite reaction sign. This is a simplified balanced cantilever: continuous-deck load sharing, tower bending diagrams, stay pretension, elasticity and geometric nonlinearity are omitted. The approach surfaces do not introduce extra main-span supports.

## Visual encoding and controls

Blue = tension; red = compression. Radius r=0.18+0.8 sqrt(|N|/1700), in scene units; a fixed nonlinear scale with a visibility floor, **not linearly proportional stress**. For the beam, N is the equivalent couple M/h. White dots indicate the route only, not energy flow or propagation speed. A selected path step desaturates other members. Truck position, weight, pause/speed, orbit/zoom, front view and reset are available on desktop and mobile. Reduced-motion preferences stop initial motion. Browser hidden state and shared-shell pause stop playback.

`model.test.ts` checks independent closed-form central loading, total force and first moment conservation, arch crown moment equilibrium, cable joint equilibrium and anchorage balance, and stayed fan vertical/horizontal balance and base moment. These checks validate only the stated ideal models. They do not validate a real bridge or establish safe capacities.
