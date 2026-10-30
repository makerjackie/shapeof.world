# Air conditioner: moving heat / 空调，把热搬到另一边

An original interactive room, split-system cutaway, scroll mechanism and
refrigerant laboratory. The thermodynamic calculation is a quasi-steady
vapor-compression heat pump, coupled to a deliberately small room thermal model.
The dimensions, displacement, conductances and controller are teaching choices,
not a reconstruction or performance certification of a commercial appliance.

## Data, attribution and licensing

`refrigerant-data.json` was generated on 2026-10-30 using **CoolProp 8.0.0**, HEOS
backend, pure fluid `R32`, revision
`ae81610e7d23efc57f9d051c8e70a4d66e87537f`. The complete upstream MIT license is
retained in `LICENSE-CoolProp`. The property table retains that permission;
the repository's original-content license does not replace it.

The table's SHA-256 is
`b507147801bb58bf18a9b347b7409028411a7f40c44455d0bb51f630e8cdf9da`.
All geometry, furniture, machinery, materials, animation and interface graphics
are original procedural work. No external photographs, textures, CAD, manufacturer
illustrations, animations or audio are copied. Code follows the repository's
AGPL-3.0 policy, and original visual content follows CC BY-NC 4.0.

Primary references, accessed 2026-10-30:

1. [CoolProp High-Level API](https://coolprop.org/coolprop/HighLevelAPI.html),
   for SI property calls, saturation inputs and the `P,S` / `P,H` flash states.
2. [CoolProp R32 documentation](https://coolprop.org/fluid_properties/fluids/R32.html),
   identifying the equation of state: R. Tillner-Roth and A. Yokozeki (1997),
   *An international standard equation of state for difluoromethane (R-32)*,
   [DOI: 10.1063/1.556002](https://doi.org/10.1063/1.556002).
3. [CoolProp license at the pinned revision](https://github.com/CoolProp/CoolProp/blob/ae81610e7d23efc57f9d051c8e70a4d66e87537f/LICENSE).
4. [Copeland: Scroll Compressor Operation](https://copeland.custhelp.com/app/answers/detail/a_id/996),
   for the mechanism principle: one fixed scroll and one orbiting scroll form
   pockets that move inward as their volume decreases. This is a conceptual
   reference, not a source of copied display geometry.
5. U.S. DOE / PNNL / ORNL (2011),
   [Energy Renovations—HVAC, PNNL-20421](https://www.energy.gov/sites/default/files/2013/11/f5/hvac_guide.pdf),
   chapters 2.3 and 3.3, for heat pumps, reverse operation and ductless split
   systems. The report's diagrams and product photographs are not used.

## Offline property table

The browser ships numerical JSON, not Python or a CoolProp runtime. To regenerate
the property surface, run `generate-properties.py` with the pinned CoolProp version with `PropsSI` and these
definitions. All calculations below use SI units and absolute pressure; Celsius
is converted to kelvin before querying the library.

| Quantity | Grid or fixed value |
| --- | --- |
| Evaporating saturation temperature `Te` | −35 to 32.5°C, 2.5 K spacing, 28 nodes |
| Condensing saturation temperature `Tc` | 20 to 70°C, 2.5 K spacing, 21 nodes |
| Separate saturation table | −35 to 70°C, 2.5 K spacing, 43 nodes |
| Suction superheat | 5 K |
| Liquid subcooling | 3 K |
| Compressor isentropic efficiency | 0.72 |

At each grid pair with `Tc > Te`:

```text
pe  = PropsSI(P, T=Te, Q=1, R32)
pc  = PropsSI(P, T=Tc, Q=0, R32)
h1  = PropsSI(H, P=pe, T=Te+5 K, R32)
s1  = PropsSI(S, P=pe, T=Te+5 K, R32)
h2s = PropsSI(H, P=pc, S=s1, R32)
h2  = h1 + (h2s-h1)/0.72
T2  = PropsSI(T, P=pc, H=h2, R32)
h3  = PropsSI(H, P=pc, T=Tc-3 K, R32)
h4  = h3
rho1 = PropsSI(D, P=pe, T=Te+5 K, R32)
```

The stored cell fields are `h1, h2s, h2, h3, T2, rho1, s1, s2, s3, s4`.
Entropies `s2`, `s3` and `s4` are queried at the corresponding `P,H` states.
Cells with nonpositive saturation lift are null. The independent saturation
table stores pressure, saturated-liquid/vapor enthalpy and entropy. Its pressure
is interpolated in log space; other saturation fields are interpolated linearly.
Cell properties use bilinear interpolation. Off-grid `T2`, density and entropy
are therefore approximations, rather than fresh equation-of-state solutions.

The runtime restricts `Tc` to 20…70°C and `Te` to −35…32.5°C with at least a
7.5 K saturation lift. This keeps interpolation inside populated cells.
Reaching these limits or a heat-exchanger iteration residual over 0.5 K sets a
visible model-limit flag. The flag is not a real appliance's fault diagnosis.
Standby has no flowing refrigerant cycle; its displayed reference states must
not be interpreted as a model of stopped-system pressure equalization.

Four direct CoolProp samples are retained in `verification`, including three
points between grid nodes. Tests require the sampled enthalpies to agree within
0.15% and discharge temperature within 0.25 K at those points. This is a useful
interpolation check, not an error bound for the entire property surface.

## One cycle, one energy ledger

All powers and state-point readouts use the same cycle. Compression is adiabatic,
with the fixed isentropic efficiency above. Expansion is isenthalpic. Heat
exchangers are isobaric, and pipe pressure drop is omitted.

```text
mdot = displacement × shaft revolutions/second × volumetric efficiency × rho1
Qcold = mdot (h1-h4)
Wcompression = mdot (h2-h1)
Qhot = mdot (h2-h3)
Qhot = Qcold + Wcompression
```

There is no empirical fitted COP curve. Changing ambient temperature, airflow
or compressor speed changes the heat-exchanger solution, pressures and
enthalpies, and hence power and COP. Motor electrical efficiency is idealized
as unity: the calculated compression work is compressor electrical input.
Isentropic inefficiency is already included in `h2`; it is not subtracted a
second time.

Both fan electrical powers are accounted for as heat. The indoor fan remains
on in standby. Outdoor fan power is present only while the compressor is active.

```text
cooling: heatToRoom = -Qcold + WindoorFan
         heatToOutside = Qhot + WoutdoorFan
heating: heatToRoom = Qhot + WindoorFan
         heatToOutside = -Qcold + WoutdoorFan
electricInput = Wcompression + WindoorFan + WoutdoorFan
heatToRoom + heatToOutside = electricInput
```

The displayed system COP is net useful room cooling or heating divided by total
electrical input, including fans. It differs from the refrigerant-only cycle
COP. The familiar `COPheat = COPcold + 1` applies to the two refrigerant heat
quantities for one identical cycle; it is not asserted for the fan-inclusive
summer and winter scenarios. Accumulated kWh integrate total electrical input.

## Chosen machine parameters and heat-exchanger coupling

These are explicit teaching values, not extracted specifications of any brand:

| Parameter | Value |
| --- | ---: |
| Compressor displacement | 12 cm³/revolution |
| Reference shaft speed | 50 rps / 3,000 rpm |
| Volumetric efficiency | 0.80 |
| Isentropic efficiency | 0.72 |
| Nominal indoor air mass flow | 0.27 kg/s |
| Outdoor air mass flow | 0.68 kg/s |
| Air specific heat | 1,006 J/(kg·K) |
| Nominal indoor `UA` | 650 W/K |
| Outdoor `UA` | 700 W/K |
| Nominal indoor fan power | 28 W |
| Outdoor fan power | 42 W |

Indoor fan setting `f` scales indoor air mass flow by `f`, indoor `UA` by
`f^0.8`, and indoor fan power by `f³`. These scaling laws are chosen
representations, not measured fan maps. Each exchanger uses air heat-capacity
rate `Cair = mdotAir cp` and an effectiveness conductance
`G = Cair (1-exp(-UA/Cair))`. Saturation temperatures are iterated against:

```text
Te = sourceAirTemperature - Qcold / Gsource
Tc = sinkAirTemperature + Qhot / Gsink
```

Cooling uses room air as source and outdoor air as sink. Heating swaps them.
The independent fixed-point iteration uses 45 passes with 0.2 relaxation.
This is an approximate lumped exchanger calculation: phase-change conductance
is applied to each entire exchanger, including its superheated/subcooled ends.
The discharge air readout uses the same indoor heat flow divided by its air
heat-capacity rate, including indoor-fan heat.

## Room heat balance and controller

The room contains an air-temperature node and a slower furniture/wall thermal
mass node. The outdoor environment is prescribed. Parameters are chosen to make
changes observable in a short museum session:

| Parameter | Value |
| --- | ---: |
| Air-node heat capacity | 72,000 J/K |
| Furniture/wall-node heat capacity | 2,000,000 J/K |
| Air-to-mass coupling | 160 W/K |
| Closed envelope conductance | 95 W/K |
| Extra conductance at fully open window | 160 W/K |
| Occupant/internal sensible gain | 150 W |
| Unshaded solar gain | 350 W |
| Shaded solar gain | 12% of unshaded |

```text
Qenvelope = (95 + 160 × windowOpening) (Toutside-Troom)
Qmass = 160 (Tmass-Troom)
Cair dTroom/dt = Qenvelope + Qmass + Qsolar + 150 W + heatToRoom
Cmass dTmass/dt = -Qmass
```

Thus internal air/mass exchange cancels from the combined first law. Window
opening is an extra sensible thermal conductance, not a solved ventilation or
wind-pressure field. Curtains scale the chosen solar gain only. The room is
well mixed; the visible airflow is not a spatially resolved temperature field.

The inverter controller is original teaching logic. Positive demand means
`Troom-setpoint` in cooling or `setpoint-Troom` in heating. Demand below −0.15 K
switches compression off; demand above 0.35 K switches it back on. While running,
speed is the selected limit times a PI demand fraction, clamped to 0.35…1.
The proportional term is demand/3 K. An integral fraction accumulates
`demand × dt / 300 s`, bounded to 0…1 with conditional anti-windup when the
unclamped command saturates. This chosen PI controller reduces steady-state
setpoint offset; it is not a manufacturer control algorithm. Constant-operation
mode bypasses the thermostat fraction. Shaft speed
approaches its target with a 1.5-second response. Speeds below 0.12 of reference
are treated as compressor standby. Dynamics use integration substeps no larger
than one second. Time acceleration applies to the same model, not to a separate
scripted room-temperature animation.

## Geometry and visual interpretation

The two cabinets, fins, fans, tubing, valves, motor and scrolls are original
explanatory geometry. They do not specify manufacturable clearances, structural
strength, oil circulation, seals, electrical wiring or service access.

The scroll display distinguishes shaft rotation from orbiting translation: the
orbiting scroll follows an eccentric circular path without rotating its own
orientation. Involute wraps and the housing are chosen for visibility, rather
than copied from an actual compressor. Gas-pocket tracers illustrate inward
transport and shrinking volume. Pocket pressure, contact/sealing, leakage,
torque pulsation and scroll-chamber flow are not solved. Bulk compressor power
and inlet/outlet states come from the thermodynamic model above.

The common planar involute is `a(cos t+t sin t, sin t-t cos t)`, with base
radius `a = 3.2 mm`, wrap thickness 4 mm and parameter interval
`1.5…(0.8+4.8π)` radians. The mating wrap has a π planar rotation. Both use the
same plane orientation; only the fixed wrap's axial extrusion is reversed, so
the two curves retain matching handedness in the assembled XZ plane. Each
outward edge bevel is 0.3 mm. Orbit radius is deliberately reduced to
`πa − thickness − 2×bevel − 0.2 mm ≈ 5.253 mm`, leaving visible clearance rather
than pretending to model gas-tight contact. The eccentric bearing follows that
same orbit and phase. Pure geometry tests sample a complete orbit for centerline
crossings and the minimum wall/bevel clearance, including the finite inner tips.
The lower scroll does not spin relative to the housing. The housing and wrap
clearances are explanatory, not a manufacturable scroll profile. The detailed
view cuts away the front half of the fixed support plate to expose both wraps.

Along each enlarged coil, enthalpy is interpolated between the calculated inlet
and outlet states. Saturation enthalpies determine liquid, two-phase mixture or
vapor. Vapor quality is **vapor mass fraction**, not the volume occupied by the
visible bubbles. The two-phase portion remains at its saturation temperature;
superheat/subcool end temperatures are illustrative linear enthalpy
interpolations. This is not a local boiling correlation, bubble-size calculation
or residence-time calculation. Flow-tracer spacing and velocity are illustrative.
The saturation branches are truncated to the shipped −35…70°C table and do not
include the critical point. Any pressure–enthalpy cycle connection represents the four calculated states;
straight joining segments do not claim a fully resolved compressor path.

The expansion-valve macro shows a cutaway needle, seat, spring and actuator.
The needle is a static explanatory position; neither a valve-flow coefficient
nor actuator control is solved. The cycle prescribes 5 K superheat.

Cooling/heating exchange the indoor and outdoor heat-exchanger roles through a
schematic four-way reversing valve. The compressor still compresses in the same
direction. Real switching transients, refrigerant migration and valve pressure
equalization are omitted.

## Deliberate omissions and validation scope

No humidity, latent dehumidification load, moisture transport, frost, defrost,
auxiliary resistance heating, refrigerant charge/inventory, oil, pipe heat loss,
pipe pressure drop, electrical switching, real motor losses, compressor map,
variable outdoor fan controller or manufacturer protection envelope is modeled.
In particular, cold-weather heating is a **dry, frost-free reference cycle**;
it must not be read as a seasonal efficiency or real winter capacity prediction.
No installation, repair, charging or refrigerant-handling procedure is given.

Pure-model tests cover independent CoolProp checkpoints, efficiency and
isenthalpic expansion, both exchanger balances, fan-inclusive energy accounting,
phase/quality sampling, ambient-temperature COP response, room and thermal-mass
dynamics, cancellation of internal heat transfer, standby and exact pause.
The world remains `making` pending the repository's separate publication process.

## Visible room controls

The original room now has a real opening in its left wall. The left glazed sash
slides by 0.70 display metres over the fixed right sash, so 100% opening denotes
the sash's complete travel and exposes approximately half of the full window.
This display length does not recalibrate the chosen 160 W/K added conductance.
Clicking the window toggles the same 0/1 input as the continuous slider. Clicking
the pleated curtains toggles the same prescribed solar shade gain as the panel;
cloth folds are original geometry, not a fabric or solar-optics simulation.
Room air tracers are enlarged and slowed for reading; they still illustrate flow
and heat sign only, without depicting solved air speed or temperature fields.
