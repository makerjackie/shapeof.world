/**
 * Qualitative chemical-garden model for the Chemical Garden world.
 *
 * This is an independently authored, illustrative mechanism model rather
 * than a quantitative prediction of any particular laboratory recipe. It
 * preserves the causal order that makes a chemical garden possible:
 *
 * salt falls -> a semipermeable precipitate membrane forms -> osmotic
 * pressure rises -> the membrane ruptures -> a buoyant salt jet lays down
 * a hollow precipitate tube -> the finite salt supply is exhausted.
 *
 * Tube growth is deliberately pulsed. A rupture releases pressure, the tear
 * reseals, pressure builds again, and another short jet advances a tip. The
 * visual layer therefore receives geometry caused by the model, not an
 * endlessly growing decorative particle system.
 */

export type GardenMineral = 'copper' | 'iron' | 'cobalt'

export type Vec3 = {
  x: number
  y: number
  z: number
}

export type GardenStage =
  | 'falling'
  | 'membrane'
  | 'pressurizing'
  | 'rupture'
  | 'growing'
  | 'spent'

export type GardenStoryStage = 'spectacle' | 'membrane' | 'rupture' | 'tube' | 'garden'

export type TubeSegment = {
  id: number
  seedId: number
  tipId: number
  mineral: GardenMineral
  /** 0 is the original trunk; larger values are true descendant tips. */
  branchDepth: number
  from: Vec3
  to: Vec3
  /** Outer radius in scene units. */
  radius: number
  /** Inner radius makes the intended geometry explicitly hollow. */
  innerRadius: number
  color: string
  age: number
}

export type GardenTip = {
  id: number
  position: Vec3
  direction: Vec3
  radius: number
  branchDepth: number
  segmentsGrown: number
  branchesCreated: number
  distanceSinceBranch: number
  active: boolean
}

export type GardenSeed = {
  id: number
  mineral: GardenMineral
  stage: GardenStage
  age: number
  stageAge: number
  /** Crystal position while falling; fixed at the substrate afterwards. */
  position: Vec3
  velocity: Vec3
  /** Primary growing-tip position, convenient for camera/readout code. */
  tip: Vec3
  tips: Array<GardenTip>
  soluteInitial: number
  soluteRemaining: number
  soluteInMembrane: number
  soluteInTubes: number
  membraneProgress: number
  osmoticPressure: number
  membraneStrength: number
  /** 0..1 strength of the currently escaping jet. */
  rupturePulse: number
  segmentsGrown: number
  growthCredit: number
  tipCursor: number
}

export type GardenRuntime = {
  /** Marks the scientific scope for any UI that exposes model details. */
  modelKind: 'illustrative-qualitative'
  time: number
  accumulator: number
  seeds: Array<GardenSeed>
  segments: Array<TubeSegment>
  rngState: number
  nextSeedId: number
  nextSegmentId: number
  nextTipId: number
}

export type GardenMineralPreset = {
  /** The presets are artistic/qualitative, not measured recipes. */
  illustrative: true
  colors: readonly [string, string, string]
  initialSolute: number
  membraneRate: number
  membraneSolute: number
  osmoticRate: number
  membraneStrength: number
  growthSpeed: number
  segmentLength: number
  segmentSolute: number
  baseRadius: number
  taper: number
  buoyancy: number
  jetInertia: number
  perturbation: number
  branchChance: number
  branchAngle: number
  maxTips: number
  pulseDecay: number
}

/**
 * Three visibly distinct qualitative morphologies. Values are tuned in scene
 * units and should not be read as measured material constants.
 */
