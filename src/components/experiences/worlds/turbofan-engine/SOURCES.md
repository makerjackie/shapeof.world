# Turbofan reference engine

All meshes, airfoil lofting, interface, plots and calculations are original to
Shape of the World. No photographs, manufacturer CAD, NASA illustrations or
third-party geometry are redistributed. Code follows the repository AGPL-3.0
license; authored visual content follows LICENSING.md. React Three Fiber, Drei
and Three.js are existing repository dependencies under their respective MIT
licenses. Reflection lighting is generated locally, without an HDRI download.

## Physical references

- [NASA Glenn, Turbofan Engine](https://www.grc.nasa.gov/www/k-12/airplane/aturbf.html): separate core and bypass flow, concentric spools, bypass ratio.
- [NASA Glenn, Compressor Thermodynamics](https://www.grc.nasa.gov/www/k-12/airplane/compth.html): `Tout/Tin = 1 + (PR^((gamma-1)/gamma)-1)/eta`, shaft work `cp ΔT`.
- [NASA Glenn, Brayton Cycle](https://www.grc.nasa.gov/www/k-12/airplane/brayton.html): component total states and turbine–compressor work balance.
- [NASA Glenn, Nozzle Performance](https://www.grc.nasa.gov/www/k-12/airplane/nozzleh.html): enthalpy-to-velocity conversion. We additionally cap the isentropic convergent exit at its critical pressure ratio and include `(pe-pambient) Ae` pressure thrust.
- [NASA Glenn, Turbojet Thrust](https://www.grc.nasa.gov/www/k-12/airplane/turbth.html): net momentum flux, incoming ram drag and outgoing fuel mass.
- [NASA Glenn, Specific Fuel Consumption](https://www.grc.nasa.gov/www/k-12/airplane/sfc.html): fuel flow divided by net thrust. UI units are **g/(kN·s)**, i.e. SI kg/(N·s) multiplied by 10^6.

These references establish mechanisms and equations, not the numerical
performance of a commercial turbofan. Original summaries are used, with no
copied illustrations. Links checked 2026-10-30.

## Chosen reference parameters

| Quantity | Value / prescription | Status |
| --- | --- | --- |
| Air cp, gamma, R | 1004.5 J/(kg K), 1.4, 287 J/(kg K) | Constant-property approximation |
| Hot gas cp, gamma | 1150 J/(kg K), 1.33 | Constant-property approximation; R derived consistently |
| Sea-level standard atmosphere | 288.15 K, 101325 Pa | Dry standard-day reference |
| Tropospheric lapse | 0.0065 K/m to 11 km; isothermal above | Hydrostatic standard-atmosphere approximation |
| Inlet pressure recovery | 0.995 | Chosen illustrative value |
| Design fan ratio | 1.52 | Chosen illustrative value |
| Design compressor ratio | 22 (control range 8–35) | Chosen illustrative value |
| Fan / compressor / turbine efficiency | 0.91 / 0.88 / 0.92 | Chosen illustrative values |
| Burner pressure recovery / efficiency | 0.95 / 0.99 | Chosen illustrative values |
| Shaft mechanical efficiency | 0.99 for each spool | Explicitly included in energy balances |
| Fuel lower heating value | 43 MJ/kg | Representative kerosene reference, not a measured fuel batch |
| Burner outlet total temperature | max(T3 + 100 K, 850 + 800 throttle K) | Teaching throttle schedule |
| Bypass ratio | 8; controllable 0–12 | Mass-flow ratio, not a reconstructed real engine |
| Core flow | 55 (pt2/101325) sqrt(288.15/Tt2) (0.3+0.7 throttle) kg/s | **Prescribed corrected-flow closure**, not a map solution |
| Spool schedule | s=0.3+0.7 throttle; LP=3300s, HP=12000(0.46+0.54 throttle) rpm | **Reference animation schedules**, not integrated shaft dynamics |
| Off-design fan / core PR | 1+(PRdesign−1)s² | Prescribed teaching law |
| Nozzle energy efficiency | 0.98 | Chosen illustrative value |
| Bypass duct pressure recovery | 0.98 | Chosen illustrative value |

The high-pressure turbine is independently matched to core-compressor shaft
work. The low-pressure turbine is matched to fan work on **core plus bypass**
air. Fuel changes the downstream hot mass flow. Static exit density and speed
determine the effective nozzle area for the prescribed flow, including pressure
thrust at choked conditions. This **variable-effective-area closure** must not be
read as a prediction of a fixed-geometry engine. The UI flags cycles with
insufficient core-nozzle pressure difference. Controls are instantaneous
steady-state comparisons; no spool transients are calculated.

## Geometry and display boundaries

The reference has 22 fan blades, nine core compressor rotor/stator stages, two
HP turbine stages and four LP stages. Blade rows use original twisted,
symmetric NACA-thickness lofts with swept tips. Stage counts, dimensions,
stagger, accessories, fuel nozzles and casing positions are exhibition choices,
not a certified engine layout or CFD solution. No manufacturer is implied.

Both shafts turn according to their own displayed RPM. The same LP clock drives
the fan and LP turbine; the HP clock drives the compressor and HP turbine.
Display slowdown applies to rotors, not to path tracers. Tracer count is limited
for visibility and is not a measurement of molecular density. Blue-to-amber
false colours follow an illustrative thermal path and are not radiative flame
colours. Exploded assemblies separate for inspection, not maintenance. No
combustion chemistry, aeroelasticity, blade cooling, structural certification,
component maps, surge, stall or start-up control is simulated.

## Validation

The nine compressor stages use equal pressure-ratio increments, with total
temperature rise allocated consistently with the aggregate compressor efficiency.
These are reference stage states, not resolved aerodynamic stage maps. Their
shaft powers sum exactly to the cycle compressor work.

`model.test.ts` independently checks atmosphere continuity, both shaft energy
balances, bypass mass balance, combined momentum thrust, component state
ordering, convergent nozzle choking and pressure thrust, intervention trends
and finite output across the control envelope. Rendering uses blade-row
instancing; no geometry or tracer allocations occur inside the frame loop.
