export type Point = { x: number; y: number; z: number }
export type Star = Point & { vx: number; vy: number; vz: number; m: number }

type Deriv = Array<{ dx: number; dy: number; dz: number; dvx: number; dvy: number; dvz: number }>
type Acc = Array<[number, number, number]>

export type Sim = {
  stars: Array<Star>
  origin: Array<Star>
  acc: Acc
  trails: Array<Array<Point>>
  t: number
  scale0: number
  minD: number
  escaped: number | null
  trailClock: number
  epsilon: number
  trailMax: number
  trailEvery: number
  maxStep: number
  period: number | null
  extent: number
}

export const G = 1
export const PERIODIC_EPSILON = 0.00001
export const CHAOS_EPSILON = 0.004
export const ESCAPE_MULT = 4.8

export const STAR_COLORS = ['#72e0d1', '#ff8066', '#ffd27a'] as const

export const clamp = (value: number, lower: number, upper: number) => Math.min(upper, Math.max(lower, value))

export function accelerations(stars: Array<Star>, epsilon: number): Acc {
  const acceleration: Acc = stars.map(() => [0, 0, 0])
  for (let i = 0; i < stars.length; i += 1) {
    for (let j = i + 1; j < stars.length; j += 1) {
      const dx = stars[j].x - stars[i].x
      const dy = stars[j].y - stars[i].y
      const dz = stars[j].z - stars[i].z
      const radiusSquared = dx * dx + dy * dy + dz * dz + epsilon * epsilon
      const inverseCube = G / (radiusSquared * Math.sqrt(radiusSquared))
      acceleration[i][0] += dx * inverseCube * stars[j].m
      acceleration[i][1] += dy * inverseCube * stars[j].m
      acceleration[i][2] += dz * inverseCube * stars[j].m
      acceleration[j][0] -= dx * inverseCube * stars[i].m
      acceleration[j][1] -= dy * inverseCube * stars[i].m
      acceleration[j][2] -= dz * inverseCube * stars[i].m
    }
  }
  return acceleration
}

export function minPair(stars: Array<Star>): { d: number; i: number; j: number } {
  let distance = Infinity
  let first = 0
  let second = 1
  for (let i = 0; i < stars.length; i += 1) {
    for (let j = i + 1; j < stars.length; j += 1) {
      const nextDistance = Math.hypot(stars[j].x - stars[i].x, stars[j].y - stars[i].y, stars[j].z - stars[i].z)
      if (nextDistance < distance) {
        distance = nextDistance
        first = i
        second = j
      }
    }
  }
  return { d: distance, i: first, j: second }
}

export function collinearStars(v1: number, v2: number, m3 = 1): Array<Star> {
  const vx3 = (-2 * v1) / m3
  const vy3 = (-2 * v2) / m3
  return [
    { x: -1, y: 0, z: 0, vx: v1, vy: v2, vz: 0, m: 1 },
    { x: 1, y: 0, z: 0, vx: v1, vy: v2, vz: 0, m: 1 },
    { x: 0, y: 0, z: 0, vx: vx3, vy: vy3, vz: 0, m: m3 },
  ]
}

/** Spatial Li–Liao 2025 initial configuration. */
export function spatialStars(z0: number, vx: number, vy: number, vz: number, m3 = 1): Array<Star> {
  const vx3 = (-2 * vx) / m3
  const vy3 = (-2 * vy) / m3
  return [
    { x: -1, y: 0, z: 0, vx, vy, vz, m: 1 },
    { x: 1, y: 0, z: 0, vx, vy, vz: -vz, m: 1 },
    { x: 0, y: 0, z: z0, vx: vx3, vy: vy3, vz: 0, m: m3 },
  ]
}

export function figureEightStars(nudge = 0): Array<Star> {
  const vx = 0.466203685
  const vy = 0.43236573
  const stars: Array<Star> = [
    { x: -0.97000436, y: 0.24308753, z: 0, vx, vy, vz: 0, m: 1 },
    { x: 0.97000436, y: -0.24308753, z: 0, vx, vy, vz: 0, m: 1 },
    { x: 0, y: 0, z: 0, vx: -2 * vx, vy: -2 * vy, vz: 0, m: 1 },
  ]
  if (nudge !== 0) {
    stars[2].vx += nudge
    stars[0].vx -= nudge / 2
    stars[1].vx -= nudge / 2
  }
  return stars
}

export function lagrangeStars(): Array<Star> {
  const omega = 3 ** -0.25
  const y = Math.sqrt(3) / 2
  return [
    { x: 1, y: 0, z: 0, vx: 0, vy: omega, vz: 0, m: 1 },
    { x: -0.5, y, z: 0, vx: omega * -y, vy: omega * -0.5, vz: 0, m: 1 },
    { x: -0.5, y: -y, z: 0, vx: omega * y, vy: omega * -0.5, vz: 0, m: 1 },
  ]
}

export const LAGRANGE_PERIOD = (2 * Math.PI) / 3 ** -0.25