export const GARDEN_MINERALS: Record<GardenMineral, GardenMineralPreset> = {
  copper: {
    illustrative: true,
    colors: ['#53e3df', '#2aa9bd', '#91f1c8'],
    initialSolute: 1.5,
    membraneRate: 0.72,
    membraneSolute: 0.12,
    osmoticRate: 1.28,
    membraneStrength: 0.92,
    growthSpeed: 0.64,
    segmentLength: 0.075,
    segmentSolute: 0.009,
    baseRadius: 0.054,
    taper: 0.004,
    buoyancy: 0.34,
    jetInertia: 0.88,
    perturbation: 0.22,
    branchChance: 0.26,
    branchAngle: 0.92,
    maxTips: 12,
    pulseDecay: 1.7,
  },
  iron: {
    illustrative: true,
    colors: ['#e0a34d', '#b75f30', '#f0cc76'],
    initialSolute: 1.62,
    membraneRate: 0.58,
    membraneSolute: 0.15,
    osmoticRate: 1.05,
    membraneStrength: 1.08,
    growthSpeed: 0.48,
    segmentLength: 0.068,
    segmentSolute: 0.01,
    baseRadius: 0.064,
    taper: 0.006,
    buoyancy: 0.22,
    jetInertia: 0.78,
    perturbation: 0.34,
    branchChance: 0.34,
    branchAngle: 1.05,
    maxTips: 16,
    pulseDecay: 1.45,
  },
  cobalt: {
    illustrative: true,
    colors: ['#7467f2', '#3e49b7', '#a695ff'],
    initialSolute: 1.4,
    membraneRate: 0.66,
    membraneSolute: 0.105,
    osmoticRate: 1.42,
    membraneStrength: 0.98,
    growthSpeed: 0.72,
    segmentLength: 0.082,
    segmentSolute: 0.0085,
    baseRadius: 0.046,
    taper: 0.003,
    buoyancy: 0.42,
    jetInertia: 0.92,
    perturbation: 0.18,
    branchChance: 0.2,
    branchAngle: 0.84,
    maxTips: 10,
    pulseDecay: 1.9,
  },
}

const FIXED_STEP = 1 / 60
/** Shared scene convention: the glass-vessel floor sits near y = -2.45. */
const SUBSTRATE_Y = -2.45
const DEFAULT_MAX_SEGMENTS = 780
const EPSILON = 1e-10

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const copyVec = (value: Vec3): Vec3 => ({ x: value.x, y: value.y, z: value.z })

const normalize = (value: Vec3): Vec3 => {
  const length = Math.hypot(value.x, value.y, value.z) || 1
  return { x: value.x / length, y: value.y / length, z: value.z / length }
}

const addScaled = (origin: Vec3, direction: Vec3, scale: number): Vec3 => ({
  x: origin.x + direction.x * scale,
  y: origin.y + direction.y * scale,
  z: origin.z + direction.z * scale,
})

function random(runtime: GardenRuntime): number {
  runtime.rngState = (runtime.rngState + 0x6d2b79f5) >>> 0
  let value = runtime.rngState
  value = Math.imul(value ^ (value >>> 15), value | 1)
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
  return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
}

const randomSigned = (runtime: GardenRuntime) => random(runtime) * 2 - 1

export function createGardenRuntime(seed = 0x43_48_45_4d): GardenRuntime {
  return {
    modelKind: 'illustrative-qualitative',
    time: 0,
    accumulator: 0,
    seeds: [],
    segments: [],
    rngState: Number.isFinite(seed) ? seed >>> 0 : 0x43_48_45_4d,
    nextSeedId: 1,
    nextSegmentId: 1,
    nextTipId: 1,
  }
}

export function plantGardenSeed(
  runtime: GardenRuntime,
  mineral: GardenMineral,
  x: number,
  z = randomSigned(runtime) * 0.22,
): GardenSeed {
  const preset = GARDEN_MINERALS[mineral]
  const position = {
    x: clamp(Number.isFinite(x) ? x : 0, -2.7, 2.7),
    y: 2.42 + random(runtime) * 0.32,
    z: clamp(Number.isFinite(z) ? z : 0, -0.72, 0.72),
  }
  const strengthVariation = 0.94 + random(runtime) * 0.12
  const seed: GardenSeed = {
    id: runtime.nextSeedId,
    mineral,
    stage: 'falling',
    age: 0,
    stageAge: 0,
    position,
    velocity: { x: 0, y: -0.12, z: 0 },
    tip: copyVec(position),
    tips: [],
    soluteInitial: preset.initialSolute,
    soluteRemaining: preset.initialSolute,
    soluteInMembrane: 0,
    soluteInTubes: 0,
    membraneProgress: 0,
    osmoticPressure: 0,
    membraneStrength: preset.membraneStrength * strengthVariation,
    rupturePulse: 0,
    segmentsGrown: 0,
    growthCredit: 0,
    tipCursor: 0,
  }
  runtime.nextSeedId += 1
  runtime.seeds.push(seed)
  return seed
}

