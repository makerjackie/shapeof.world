import { CLEARWELL_CAPACITY, GRAVITY, ISOLATION_PIPE, LEAK_NODE, NODES, PIPES, RESERVOIR_CAPACITY, TANK_NODE, TOWER_AREA, TOWER_CAPACITY, WATER_DENSITY } from './network'

export interface Settings {
  pumpSpeed: number
  automatic: boolean
  power: boolean
  intake: number
  demand: number
  inflow: number // m³/s
  leak: number // equivalent orifice area m²
  isolation: boolean
  fire: boolean
  closedPipes: number[]
  coagulant: number
  disinfectant: number
}
export const DEFAULTS: Settings = {pumpSpeed: .92, automatic: true, power: true, intake: .8, demand: 1, inflow: .052, leak: 0, isolation: false, fire: false, closedPipes: [], coagulant: .75, disinfectant: .8}
export interface PipeQuality { chlorine: number[]; age: number[] }
export interface HydraulicState {
  heads: number[]
  flows: number[]
  delivered: number[]
  requested: number[]
  leak: number
  towerFlow: number // positive = filling
  pumpFlow: number
  pumpHead: number
  pumpKW: number
  residual: number
  iterations: number
  connected: boolean[]
}
export interface Simulation {
  time: number // seconds since 04:00
  reservoir: number
  clearwell: number
  tower: number
  clearChlorine: number
  clearAge: number // seconds
  towerChlorine: number
  towerAge: number
  nodeChlorine: number[]
  nodeAge: number[]
  pipes: PipeQuality[]
  filterLoad: number
  backwash: number // seconds remaining
  produced: number
  delivered: number
  leaked: number
  overflowed: number
  inflow: number
  energy: number // kWh
  hydraulic: HydraulicState
  history: {time: number; pressure: number; tower: number; demand: number; supplied: number}[]
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const DECAY = .055 / 3600 // 0.055 h^-1, illustrative bulk first-order decay
export function demandPattern(time: number) {
  const hour = ((4 + time / 3600) % 24 + 24) % 24
  const bell = (center: number, width: number) => Math.exp(-.5 * ((hour - center) / width) ** 2)
  return .57 + .94 * bell(7.7, 1.5) + .75 * bell(19, 2.1) + .17 * bell(12.5, 2.6)
}
/** Continuous pressure-dependent delivery. Full demand at 20 m, zero at/below zero. */
export function deliveredDemand(requested: number, pressure: number) {
  return requested * Math.sqrt(clamp(pressure / 20, 0, 1))
}
function demandDerivative(requested: number, pressure: number) {
  return pressure > 0 && pressure < 20 ? requested / (40 * Math.sqrt(Math.max(.0025, pressure / 20))) : 0
}
/** C1 regularisation of sign(h)*sqrt(abs(h)/r) near zero keeps the Jacobian finite. */
export function pipeFlow(headDifference: number, resistance: number): [number, number] {
  const epsilon = .001
  const denom = Math.sqrt(resistance) * (headDifference ** 2 + epsilon ** 2) ** .25
  return [headDifference / denom, (.5 * headDifference ** 2 + epsilon ** 2) / (Math.sqrt(resistance) * (headDifference ** 2 + epsilon ** 2) ** 1.25)]
}
function linearSolve(matrix: number[][], rhs: number[]) {
  const n = rhs.length, a = matrix.map((r, i) => [...r, rhs[i]])
  for (let k = 0; k < n; k++) {
    let pivot = k
    for (let i = k + 1; i < n; i++) if (Math.abs(a[i][k]) > Math.abs(a[pivot][k])) pivot = i
    ;[a[k], a[pivot]] = [a[pivot], a[k]]
    if (Math.abs(a[k][k]) < 1e-13) a[k][k] = 1e-13
    for (let i = k + 1; i < n; i++) {
      const ratio = a[i][k] / a[k][k]
      for (let j = k + 1; j <= n; j++) a[i][j] -= ratio * a[k][j]
      a[i][k] = 0
    }
  }
  const x = Array(n).fill(0) as number[]
  for (let i = n - 1; i >= 0; i--) {
    let sum = a[i][n]
    for (let j = i + 1; j < n; j++) sum -= a[i][j] * x[j]
    x[i] = sum / a[i][i]
  }
  return x
}
export function effectivePumpSpeed(s: Simulation, settings: Settings) {
  if (!settings.power || s.clearwell <= 1e-7) return 0
  // Smooth level control: no cycling / hysteresis claims. Manual speed is the upper bound.
  return settings.automatic ? settings.pumpSpeed * clamp(1 + .5 * (.68 - s.tower / TOWER_CAPACITY), .78, 1.08) : settings.pumpSpeed
}
export function solveHydraulics(s: Simulation, settings: Settings): HydraulicState {
  const speed = effectivePumpSpeed(s, settings)
  const fixed = new Map<number, number>([[0, 16 + s.clearwell / 450]])
  if (s.tower > 1e-7 || speed > 0) fixed.set(TANK_NODE, 43 + s.tower / TOWER_AREA)
  const open = PIPES.map((p, i) => !(p.pump && speed === 0) && !(i === ISOLATION_PIPE && settings.isolation) && !settings.closedPipes.includes(i))
  const connected = NODES.map(() => false), stack = [...fixed.keys()]
  while (stack.length) {
    const j = stack.pop()!
    if (connected[j]) continue
    connected[j] = true
    PIPES.forEach((p, i) => { if (open[i]) { if (p.from === j && !connected[p.to]) stack.push(p.to); if (p.to === j && !connected[p.from]) stack.push(p.from) } })
  }
  NODES.forEach((_, i) => { if (!connected[i]) fixed.set(i, 0) })
  const unknown = NODES.map((_, i) => i).filter(i => !fixed.has(i))
  const inverse = new Map(unknown.map((v, i) => [v, i]))
  // Each passive component has a physical maximum head: its highest boundary,
  // or the pump's zero-flow head. Keeping trial heads inside that bound prevents
  // an isolated pump-fed component from losing its Jacobian anchor when a
  // Newton trial overshoots the check valve's closing point.
  const upperBound = NODES.map(() => 0), visited = NODES.map(() => false)
  for(let start=0;start<NODES.length;start++){
    if(visited[start])continue
    const members:number[]=[], pending=[start]
    while(pending.length){
      const node=pending.pop()!;if(visited[node])continue
      visited[node]=true;members.push(node)
      PIPES.forEach((p,i)=>{if(open[i]&&!p.pump){if(p.from===node&&!visited[p.to])pending.push(p.to);if(p.to===node&&!visited[p.from])pending.push(p.from)}})
    }
    const boundaryHeads=members.flatMap(j=>fixed.has(j)?[fixed.get(j)!]:[])
    if(open[0]&&members.includes(1))boundaryHeads.push(fixed.get(0)!+54*speed**2)
    const maximum=Math.max(0,...boundaryHeads)
    members.forEach(j=>{upperBound[j]=maximum})
  }
  const heads = NODES.map((n, i) => fixed.get(i) ?? Math.min(upperBound[i]-1e-6, s.hydraulic?.heads[i] || n.elevation + 25))
  const pattern = demandPattern(s.time) * settings.demand
  const requested = NODES.map((n, i) => n.demand * pattern + (settings.fire && i === 9 ? .035 : 0))
  let residual = 0, iterations = 0
  const evaluate = (jacobian: boolean) => {
    const f = Array(unknown.length).fill(0) as number[]
    const a = Array.from({length: unknown.length}, () => Array(unknown.length).fill(0) as number[])
    const flows = PIPES.map((p, k) => {
      if (!open[k]) return 0
      const h = heads[p.from] - heads[p.to] + (p.pump ? 54 * speed ** 2 : 0)
      const blockedTank = s.tower <= 1e-7 && ((p.to === TANK_NODE && h < 0) || (p.from === TANK_NODE && h > 0))
      const [q, derivative] = (p.pump && h <= 0) || blockedTank ? [0, 0] : pipeFlow(h, p.resistance)
      const from = inverse.get(p.from), to = inverse.get(p.to)
      if (from !== undefined) { f[from] += q; if (jacobian) a[from][from] += derivative }
      if (to !== undefined) { f[to] -= q; if (jacobian) a[to][to] += derivative }
      if (jacobian && from !== undefined && to !== undefined) { a[from][to] -= derivative; a[to][from] -= derivative }
      return q
    })
    unknown.forEach((j, i) => {
      const pressure = heads[j] - NODES[j].elevation
      f[i] += deliveredDemand(requested[j], pressure)
      if (jacobian) a[i][i] += demandDerivative(requested[j], pressure)
      if (j === LEAK_NODE && settings.leak) {
        f[i] += .62 * settings.leak * Math.sqrt(2 * GRAVITY * Math.max(pressure, 0))
        if (jacobian && pressure > 0) a[i][i] += .62 * settings.leak * GRAVITY / Math.sqrt(2 * GRAVITY * Math.max(pressure, .05))
      }
    })
    return {f, a, flows, norm: Math.max(0, ...f.map(Math.abs))}
  }
  for (iterations = 0; iterations < 70 && unknown.length; iterations++) {
    const e = evaluate(true)
    residual = e.norm
    if (residual < 1e-8) break
    const delta = linearSolve(e.a, e.f)
    let alpha = Math.min(1, 12 / Math.max(12, ...delta.map(Math.abs)))
    const original = unknown.map(j => heads[j])
    for (let line = 0; line < 12; line++) {
      unknown.forEach((j, i) => { heads[j] = Math.min(upperBound[j]-1e-6, original[i] - alpha * delta[i]) })
      if (evaluate(false).norm < e.norm || alpha < .0005) break
      alpha *= .5
    }
  }
  const e = evaluate(false), flows = e.flows
  residual = e.norm
  const delivered = NODES.map((n, i) => connected[i] ? deliveredDemand(requested[i], heads[i] - n.elevation) : 0)
  const leak = .62 * settings.leak * Math.sqrt(2 * GRAVITY * Math.max(heads[LEAK_NODE] - NODES[LEAK_NODE].elevation, 0))
  const towerFlow = PIPES.reduce((sum, p, i) => sum + (p.to === TANK_NODE ? flows[i] : p.from === TANK_NODE ? -flows[i] : 0), 0)
  const pumpFlow = Math.max(0, flows[0]), pumpHead = pumpFlow ? Math.max(0, heads[1] - heads[0]) : 0
  return {heads, flows, delivered, requested, leak, towerFlow, pumpFlow, pumpHead,
    pumpKW: WATER_DENSITY * GRAVITY * pumpFlow * pumpHead / .76 / 1000, residual, iterations, connected}
}
export function treatment(s: Simulation, settings: Settings) {
  const rawTurbidity = 8 + settings.inflow * 170
  const coagulated = rawTurbidity * Math.exp(-1.8 * settings.coagulant)
  const settled = coagulated * .28
  const filtered = settled * (.08 + .38 * s.filterLoad ** 2)
  const flow = settings.power && s.reservoir > 1e-7 ? .088 * settings.intake * (s.backwash > 0 ? .5 : 1) * (1 - .24 * s.filterLoad) : 0
  return {rawTurbidity, coagulated, settled, filtered, flow, chlorine: settings.disinfectant}
}
export function createSimulation(): Simulation {
  const s: Simulation = {
    time: 0, reservoir: 120000, clearwell: 1100, tower: 460,
    clearChlorine: .65, clearAge: 3 * 3600, towerChlorine: .42, towerAge: 7 * 3600,
    nodeChlorine: NODES.map(() => .4), nodeAge: NODES.map(() => 6 * 3600),
    pipes: PIPES.map(() => ({chlorine: [.42,.42,.42,.42], age: [21600,21600,21600,21600]})),
    filterLoad: .18, backwash: 0, produced: 0, delivered: 0, leaked: 0, overflowed: 0, inflow: 0, energy: 0,
    hydraulic: null as unknown as HydraulicState, history: [],
  }
  s.hydraulic = solveHydraulics(s, DEFAULTS)
  return s
}
function incomingQuality(s: Simulation, h: HydraulicState) {
  const volume = NODES.map(() => 0), chlorine = NODES.map(() => 0), age = NODES.map(() => 0)
  PIPES.forEach((p, i) => {
    const q = h.flows[i], to = q >= 0 ? p.to : p.from, last = q >= 0 ? 3 : 0, w = Math.abs(q)
    volume[to] += w; chlorine[to] += w * s.pipes[i].chlorine[last]; age[to] += w * s.pipes[i].age[last]
  })
  const c = volume.map((v, i) => v > 1e-12 ? chlorine[i] / v : s.nodeChlorine[i])
  const a = volume.map((v, i) => v > 1e-12 ? age[i] / v : s.nodeAge[i])
  c[0] = s.clearChlorine; a[0] = s.clearAge
  c[TANK_NODE] = s.towerChlorine; a[TANK_NODE] = s.towerAge
  return {volume, c, a, tankC: volume[TANK_NODE] ? chlorine[TANK_NODE] / volume[TANK_NODE] : s.towerChlorine,
    tankAge: volume[TANK_NODE] ? age[TANK_NODE] / volume[TANK_NODE] : s.towerAge}
}
function transport(s: Simulation, h: HydraulicState, seconds: number) {
  let remaining = seconds
  while (remaining > 1e-8) {
    let dt = Math.min(remaining, 5)
    PIPES.forEach((p, i) => { const cell = Math.PI * p.diameter ** 2 / 4 * p.length / 4; if (Math.abs(h.flows[i]) > 1e-9) dt = Math.min(dt, .85 * cell / Math.abs(h.flows[i])) })
    const incoming = incomingQuality(s, h)
    s.nodeChlorine = incoming.c; s.nodeAge = incoming.a
    PIPES.forEach((p, i) => {
      const q = h.flows[i], cell = Math.PI * p.diameter ** 2 / 4 * p.length / 4
      const factor = Math.abs(q) * dt / cell, old = s.pipes[i], c = [...old.chlorine], age = [...old.age]
      for (let k = 0; k < 4; k++) {
        const next = q >= 0 ? k - 1 : k + 1
        const inletC = next < 0 ? incoming.c[p.from] : next > 3 ? incoming.c[p.to] : old.chlorine[next]
        const inletAge = next < 0 ? incoming.a[p.from] : next > 3 ? incoming.a[p.to] : old.age[next]
        c[k] = (old.chlorine[k] + factor * (inletC - old.chlorine[k])) * Math.exp(-DECAY * dt)
        age[k] = Math.max(0, old.age[k] + dt + factor * (inletAge - old.age[k]))
      }
      s.pipes[i] = {chlorine: c, age}
    })
    remaining -= dt
  }
}
function mixTank(volume: number, concentration: number, inlet: number, inletConcentration: number, dt: number) {
  // Analytical mixing for a constant-volume exchange; endpoint tank volumes are integrated separately.
  const turn = inlet * dt / Math.max(volume, inlet * dt, 1e-8)
  return concentration + (inletConcentration - concentration) * (1 - Math.exp(-turn))
}
/** Mutates a simulation instance. Ten-second hydraulic steps split exactly at empty-storage events. */
export function advanceSimulation(s: Simulation, settings: Settings, seconds: number) {
  let remaining = Math.max(0, seconds), guard = 0
  while (remaining > 1e-7 && guard++ < 5000) {
    const h = solveHydraulics(s, settings), plant = treatment(s, settings), incoming = incomingQuality(s, h)
    let dt = Math.min(10, remaining)
    const sourceNet = settings.inflow - plant.flow, clearNet = plant.flow - h.pumpFlow, towerNet = h.towerFlow
    if (sourceNet < 0 && s.reservoir > 1e-7) dt = Math.min(dt, s.reservoir / -sourceNet)
    if (clearNet < 0 && s.clearwell > 1e-7) dt = Math.min(dt, s.clearwell / -clearNet)
    if (towerNet < 0 && s.tower > 1e-7) dt = Math.min(dt, s.tower / -towerNet)
    if (dt < 1e-8) { if (s.tower < 1e-5) s.tower = 0; if (s.clearwell < 1e-5) s.clearwell = 0; if (s.reservoir < 1e-5) s.reservoir = 0; continue }
    transport(s, h, dt)
    s.clearChlorine = mixTank(s.clearwell, s.clearChlorine, plant.flow, plant.chlorine, dt) * Math.exp(-DECAY * dt)
    s.clearAge = mixTank(s.clearwell, s.clearAge, plant.flow, 0, dt) + dt
    const towerIn = PIPES.reduce((sum, p, i) => sum + (p.to === TANK_NODE ? Math.max(h.flows[i], 0) : p.from === TANK_NODE ? Math.max(-h.flows[i], 0) : 0), 0)
    s.towerChlorine = mixTank(s.tower, s.towerChlorine, towerIn, incoming.tankC, dt) * Math.exp(-DECAY * dt)
    s.towerAge = mixTank(s.tower, s.towerAge, towerIn, incoming.tankAge, dt) + dt
    const resNext = s.reservoir + sourceNet * dt, clearNext = s.clearwell + clearNet * dt, towerNext = s.tower + towerNet * dt
    s.overflowed += Math.max(0, resNext - RESERVOIR_CAPACITY) + Math.max(0, clearNext - CLEARWELL_CAPACITY) + Math.max(0, towerNext - TOWER_CAPACITY)
    s.reservoir = clamp(resNext, 0, RESERVOIR_CAPACITY); s.clearwell = clamp(clearNext, 0, CLEARWELL_CAPACITY); s.tower = clamp(towerNext, 0, TOWER_CAPACITY)
    s.produced += plant.flow * dt; s.delivered += h.delivered.reduce((a, b) => a + b, 0) * dt; s.leaked += h.leak * dt
    s.inflow += settings.inflow * dt; s.energy += h.pumpKW * dt / 3600
    s.filterLoad = clamp(s.filterLoad + (s.backwash > 0 ? -dt / 900 : plant.flow * plant.rawTurbidity * dt / 350000), 0, 1)
    s.backwash = Math.max(0, s.backwash - dt)
    s.time += dt; remaining -= dt; s.hydraulic = h
    if (!s.history.length || s.time - s.history[s.history.length - 1].time >= 240) {
      s.history.push({time: s.time, pressure: minimumPressure(h), tower: s.tower, demand: h.requested.reduce((a, b) => a + b, 0), supplied: h.delivered.reduce((a, b) => a + b, 0)})
      if (s.history.length > 360) s.history.shift()
    }
  }
  s.hydraulic = solveHydraulics(s, settings)
  return s
}
export function minimumPressure(h: HydraulicState) {
  return Math.max(0, Math.min(...NODES.flatMap((n, i) => n.demand ? [h.heads[i] - n.elevation] : [])))
}
export function supplyFraction(h: HydraulicState) {
  const requested = h.requested.reduce((a, b) => a + b, 0)
  return requested ? h.delivered.reduce((a, b) => a + b, 0) / requested : 1
}
export function formatClock(time: number) {
  const total = Math.floor(time / 60) + 240
  return `${String(Math.floor(total / 60) % 24).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`
}
export function pressureColor(meters: number) {
  return meters < 8 ? '#d27d64' : meters < 20 ? '#d6b87c' : meters < 42 ? '#71c6cb' : '#a8cee2'
}
