/** Cell-local distances are µm; motion is independent of Three and React. */
export type Vec3 = [number, number, number]
export type Quat = [number, number, number, number]
export interface WallCoordinate { azimuth: number; meridianUm: number; insetUm: number }
export interface ChloroplastPose {
  id: number
  positionUm: Vec3
  normal: Vec3
  longAxis: Vec3
  quaternion: Quat
  sizeScale: number
  wall: WallCoordinate
  speedUmPerSecond: number
}
export interface ChloroplastMotionState {
  poses: ChloroplastPose[]
  targets: WallCoordinate[]
  modeWeights: { dark: number; accumulation: number; avoidance: number }
  /** Stable destinations; IDs 1–24 may enter the caps, ID 0 stays on the side. */
  destinations: { dark: WallCoordinate[]; accumulation: WallCoordinate[]; avoidance: WallCoordinate[] }
  /** Broad neighbour cache, rebuilt only after a lens moves a micrometre. */
  neighbors: number[][]
  neighborReference: Vec3[]
  radii: number[]
}

export const CHLOROPLAST_COUNT = 200
export const FOCUS_INITIAL_POSITION: Vec3 = [13.55, 6, 0]
// Euler(0, π/2, -π/2): local [x,y,z] -> world [z,-x,-y].
export const FOCUS_INITIAL_QUATERNION: Quat = [-0.5, 0.5, -0.5, 0.5]
const TAU = Math.PI * 2
const WALL_RADIUS = 14.9, STRAIGHT_HALF_HEIGHT = 23, CAP_HEIGHT = 12
const SAMPLE_COUNT = 512, MIN_Y = -34.5, MAX_Y = 34.5
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value))
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle))
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }

/** Smoothed capsule reference; the rendered wall adds fine corrugations. */
function profile(y: number) {
  const cap = Math.max(0, Math.abs(y) - STRAIGHT_HALF_HEIGHT) / CAP_HEIGHT
  const root = Math.sqrt(Math.max(1e-8, 1 - cap * cap))
  return { radius: WALL_RADIUS * root, slope: cap ? -Math.sign(y) * WALL_RADIUS * cap / (CAP_HEIGHT * root) : 0 }
}
const meridians = [0]
for (let i = 1; i <= SAMPLE_COUNT; i++) {
  const y0 = MIN_Y + (MAX_Y - MIN_Y) * (i - 1) / SAMPLE_COUNT
  const y1 = MIN_Y + (MAX_Y - MIN_Y) * i / SAMPLE_COUNT
  meridians.push(meridians[i - 1] + Math.hypot(y1 - y0, profile(y1).radius - profile(y0).radius))
}
export const WALL_MERIDIAN_LENGTH_UM = meridians[SAMPLE_COUNT]
export function meridianAtHeight(y: number): number {
  const f = clamp((y - MIN_Y) / (MAX_Y - MIN_Y) * SAMPLE_COUNT, 0, SAMPLE_COUNT)
  const i = Math.min(SAMPLE_COUNT - 1, Math.floor(f))
  return meridians[i] + (meridians[i + 1] - meridians[i]) * (f - i)
}
function heightAtMeridian(u: number): number {
  let low = 0, high = SAMPLE_COUNT
  const value = clamp(u, 0, WALL_MERIDIAN_LENGTH_UM)
  while (high - low > 1) { const mid = (low + high) >> 1; if (meridians[mid] <= value) low = mid; else high = mid }
  const f = (value - meridians[low]) / (meridians[high] - meridians[low])
  return MIN_Y + (MAX_Y - MIN_Y) * (low + f) / SAMPLE_COUNT
}

function setQuaternion(out: Quat, x: Vec3, z: Vec3) {
  // Columns are the long axis, normal × long axis, and broad-face normal.
  const y: Vec3 = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]]
  const m00 = x[0], m01 = y[0], m02 = z[0], m10 = x[1], m11 = y[1], m12 = z[1], m20 = x[2], m21 = y[2], m22 = z[2]
  const trace = m00 + m11 + m22
  if (trace > 0) {
    const s = 2 * Math.sqrt(trace + 1)
    out[0] = (m21 - m12) / s; out[1] = (m02 - m20) / s; out[2] = (m10 - m01) / s; out[3] = s / 4
  } else if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22)
    out[0] = s / 4; out[1] = (m01 + m10) / s; out[2] = (m02 + m20) / s; out[3] = (m21 - m12) / s
  } else if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22)
    out[0] = (m01 + m10) / s; out[1] = s / 4; out[2] = (m12 + m21) / s; out[3] = (m02 - m20) / s
  } else {
    const s = 2 * Math.sqrt(1 + m22 - m00 - m11)
    out[0] = (m02 + m20) / s; out[1] = (m12 + m21) / s; out[2] = s / 4; out[3] = (m10 - m01) / s
  }
  if (out[3] < 0) for (let i = 0; i < 4; i++) out[i] *= -1
}