function enterStage(seed: GardenSeed, stage: GardenStage): void {
  seed.stage = stage
  seed.stageAge = 0
}

function formMembrane(seed: GardenSeed, preset: GardenMineralPreset, dt: number): void {
  const previous = seed.membraneProgress
  seed.membraneProgress = Math.min(1, previous + preset.membraneRate * dt)
  const targetMass = preset.membraneSolute * seed.membraneProgress
  const mass = Math.min(seed.soluteRemaining, Math.max(0, targetMass - seed.soluteInMembrane))
  seed.soluteRemaining -= mass
  seed.soluteInMembrane += mass
  if (seed.membraneProgress >= 1 - EPSILON) enterStage(seed, 'pressurizing')
}

function beginRupture(seed: GardenSeed): void {
  seed.osmoticPressure *= 0.18
  seed.rupturePulse = 1
  enterStage(seed, 'rupture')
}

function createInitialTip(seed: GardenSeed, runtime: GardenRuntime, preset: GardenMineralPreset): void {
  const direction = normalize({
    x: randomSigned(runtime) * 0.12,
    y: 1,
    z: randomSigned(runtime) * 0.12,
  })
  const position = { x: seed.position.x, y: SUBSTRATE_Y + 0.025, z: seed.position.z }
  seed.tip = copyVec(position)
  seed.tips = [{
    id: runtime.nextTipId,
    position,
    direction,
    radius: preset.baseRadius,
    branchDepth: 0,
    segmentsGrown: 0,
    branchesCreated: 0,
    distanceSinceBranch: 0,
    active: true,
  }]
  runtime.nextTipId += 1
}

function perturbedDirection(
  runtime: GardenRuntime,
  tip: GardenTip,
  preset: GardenMineralPreset,
): Vec3 {
  const noiseScale = preset.perturbation * (1 + tip.branchDepth * 0.08)
  const buoyancy = preset.buoyancy * (tip.branchDepth === 0 ? 1 : 0.48)
  const direction = normalize({
    x: tip.direction.x * preset.jetInertia + randomSigned(runtime) * noiseScale,
    y: tip.direction.y * preset.jetInertia + buoyancy + random(runtime) * 0.06,
    z: tip.direction.z * preset.jetInertia + randomSigned(runtime) * noiseScale,
  })
  // Buoyancy biases the whole garden upward without forbidding local bends.
  if (direction.y < 0.08) return normalize({ ...direction, y: 0.08 })
  return direction
}

function branchDirection(
  runtime: GardenRuntime,
  parent: Vec3,
  preset: GardenMineralPreset,
): Vec3 {
  const azimuth = random(runtime) * Math.PI * 2
  const radial = Math.sin(preset.branchAngle)
  const up = Math.cos(preset.branchAngle)
  return normalize({
    x: parent.x * 0.2 + Math.cos(azimuth) * radial,
    y: Math.max(0.12, parent.y * 0.2 + up),
    z: parent.z * 0.2 + Math.sin(azimuth) * radial,
  })
}