export function eulerStars(): Array<Star> {
  const omega = Math.sqrt(1.25)
  return [
    { x: -1, y: 0, z: 0, vx: 0, vy: -omega, vz: 0, m: 1 },
    { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, m: 1 },
    { x: 1, y: 0, z: 0, vx: 0, vy: omega, vz: 0, m: 1 },
  ]
}

export const EULER_PERIOD = (2 * Math.PI) / Math.sqrt(1.25)

export function cloneStars(stars: Array<Star>): Array<Star> {
  return stars.map((star) => ({ ...star }))
}

function derivatives(stars: Array<Star>, epsilon: number): Deriv {
  const acceleration = accelerations(stars, epsilon)
  return stars.map((star, index) => ({
    dx: star.vx,
    dy: star.vy,
    dz: star.vz,
    dvx: acceleration[index][0],
    dvy: acceleration[index][1],
    dvz: acceleration[index][2],
  }))
}

function applyDerivatives(stars: Array<Star>, rate: Deriv, step: number): Array<Star> {
  return stars.map((star, index) => ({
    ...star,
    x: star.x + rate[index].dx * step,
    y: star.y + rate[index].dy * step,
    z: star.z + rate[index].dz * step,
    vx: star.vx + rate[index].dvx * step,
    vy: star.vy + rate[index].dvy * step,
    vz: star.vz + rate[index].dvz * step,
  }))
}

function rk4Step(stars: Array<Star>, step: number, epsilon: number): Array<Star> {
  const k1 = derivatives(stars, epsilon)
  const k2 = derivatives(applyDerivatives(stars, k1, step / 2), epsilon)
  const k3 = derivatives(applyDerivatives(stars, k2, step / 2), epsilon)
  const k4 = derivatives(applyDerivatives(stars, k3, step), epsilon)
  return stars.map((star, index) => ({
    ...star,
    x: star.x + (step / 6) * (k1[index].dx + 2 * k2[index].dx + 2 * k3[index].dx + k4[index].dx),
    y: star.y + (step / 6) * (k1[index].dy + 2 * k2[index].dy + 2 * k3[index].dy + k4[index].dy),
    z: star.z + (step / 6) * (k1[index].dz + 2 * k2[index].dz + 2 * k3[index].dz + k4[index].dz),
    vx: star.vx + (step / 6) * (k1[index].dvx + 2 * k2[index].dvx + 2 * k3[index].dvx + k4[index].dvx),
    vy: star.vy + (step / 6) * (k1[index].dvy + 2 * k2[index].dvy + 2 * k3[index].dvy + k4[index].dvy),
    vz: star.vz + (step / 6) * (k1[index].dvz + 2 * k2[index].dvz + 2 * k3[index].dvz + k4[index].dvz),
  }))
}

export function makeSim(
  stars: Array<Star>,
  options: {
    epsilon?: number
    trailMax?: number
    trailEvery?: number
    maxStep?: number
    period?: number | null
  } = {},
): Sim {
  const epsilon = options.epsilon ?? PERIODIC_EPSILON
  let centerX = 0
  let centerY = 0
  let centerZ = 0
  let mass = 0
  for (const star of stars) {
    centerX += star.x * star.m
    centerY += star.y * star.m
    centerZ += star.z * star.m
    mass += star.m
  }
  centerX /= mass
  centerY /= mass
  centerZ /= mass
  let scale0 = 0.2
  for (const star of stars) {
    scale0 = Math.max(scale0, Math.hypot(star.x - centerX, star.y - centerY, star.z - centerZ))
  }
  return {
    stars: cloneStars(stars),
    origin: cloneStars(stars),
    acc: accelerations(stars, epsilon),
    trails: stars.map((star) => [{ x: star.x, y: star.y, z: star.z }]),
    t: 0,
    scale0,
    minD: minPair(stars).d,
    escaped: null,
    trailClock: 0,
    epsilon,
    trailMax: options.trailMax ?? 860,
    trailEvery: options.trailEvery ?? 0.012,
    maxStep: options.maxStep ?? 0.003,
    period: options.period ?? null,
    extent: scale0,
  }
}

export const TRAIL_BREAK: Point = { x: Number.NaN, y: Number.NaN, z: Number.NaN }
export const TRAIL_JUMP = 0.16
const RECORD_DISTANCE = 0.04

export function isTrailBreak(point: Point) {
  return !Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z)
}

export function lastRealPoint(trail: Array<Point>) {
  for (let i = trail.length - 1; i >= 0; i -= 1) {
    if (!isTrailBreak(trail[i])) return trail[i]
  }
  return null
}

/** Consecutive samples belong on one stroke unless a period wrap or a teleport-sized jump. */
export function trailPairConnected(from: Point, to: Point, maxJump = TRAIL_JUMP) {
  if (isTrailBreak(from) || isTrailBreak(to)) return false
  return Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z) <= maxJump
}

