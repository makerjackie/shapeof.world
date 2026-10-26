# The grid / 电网的形状

Evidence status: modeled. This is a single coherent synchronous area, not a model of China's grid, a live feed, or a reconstruction of a historical blackout. Nominal electrical frequency is 50 Hz. North American examples discussed in source links use 60 Hz.

## Theory and references

1. Prabha Kundur, *Power System Stability and Control*, McGraw-Hill, 1994. Chapter 3: synchronous-machine motion; Chapter 11: active-power and frequency control. ISBN 978-0-07-035958-1. [Bibliographic record](https://books.google.com/books?id=wOlSAAAAMAAJ).
2. Paul Denholm et al., *Inertia and the Power Grid: A Guide Without the Spin*, NREL/TP-6A20-73856, May 2020. [Official PDF](https://www.nrel.gov/docs/fy20osti/73856.pdf). Used to cross-check the physical explanation, not copied as an image or text asset.
3. [U.S. DOE: August 2003 blackout](https://www.energy.gov/oe/august-2003-blackout) and [FERC/NERC: February 2021 cold weather outages](https://www.ferc.gov/sites/default/files/2021-11/Cold%20Weather%20Report_%20November%202021.pdf) provide historical context. Neither incident is simulated here. Line trips, voltage instability, weather and fuel availability are outside this model.

## Equations and units

Let `x = (f - f0) / f0`, `p` denote per-unit power on `Sbase = 10,000 MW`, `v` the governor command, `pm` turbine mechanical-power increment, and `z` secondary-control increment. At t=0 one generator is disconnected. The base case was balanced before the event.

```text
2 H dx/dt = -p_loss + pm + p_shed - D x
Tg dv/dt  = clip(-x/R + z, 0, p_reserve) - v
Tt dpm/dt = v - pm
dz/dt     = -Ki x                       (t >= 15 s, if AGC and governor enabled)
f         = f0 (1 + x)
RoCoF(0+) = -f0 * p_loss / (2 H)
```

The governor target is zero when disabled. The AGC state is constrained to [0, reserve] with conditional integration at its bounds (anti-windup). Turning off the governor also disables AGC in this simplified architecture. A governor without AGC retains a steady offset: `x = -p_loss / (D + 1/R)` when reserves do not saturate. Inertia slows the change but does not create sustained power. The damping term represents frequency-sensitive demand; it is not resistive transmission loss.

| Parameter | Value / range | Evidence |
| --- | --- | --- |
| `f0` | 50 Hz | Chosen nominal frequency; not mechanical revolutions per second |
| `Sbase` | 10,000 MW | Illustrative system base |
| `H` | 5 s or 1.5 s | Surviving aggregate on the fixed system base, **after** the trip; illustrative, not measured |
| `D` | 1 pu power / pu frequency | Illustrative frequency-sensitive demand |
| `R` | 0.05 pu frequency / pu power | Illustrative 5% aggregate droop |
| `Tg`, `Tt` | 0.25 s, 3 s | Illustrative first-order governor and turbine response, not a fitted hydro/steam model |
| `Ki` | 0.4 s⁻¹ | Illustrative AGC integrator, enabled after 15 s; real AGC includes ACE, ties and communication |
| generation lost | 500 / 1,000 / 2,000 / 2,500 MW | Interactive illustrative disturbance |
| available reserve | 400 / 1,500 / 2,500 MW | Increment above baseline; aggregate saturation |
| UFLS thresholds | 49.0 / 48.7 / 48.4 Hz | **Educational settings, not Chinese or international operating rules** |
| relay delay / step | 0.2 s continuously below each threshold; 500 MW each | Latching, at most one action per stage; timers reset above threshold |
| load restoration | none | A recovered frequency does not mean customers are reconnected |

The remaining connected rotors supply kinetic energy immediately. Governor and inertial effects overlap in time; the UI's three explanatory tabs are not exclusive intervals. The disconnected generator's inertia no longer contributes. There are multiple synchronous areas in a large continent, and HVDC can connect areas with different frequencies.

## Numerical method and checks

`model.ts`: fixed-step RK4, 0.01 s. Relay conditions are evaluated each integration step, never per display frame. Samples are retained every 0.1 s, while the nadir is tracked every 0.01 s. Playback interpolates continuous states; shed load changes discretely at the recorded relay timestamps. Pause, speed, scrubbing and rendering frame rate do not alter the calculated outcome. Previous-run comparison retains only the part previously played.

Tests cover undisturbed equilibrium, analytical initial slope and inertia scaling, the droop-only equilibrium, secondary recovery, reserve saturation, delayed/latched load shedding, and convergence with 0.005 s integration. Default 1,000 MW trip: minimum about 49.316 Hz at 2.26 s. Low inertia: about 48.849 Hz at 0.93 s, with 500 MW shed. These values describe this parameter set only.

The model assumes coherent rotor motion and fixed network connectivity apart from the tripped generator/load protection. It omits voltages, reactive power, line impedances/overloads, regional oscillations, islanding, electromagnetic transients, inverter controls/fast frequency response, deadbands, turbine reheating/water hammer, fuel constraints, and black start. Large deviations are only an extrapolation of the equations and are not a prediction of real survival or equipment protection.

## Visuals and licenses

- All meshes, circuit paths, charts and UI are authored for this world. Geometry is schematic, not a measured plant, substation or network. The generator bodies represent groups, not equal output; rotary motion is deliberately slowed. Wires show topology, not simulated AC flow or electron travel.
- Rotors, cases, bearings, towers and city blocks are procedural geometry. No third-party images, models, geographic datasets, reference photographs or textures are shipped.
- `three` (three.js authors): [MIT](https://github.com/mrdoob/three.js/blob/dev/LICENSE); `@react-three/fiber` (pmndrs contributors): [MIT](https://github.com/pmndrs/react-three-fiber/blob/master/LICENSE); `@react-three/drei` (pmndrs contributors): [MIT](https://github.com/pmndrs/drei/blob/master/LICENSE). Existing site dependencies, not forks; no modified vendor files. The license permits use, modification and redistribution with copyright/permission notices retained.
- Repository code is AGPL-3.0-only and original content follows `LICENSING.md`. No upstream data licenses are superseded by the repository's content license.

The balance and China views are explicitly marked as in preparation. There is no operational power-grid dataset hidden behind those labels.