function growOneSegment(
  runtime: GardenRuntime,
  seed: GardenSeed,
  preset: GardenMineralPreset,
  maxSegments: number,
): boolean {
  if (runtime.segments.length >= maxSegments || seed.tips.length === 0) return false
  const activeTips = seed.tips.filter((tip) => tip.active)
  if (activeTips.length === 0) return false
  // The original jet remains the main trunk while daughter jets receive
  // enough flow to become readable branches. Equal round-robin allocation
  // makes every tip stall into a low brush as soon as branching begins.
  const weights = activeTips.map((tip) => (tip.branchDepth === 0 ? 6 : tip.branchDepth === 1 ? 3 : 1))
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  let slot = seed.tipCursor % totalWeight
  let tip = activeTips[0]
  for (let index = 0; index < activeTips.length; index += 1) {
    slot -= weights[index]
    if (slot < 0) {
      tip = activeTips[index]
      break
    }
  }
  seed.tipCursor += 1

  // A hollow wall keeps consuming material even after a branch narrows; the
  // floor prevents visually thin tips from becoming almost free geometry.
  const radiusScale = Math.max(0.55, (tip.radius / preset.baseRadius) ** 2)
  const soluteCost = preset.segmentSolute * radiusScale
  if (seed.soluteRemaining + EPSILON < soluteCost) return false

  const direction = perturbedDirection(runtime, tip, preset)
  const from = copyVec(tip.position)
  const to = addScaled(from, direction, preset.segmentLength)
  const color = preset.colors[Math.floor(random(runtime) * preset.colors.length)]
  const radius = tip.radius
  runtime.segments.push({
    id: runtime.nextSegmentId,
    seedId: seed.id,
    tipId: tip.id,
    mineral: seed.mineral,
    branchDepth: tip.branchDepth,
    from,
    to,
    radius,
    innerRadius: radius * 0.66,
    color,
    age: 0,
  })
  runtime.nextSegmentId += 1
  seed.soluteRemaining = Math.max(0, seed.soluteRemaining - soluteCost)
  seed.soluteInTubes += soluteCost
  seed.segmentsGrown += 1
  tip.position = to
  tip.direction = direction
  tip.radius = Math.max(preset.baseRadius * 0.42, radius * (1 - preset.taper))
  tip.segmentsGrown += 1
  tip.distanceSinceBranch += preset.segmentLength
  seed.tip = copyVec(to)

  const branchSpacing = preset.segmentLength * (2.35 + tip.branchDepth * 0.75)
  const firstBranchDeadline = 3 + Math.min(2, tip.branchDepth)
  const forceFirstBranch = (
    tip.branchDepth === 0
    && tip.branchesCreated === 0
    && tip.segmentsGrown >= firstBranchDeadline
  )
  if (
    seed.tips.length < preset.maxTips
    && tip.distanceSinceBranch >= branchSpacing
    && (forceFirstBranch || random(runtime) < preset.branchChance)
  ) {
    tip.distanceSinceBranch = 0
    tip.branchesCreated += 1
    seed.tips.push({
      id: runtime.nextTipId,
      position: copyVec(to),
      direction: branchDirection(runtime, direction, preset),
      radius: tip.radius * 0.78,
      branchDepth: tip.branchDepth + 1,
      segmentsGrown: 0,
      branchesCreated: 0,
      distanceSinceBranch: 0,
      active: true,
    })
    runtime.nextTipId += 1
  }
  return true
}

function growTubes(
  runtime: GardenRuntime,
  seed: GardenSeed,
  preset: GardenMineralPreset,
  dt: number,
  maxSegments: number,
): void {
  // A render-budget stop is not a chemical rupture. Freeze the jet without
  // consuming solute; if a caller later raises the cap, pressure can resume.
  if (runtime.segments.length >= maxSegments) {
    seed.rupturePulse = 0
    return
  }
  const remainingFraction = seed.soluteRemaining / seed.soluteInitial
  if (seed.rupturePulse > 0) {
    const pulse = seed.rupturePulse
    seed.growthCredit += preset.growthSpeed * (0.28 + 0.72 * pulse) * dt
    seed.rupturePulse = Math.max(0, pulse - preset.pulseDecay * dt)
    seed.osmoticPressure = Math.max(0, seed.osmoticPressure - 0.7 * dt)
  } else {
    seed.osmoticPressure += preset.osmoticRate * (0.3 + 0.7 * remainingFraction) * dt
    if (seed.osmoticPressure >= seed.membraneStrength * 0.58) {
      seed.osmoticPressure *= 0.2
      seed.rupturePulse = 0.82 + random(runtime) * 0.14
    }
  }

  while (seed.growthCredit + EPSILON >= preset.segmentLength) {
    if (!growOneSegment(runtime, seed, preset, maxSegments)) break
    seed.growthCredit -= preset.segmentLength
  }

  const minimumCost = preset.segmentSolute * 0.55
  if (seed.soluteRemaining + EPSILON < minimumCost) {
    seed.rupturePulse = 0
    seed.tips.forEach((tip) => { tip.active = false })
    enterStage(seed, 'spent')
  }
}