/** Updates existing tuples; renderers can keep references across every frame. */
export function updateChloroplastPose(pose: ChloroplastPose): void {
  const y = heightAtMeridian(pose.wall.meridianUm), { radius, slope } = profile(y)
  const cos = Math.cos(pose.wall.azimuth), sin = Math.sin(pose.wall.azimuth), norm = Math.hypot(1, slope)
  const n = pose.normal, major = pose.longAxis, p = pose.positionUm
  n[0] = cos / norm; n[1] = -slope / norm; n[2] = -sin / norm
  major[0] = -slope * cos / norm; major[1] = -1 / norm; major[2] = slope * sin / norm
  p[0] = radius * cos - n[0] * pose.wall.insetUm
  p[1] = y - n[1] * pose.wall.insetUm
  p[2] = -radius * sin - n[2] * pose.wall.insetUm
  setQuaternion(pose.quaternion, major, n)
}

// The rendered wall has small longitudinal and angular corrugations. The
// extra 0.2 µm keeps non-focus lenses inside those inward surface ripples.
function coordinate(y: number, azimuth: number, insetUm = 1.55): WallCoordinate {
  return { azimuth, meridianUm: meridianAtHeight(y), insetUm }
}
function radiusAt(wall: WallCoordinate): number {
  const { radius, slope } = profile(heightAtMeridian(wall.meridianUm))
  return Math.max(1, radius - wall.insetUm / Math.hypot(1, slope))
}
/** Elliptical footprints on the wall: >= 1 means separated at reference size. */
export function chloroplastClearance(a: ChloroplastPose, b: ChloroplastPose, candidate = a.wall): number {
  return Math.sqrt(clearanceSquared(a, b, candidate, radiusAt(candidate), radiusAt(b.wall)))
}
function clearanceSquared(a: ChloroplastPose, b: ChloroplastPose, candidate: WallCoordinate, radiusA: number, radiusB: number): number {
  const sizes = a.sizeScale + b.sizeScale
  const circumferenceDistance = (radiusA + radiusB) * Math.sin((candidate.azimuth - b.wall.azimuth) / 2)
  return ((candidate.meridianUm - b.wall.meridianUm) / (3 * sizes)) ** 2 + (circumferenceDistance / (1.9 * sizes)) ** 2
}
function rebuildNeighbors(state: ChloroplastMotionState): void {
  for (const pose of state.poses) {
    const list = state.neighbors[pose.id]
    list.length = 0
    state.neighborReference[pose.id][0] = pose.positionUm[0]
    state.neighborReference[pose.id][1] = pose.positionUm[1]
    state.neighborReference[pose.id][2] = pose.positionUm[2]
    for (const other of state.poses) {
      if (other === pose || Math.abs(other.wall.meridianUm - pose.wall.meridianUm) > 12) continue
      if ((pose.positionUm[0] - other.positionUm[0]) ** 2 + (pose.positionUm[1] - other.positionUm[1]) ** 2 + (pose.positionUm[2] - other.positionUm[2]) ** 2 < 144) list.push(other.id)
    }
  }
}

export function getChloroplastTargetWeights(ppfd: number) {
  // Phenomenological total-white-PPFD response. Arabidopsis experiments use
  // blue PPFD 3 / 20 / 50, not spinach white thresholds (doi:10.1038/s41598-018-19896-9).
  const light = Number.isFinite(ppfd) ? Math.max(0, ppfd) : 400
  const dark = 1 - smooth(0, 20, light), avoidance = smooth(180, 800, light) * (1 - dark)
  return { dark, accumulation: 1 - dark - avoidance, avoidance }
}

