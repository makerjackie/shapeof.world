# City water — sources, units and limits

This is an original, fictional, procedural reference town. It is not the model of a real utility, not a design calculator, and not a drinking-water safety assessment. Code follows the repository's AGPL-3.0 licensing; the original geometry and visual material follow the repository's original-content licence. No third-party images, meshes, textures, maps or EPANET source code are included.

## Primary references

- [U.S. EPA, EPANET](https://www.epa.gov/water-research/epanet): network objects, simulation scope, storage and water-quality modelling. EPA identifies EPANET as public-domain software, but this world uses an independently written solver rather than copying its implementation.
- [EPANET 2.2, Chapter 3, The Network Model](https://usepa.github.io/EPANET2.2/3_network_model.html): head, pressure, pipes, check valves, pumps, tanks, pressure-dependent demand, completely mixed storage, first-order bulk reaction and water age.
- [EPANET 2.2, Chapter 12, Analysis Algorithms](https://usepa.github.io/EPANET2.2/12_analysis_algorithms.html): link energy relations, continuity, variable-speed pump curves, pressure-dependent delivery and transport principles. The numerical implementation here is nodal-head Newton with line search; it is not EPANET's Global Gradient Algorithm and is not validated to EPANET's engineering QA standard.
- [CDC, How Water Treatment Works, 2024-02-06](https://www.cdc.gov/drinking-water/about/how-water-treatment-works.html): coagulation, flocculation, sedimentation, filtration, disinfection and residual disinfectant. The process ordering and explanations are paraphrased; its diagram and photographs are not reused.

References checked 2026-10-30. The physical principles come from these sources. Every network dimension, capacity, population-demand proxy, pump parameter and response coefficient below is a fictional teaching assumption, not a value measured at a named facility.

## Network and hydraulic quantities

`network.ts` defines 17 nodes: the clearwell/pump suction boundary, 15 pressure-dependent consumption junctions, and a tank. It defines 25 links: one check-valved pump with its suction/main loss, 22 loop-network pipes, and two links to the elevated tank.

All calculations use metres, seconds, cubic metres, kilograms and kilowatts. HUD pressure in `m` is pressure head, **not** elevation or hydraulic head. Junction pressure is `max(H − z, 0)`; 1 m of water head is approximately 9.79 kPa at the chosen density. Negative gauge pressures are not used to deliver positive demand.

- Gravitational acceleration: 9.80665 m/s².
- Reference water density: 998.2 kg/m³.
- Pipe diameters: 0.16–0.35 m; lengths in `network.ts`, mostly hundreds of metres.
- Elevations: 9–19.8 m for demand nodes. They are computed independently from display geometry. Heights and horizontal lengths are compressed/exaggerated differently in the diorama.
- Fully developed turbulent reference friction factor: `f = 0.022`, fixed. Reynolds-dependent friction, laminar flow, minor losses and pipe-wall deformation are omitted.
- Darcy–Weisbach: `h_loss = r Q |Q|`, with `r = 8 f L / (g π² D⁵)`.
- Near zero head difference, a C1 regularisation uses `ε = 0.001 m`: `Q = ΔH / [sqrt(r) (ΔH² + ε²)^(1/4)]`. This avoids an infinite derivative without materially changing ordinary operating flows.
- At each junction, the solver enforces signed inflow = delivered consumption + leakage. The HUD reports its maximum absolute continuity residual.
- Newton updates use the analytical conductance Jacobian, pivoted dense elimination, a step bound of 12 m, and backtracking. Trial heads are bounded by each passive component's highest fixed boundary or pump shutoff head, preventing a closing check valve from leaving an isolated pump-fed component without a numerical anchor. Tolerance is 10⁻⁸ m³/s, maximum 70 iterations per hydraulic step. This is small-network educational software, not a replacement for EPANET.
- Nominal junction demands: 2–4 L/s each, multiplied by a synthetic daily profile. The sum and peaks are a town-scale demand proxy, not an inferred population.
- Pressure delivery: `D_actual = D_requested sqrt(clamp(p / 20 m, 0, 1))`. The threshold 20 m is a fictional service reference, not a regulatory standard. Fire demand adds 35 L/s at the hospital district node.
- Leak at node `j7` / index 8: `Q_leak = 0.62 A sqrt(2 g max(p,0))`; adjustable equivalent opening area 0–1500 mm². The discharge coefficient is a representative sharp-orifice assumption. The spray represents a location signal, not a simulated pipe fracture.
- Pump: shutoff head `54 s² m` at relative speed `s`. Head drops quadratically with flow; pump-curve coefficient 3600 m/(m³/s)² plus pipe loss. A check valve prevents reverse pump flow.
- Electrical input: `P = ρ g Q ΔH / (0.76 × 1000)` kW; constant efficiency 0.76. No efficiency map, transient motor dynamics, cavitation or NPSH calculation.
- Optional automatic control smoothly varies relative speed with tank fill. It is a teaching proportional level controller, not an industrial controller, pressure regulator or real pump schedule.

## Storage and mass balance

- Reservoir: 180,000 m³ capacity, initially 120,000 m³, configurable inflow 0–160 L/s.
- Clearwell: 1,800 m³ capacity, initially 1,100 m³. Suction head `16 + V/450` m.
- Elevated tank: 720 m³ capacity, initially 460 m³. Effective area 90 m², floor elevation 43 m, maximum active depth 8 m.
- Maximum plant net production: 88 L/s times intake setting, availability, filter factor and backwash factor.
- Power loss stops treatment and the supply pump. The elevated tank continues supplying by gravity until empty.
- Storage integration uses hydraulic intervals at most 10 seconds and splits at empty-storage events. An empty tank cannot supply imaginary water; it can accept positive inflow. Overflow is explicitly recorded rather than silently discarded.
- Internal reservoir withdrawal and treatment inflow are the same model net volume. Consequently, total reservoir + clearwell + elevated storage changes equal outside inflow − delivered consumption − leakage − overflow, to solver tolerance. Full pipes carry fixed stored volume and are not emptied during loss of service.
- The backwash mode halves net plant production for 15 simulated minutes and removes the teaching filter load. Backwash water use, sludge disposal and chemical mass are **not separately modelled**.

The automated tests check junction and global continuity, pressure-dependent consumption, quadratic resistance scaling, reversed flow, an empty tank accepting refill, power loss through total storage exhaustion, eight simulated hours with changing conditions, thirty combinations of user valve closures/disconnected districts, and bounded quality transport.

## Quality and treatment

The quantitative treatment responses are **invented teaching curves**. They demonstrate control direction and connected processes; they are not a chemical process design or calibrated removal model.

- Source turbidity proxy: `8 + 170 Q_in` NTU with inflow in m³/s. Increased inflow and increased raw turbidity are coupled for an illustrative rainy-source scenario.
- Coagulation/settling/filtering proxy: `T_coag = T_raw exp(−1.8 dose)`, `T_settle = 0.28 T_coag`, `T_filter = T_settle (0.08 + 0.38 load²)`. Coagulant control is a dimensionless response setting, not a mass dose.
- Filter load grows with treated volume × raw turbidity; it reduces production. It is not an actual filter head-loss calculation.
- Disinfectant reference at the plant exit is adjustable 0–1.5 mg/L. This is a tracer input, **not a recommended dose**.
- Pipe quality uses four equal-volume upwind finite-volume cells per pipe. Advection follows signed hydraulic flows and handles reversal. The transport step is at most five seconds and satisfies `|Q| Δt / V_cell ≤ 0.85`.
- Junctions mix all incoming pipe end-cell values, and storage is completely mixed.
- Uniform bulk first-order chlorine decay constant `k = 0.055 h⁻¹`; initial clearwell residual 0.65 mg/L, tank 0.42 mg/L, pipes 0.42 mg/L. Coefficients are representative fictional inputs, not site measurements.
- Pipe water age increases with elapsed time, advects in the same cells and mixes at junctions. Initial pipe age 6 h, clearwell 3 h, elevated tank 7 h; source age zero.
- Storage quality uses a bounded analytical exchange update based on `Q_in Δt / V`, followed by first-order decay, and increases age by elapsed time. This is an approximate mixing update; it is not an exact mass-conserving multicomponent reaction solver.
- No pathogens, CT inactivation calculation, water-safety classification, pipe-wall reactions, nitrification, biofilm, temperature, pH, intrusion, wastewater, water hammer or building-level plumbing.

## Display and exploration

All terrain, concrete basins, rake, filters, pump, tower structure, pipes, buildings and trees are generated by original code. No remote model or data download is needed. No third-party geometry or copyrighted diagram is traced.

The model deliberately separates a legible diorama from SI hydraulic dimensions. Pipes are enlarged and revealed at the ground surface in the network modes; tank and terrain heights are exaggerated separately. Animated particles indicate computed flow direction at accelerated time. They do not depict molecular paths or exact velocity at screen scale.

The optional “follow a drop” route is a process tour: intake, mixing, settling, filtering, disinfection, clearwell, pump and district. It uses representative process residence times and `V/Q` for the clearwell. A completely mixed tank has a residence-time distribution, so the tour explicitly labels its mean-time simplification and never claims to follow a particular molecule. It is separate from the numerical quality transport.

The three replayable experiments reset to explicit fictional initial conditions. They evaluate model supply fractions and elapsed simulation time; their 92% target is a gameplay threshold, not a service standard.