function fixedStep(runtime: GardenRuntime, dt: number, maxSegments: number): void {
  runtime.time += dt
  runtime.segments.forEach((segment) => { segment.age += dt })

  for (const seed of runtime.seeds) {
    seed.age += dt
    seed.stageAge += dt
    const preset = GARDEN_MINERALS[seed.mineral]
    if (seed.stage === 'falling') {
      seed.velocity.y -= 3.2 * dt
      seed.position.y += seed.velocity.y * dt
      if (seed.position.y <= SUBSTRATE_Y) {
        seed.position.y = SUBSTRATE_Y
        seed.velocity = { x: 0, y: 0, z: 0 }
        seed.tip = copyVec(seed.position)
        enterStage(seed, 'membrane')
      }
      continue
    }
    if (seed.stage === 'membrane') {
      formMembrane(seed, preset, dt)
      continue
    }
    if (seed.stage === 'pressurizing') {
      const remainingFraction = seed.soluteRemaining / seed.soluteInitial
      seed.osmoticPressure += preset.osmoticRate * (0.35 + 0.65 * remainingFraction) * dt
      if (seed.osmoticPressure >= seed.membraneStrength) beginRupture(seed)
      continue
    }
    if (seed.stage === 'rupture') {
      if (seed.stageAge >= 0.2) {
        createInitialTip(seed, runtime, preset)
        enterStage(seed, 'growing')
      }
      continue
    }
    if (seed.stage === 'growing') growTubes(runtime, seed, preset, dt, maxSegments)
  }
}

/**
 * Advances in deterministic 1/60 s steps and mutates/returns the same runtime.
 * Supplying time in different frame-size chunks therefore produces the same
 * state, provided the same seed and actions are used.
 */
export function advanceGarden(
  runtime: GardenRuntime,
  dt: number,
  options: { maxSegments?: number } = {},
): GardenRuntime {
  if (!Number.isFinite(dt) || dt <= 0) return runtime
  const maxSegments = Math.max(0, Math.floor(options.maxSegments ?? DEFAULT_MAX_SEGMENTS))
  runtime.accumulator += dt
  const steps = Math.floor((runtime.accumulator + EPSILON) / FIXED_STEP)
  runtime.accumulator -= steps * FIXED_STEP
  if (Math.abs(runtime.accumulator) < EPSILON) runtime.accumulator = 0
  for (let step = 0; step < steps; step += 1) fixedStep(runtime, FIXED_STEP, maxSegments)
  return runtime
}

function advanceUntil(
  runtime: GardenRuntime,
  predicate: () => boolean,
  maxSeconds = 45,
  maxSegments = DEFAULT_MAX_SEGMENTS,
): GardenRuntime {
  const maxSteps = Math.ceil(maxSeconds / FIXED_STEP)
  for (let step = 0; step < maxSteps && !predicate(); step += 1) {
    advanceGarden(runtime, FIXED_STEP, { maxSegments })
  }
  return runtime
}

/** Deterministic tableaux used by GuideTour beats and poster composition. */
export function createStagedGarden(stage: GardenStoryStage, seed = 0x47_41_52_44): GardenRuntime {
  const runtime = createGardenRuntime(seed)
  if (stage === 'membrane') {
    const crystal = plantGardenSeed(runtime, 'copper', 0, 0)
    return advanceUntil(runtime, () => crystal.stage === 'membrane' && crystal.membraneProgress >= 0.68)
  }
  if (stage === 'rupture') {
    const crystal = plantGardenSeed(runtime, 'copper', 0, 0)
    return advanceUntil(runtime, () => crystal.stage === 'rupture')
  }
  if (stage === 'tube') {
    const crystal = plantGardenSeed(runtime, 'cobalt', 0, 0)
    return advanceUntil(runtime, () => crystal.segmentsGrown >= 18)
  }

  // The wide story tableaux use several real salt grains at staggered depths.
  // Their branches still emerge only through the same rupture/growth model;
  // no decorative geometry is inserted for the opening shot.
  plantGardenSeed(runtime, 'copper', -2.12, -0.28)
  plantGardenSeed(runtime, 'iron', -1.42, 0.24)
  plantGardenSeed(runtime, 'cobalt', -0.7, -0.1)
  plantGardenSeed(runtime, 'copper', 0, 0.31)
  plantGardenSeed(runtime, 'iron', 0.72, -0.3)
  plantGardenSeed(runtime, 'cobalt', 1.43, 0.16)
  plantGardenSeed(runtime, 'copper', 2.12, -0.06)
  const target = stage === 'spectacle' ? 480 : 720
  return advanceUntil(runtime, () => runtime.segments.length >= target, 60, target)
}