export function createChloroplastMotion(seed = 72018): ChloroplastMotionState {
  const noise = (index: number) => { const n = Math.sin((index + seed) * 12.9898) * 43758.5453; return n - Math.floor(n) }
  const makePose = (id: number, wall: WallCoordinate, sizeScale: number): ChloroplastPose => {
    const pose: ChloroplastPose = { id, wall, sizeScale, positionUm: [0, 0, 0], normal: [0, 0, 1], longAxis: [0, -1, 0], quaternion: [0, 0, 0, 1], speedUmPerSecond: (1 + noise(id * 3 + 7) * 2) / 60 }
    updateChloroplastPose(pose)
    return pose
  }
  const focus = makePose(0, coordinate(6, 0, WALL_RADIUS - FOCUS_INITIAL_POSITION[0]), 1)
  const candidates: ChloroplastPose[] = []
  for (let row = 0; row < 10; row++) for (let col = 0; col < 24; col++) {
    const index = row * 24 + col, y = -25.8 + row * 5.72
    const angle = col / 24 * TAU + (row % 2) * Math.PI / 24
    const candidate = makePose(index + 1, coordinate(y, angle), 0.87 + noise(index + 37) * 0.035)
    if (chloroplastClearance(candidate, focus) >= 1.035) candidates.push(candidate)
  }
  // Reserve the focus footprint, then select evenly over all ten staggered rows.
  const selected = Array.from({ length: CHLOROPLAST_COUNT - 1 }, (_, i) => candidates[Math.floor(i * candidates.length / (CHLOROPLAST_COUNT - 1))])
  // The lattice is only a collision-free packing seed. Hard-ellipse Monte Carlo
  // relaxation removes its rows before rendering, without deleting lenses or
  // squeezing their footprints. This is initialization, not simulated motion.
  const packed = [focus, ...selected], packedRadii = packed.map((pose) => radiusAt(pose.wall))
  const minU = meridianAtHeight(-29), maxU = meridianAtHeight(29)
  let randomState = seed >>> 0
  const random = () => {
    randomState += 0x6D2B79F5
    let value = Math.imul(randomState ^ randomState >>> 15, 1 | randomState)
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value)
    return ((value ^ value >>> 14) >>> 0) / 4294967296
  }
  for (let sweep = 0; sweep < 120; sweep++) for (let index = 1; index < packed.length; index++) {
    const pose = packed[index], wall = pose.wall, oldU = wall.meridianUm, oldA = wall.azimuth
    const proposedU = oldU + (random() - 0.5) * 4.6
    if (proposedU < minU || proposedU > maxU) continue
    wall.meridianUm = proposedU
    wall.azimuth = wrap(oldA + (random() - 0.5) * 4.6 / packedRadii[index])
    const candidateRadius = radiusAt(wall)
    const separated = packed.every((other, otherIndex) => otherIndex === index || clearanceSquared(pose, other, wall, candidateRadius, packedRadii[otherIndex]) >= 1.015 ** 2)
    if (separated) packedRadii[index] = candidateRadius
    else { wall.meridianUm = oldU; wall.azimuth = oldA }
  }
  selected.forEach(updateChloroplastPose)
  selected.sort((a, b) => b.wall.meridianUm - a.wall.meridianUm || a.wall.azimuth - b.wall.azimuth)
  const poses = [focus, ...selected]
  poses.forEach((pose, id) => { pose.id = id; pose.speedUmPerSecond = (1 + noise(id * 3 + 7) * 2) / 60 })
  const destinations = { dark: [] as WallCoordinate[], accumulation: [] as WallCoordinate[], avoidance: [] as WallCoordinate[] }
  for (const pose of poses) {
    const y = heightAtMeridian(pose.wall.meridianUm), pole = pose.id > 0 && pose.id <= 24
    // Only a small cap population migrates onto a broad upper/lower surface.
    // The others remain distributed on both walls with a modest vertical bias.
    const capY = pose.id <= 8 ? 33 : 29.6
    const capAngle = pole ? (pose.id <= 8 ? (pose.id - 1) / 8 : (pose.id - 9) / 16) * TAU : pose.wall.azimuth
    destinations.accumulation.push(coordinate(pole ? capY : clamp(y * 0.9 + 3.5, -26, 27), capAngle, pose.wall.insetUm))
    destinations.dark.push(coordinate(pole ? -capY : clamp(y * 0.9 - 3.5, -27, 26), capAngle, pose.wall.insetUm))
    destinations.avoidance.push(coordinate(clamp(y * 0.86, -23, 23), pose.wall.azimuth, pose.wall.insetUm))
  }
  const state: ChloroplastMotionState = {
    poses, targets: poses.map((pose) => ({ ...pose.wall })), modeWeights: getChloroplastTargetWeights(400), destinations,
    neighbors: poses.map(() => []), neighborReference: poses.map((pose) => [...pose.positionUm]), radii: poses.map((pose) => radiusAt(pose.wall)),
  }
  rebuildNeighbors(state)
  return state
}