export function maxAbsZ(stars: Array<Point>) {
  return stars.reduce((peak, star) => Math.max(peak, Math.abs(star.z)), 0)
}

function recordTrails(sim: Sim, force = false) {
  const due = force || sim.trailClock >= sim.trailEvery
  if (!due) {
    let far = false
    for (let i = 0; i < sim.stars.length; i += 1) {
      const last = lastRealPoint(sim.trails[i])
      if (!last) continue
      if (
        Math.hypot(sim.stars[i].x - last.x, sim.stars[i].y - last.y, sim.stars[i].z - last.z) >= RECORD_DISTANCE
      ) {
        far = true
        break
      }
    }
    if (!far) return
  } else {
    sim.trailClock %= sim.trailEvery
  }
  for (let i = 0; i < sim.stars.length; i += 1) {
    const trail = sim.trails[i]
    const point = { x: sim.stars[i].x, y: sim.stars[i].y, z: sim.stars[i].z }
    const last = trail[trail.length - 1]
    const lastReal = lastRealPoint(trail)
    if (lastReal && !trailPairConnected(lastReal, point) && (!last || !isTrailBreak(last))) {
      trail.push({ ...TRAIL_BREAK })
    }
    trail.push(point)
    if (trail.length > sim.trailMax) trail.splice(0, trail.length - sim.trailMax)
  }
}

function breakTrails(sim: Sim) {
  for (const trail of sim.trails) {
    const last = trail[trail.length - 1]
    if (last && isTrailBreak(last)) continue
    trail.push({ ...TRAIL_BREAK })
    if (trail.length > sim.trailMax) trail.splice(0, trail.length - sim.trailMax)
  }
}

function markEscape(sim: Sim) {
  if (sim.escaped !== null) return
  let centerX = 0
  let centerY = 0
  let centerZ = 0
  for (const star of sim.stars) {
    centerX += star.x / sim.stars.length
    centerY += star.y / sim.stars.length
    centerZ += star.z / sim.stars.length
  }
  sim.stars.forEach((star, index) => {
    if (Math.hypot(star.x - centerX, star.y - centerY, star.z - centerZ) > ESCAPE_MULT * sim.scale0) sim.escaped = index
  })
}

export function simulate(sim: Sim, budget: number) {
  let remaining = budget
  let guard = 0
  while (remaining > 1e-9 && guard < 24000) {
    guard += 1
    const step = Math.min(remaining, clamp(0.05 * Math.pow(Math.max(sim.minD, 1e-5), 1.5), 1e-7, sim.maxStep))
    sim.stars = rk4Step(sim.stars, step, sim.epsilon)
    sim.acc = accelerations(sim.stars, sim.epsilon)
    sim.t += step
    remaining -= step
    sim.trailClock += step
    sim.minD = minPair(sim.stars).d
    for (const star of sim.stars) {
      sim.extent = Math.max(sim.extent, Math.hypot(star.x, star.y, star.z))
    }
    recordTrails(sim)
    // Reseed published ICs after one period so unstable dances do not wander.
    // Break the stroke first: a LINE_STRIP from the last sample back to the
    // origin is a chord through empty space, not a physical segment.
    while (sim.period !== null && sim.period > 0 && sim.t >= sim.period && sim.escaped === null) {
      breakTrails(sim)
      sim.stars = cloneStars(sim.origin)
      sim.acc = accelerations(sim.stars, sim.epsilon)
      sim.t -= sim.period
      sim.minD = minPair(sim.stars).d
      recordTrails(sim, true)
    }
  }
  markEscape(sim)
}

export function mechanicalEnergy(stars: Array<Star>): number {
  let kinetic = 0
  let potential = 0
  for (const star of stars) {
    kinetic += 0.5 * star.m * (star.vx * star.vx + star.vy * star.vy + star.vz * star.vz)
  }
  for (let i = 0; i < stars.length; i += 1) {
    for (let j = i + 1; j < stars.length; j += 1) {
      potential -= (G * stars[i].m * stars[j].m) / Math.hypot(
        stars[j].x - stars[i].x,
        stars[j].y - stars[i].y,
        stars[j].z - stars[i].z,
      )
    }
  }
  return kinetic + potential
}

export function angularMomentumZ(stars: Array<Star>): number {
  return stars.reduce((sum, star) => sum + star.m * (star.x * star.vy - star.y * star.vx), 0)
}

export function returnProximity(start: Array<Star>, now: Array<Star>): number {
  return Math.hypot(
    ...start.flatMap((star, index) => [
      now[index].x - star.x,
      now[index].y - star.y,
      now[index].z - star.z,
      now[index].vx - star.vx,
      now[index].vy - star.vy,
      now[index].vz - star.vz,
    ]),
  )
}

/** Physics (x,y,z) → Three.js (x, z, y) so z is up. */
export function worldPosition(point: Point, scale = 1): [number, number, number] {
  return [point.x * scale, point.z * scale, point.y * scale]
}