/** Total tangent motion, including repulsion, is bounded by each real speed. */
export function advanceChloroplastMotion(state: ChloroplastMotionState, ppfd: number, dtSimSeconds: number): void {
  if (!(dtSimSeconds > 0) || !Number.isFinite(dtSimSeconds)) return
  let remaining = dtSimSeconds
  while (remaining > 1e-9) { const dt = Math.min(15, remaining); advanceMotionStep(state, ppfd, dt); remaining -= dt }
}

function advanceMotionStep(state: ChloroplastMotionState, ppfd: number, dtSimSeconds: number): void {
  const weights = getChloroplastTargetWeights(ppfd)
  Object.assign(state.modeWeights, weights)
  if (state.poses.some((pose) => pose.positionUm.reduce((sum, value, i) => sum + (value - state.neighborReference[pose.id][i]) ** 2, 0) > 1)) rebuildNeighbors(state)
  for (const pose of state.poses) {
    const index = pose.id, target = state.targets[index], wall = pose.wall
    let du = 0, da = 0
    for (const mode of ['dark', 'accumulation', 'avoidance'] as const) {
      const destination = state.destinations[mode][index]
      du += (destination.meridianUm - wall.meridianUm) * weights[mode]
      da += wrap(destination.azimuth - wall.azimuth) * weights[mode]
    }
    target.meridianUm = wall.meridianUm + du; target.azimuth = wall.azimuth + da
    const radius = state.radii[index], distance = Math.hypot(du, da * radius)
    let velocityU = distance > 0.02 ? du / distance : 0, velocityA = distance > 0.02 ? da * radius / distance : 0
    for (const otherIndex of state.neighbors[index]) {
      const other = state.poses[otherIndex]
      const squared = clearanceSquared(pose, other, wall, radius, state.radii[otherIndex])
      if (squared >= 1.69) continue
      const clearance = Math.sqrt(squared)
      const awayU = wall.meridianUm - other.wall.meridianUm, awayA = wrap(wall.azimuth - other.wall.azimuth) * radius
      const length = Math.hypot(awayU, awayA)
      if (length > 1e-8) { const repulsion = (1.3 - clearance) * 3; velocityU += awayU / length * repulsion; velocityA += awayA / length * repulsion }
    }
    const norm = Math.hypot(velocityU, velocityA)
    if (norm < 1e-8) continue
    const step = Math.min(pose.speedUmPerSecond * dtSimSeconds, Math.max(distance, 0.03))
    const oldU = wall.meridianUm, oldA = wall.azimuth
    const previous: Vec3 = [...pose.positionUm]
    let accepted = false
    // A short line search prevents the repulsion correction from pushing a
    // neighbour through another lens, and keeps the displacement speed honest.
    for (let attempt = 0; attempt < 9; attempt++) {
      const fraction = 0.5 ** attempt
      wall.meridianUm = clamp(oldU + velocityU / norm * step * fraction, 0, WALL_MERIDIAN_LENGTH_UM)
      wall.azimuth = wrap(oldA + velocityA / norm * step * fraction / radius)
      const newRadius = radiusAt(wall)
      const separated = state.neighbors[index].every((otherIndex) => clearanceSquared(pose, state.poses[otherIndex], wall, newRadius, state.radii[otherIndex]) >= 1 - 1e-8)
      if (!separated) continue
      updateChloroplastPose(pose)
      if (Math.hypot(...pose.positionUm.map((v, i) => v - previous[i])) <= pose.speedUmPerSecond * dtSimSeconds + 1e-8) { accepted = true; state.radii[index] = newRadius; break }
    }
    if (!accepted) { wall.meridianUm = oldU; wall.azimuth = oldA; updateChloroplastPose(pose) }
  }
}
