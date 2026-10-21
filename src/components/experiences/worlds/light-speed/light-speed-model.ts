/** Exact vacuum light speed in SI metres per second. */
export const C = 299_792_458

/** Space and ct use the same length unit; this is an event relative to the origin. */
export type SpacetimeEvent = { x: number; ct: number }

export type LightClockState = {
  /** Elapsed time on this clock, in the normalized units of labTime. */
  properTime: number
  /** Duration of a complete bottom → top → bottom trip in the lab frame. */
  roundTripTime: number
  /** Completed round trips, starting with zero at emission. */
  ticks: number
  /** Position in the current round trip, in [0, 1). */
  phase: number
  /** Photon position in the lab frame; mirrors are at y = 0 and y = height. */
  position: { x: number; y: number }
  /** Photon velocity divided by c, immediately after reflection at a mirror. */
  velocity: { x: number; y: number }
}

export type LightClockSample = {
  labTime: number
  beta: number
  height: number
  gamma: number
  stationary: LightClockState
  moving: LightClockState
}

/** Two spatial coordinates in light-seconds; ct is in light-seconds (c = 1). */
export type LightClockEvent = SpacetimeEvent & { y: number }

export type LightClockLegGeometry = {
  beta: number
  mirrorSeparation: number
  gamma: number
  /** The unchanged transverse mirror spacing, in light-seconds. */
  vertical: number
  /** Magnitude of mirror displacement. Its direction is reflectionLab.x's sign. */
  horizontal: number
  /** Distance travelled by light in the lab, in light-seconds. */
  hypotenuse: number
  /** Lab-coordinate duration, in seconds, from emission to reflection. */
  tLab: number
  /** Duration in the clock's inertial frame, never a photon's proper time. */
  tClock: number
  /** Both frames share this emission event and choose it as their origin. */
  emission: LightClockEvent
  reflectionLab: LightClockEvent
  reflectionClock: LightClockEvent
}

export type LightClockLegSample = {
  progress: number
  /** These are the same photon event expressed in the two inertial frames. */
  photonLab: LightClockEvent
  photonClock: LightClockEvent
  /** Mirror events simultaneous with photonLab in the lab frame. */
  lowerMirrorLab: LightClockEvent
  upperMirrorLab: LightClockEvent
}

function requireFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`)
}

function requireInertialBeta(beta: number): void {
  requireFinite(beta, 'beta')
  if (Math.abs(beta) >= 1) {
    throw new RangeError('An inertial observer requires |beta| < 1; there is no light rest frame')
  }
}

/** UI range only. Non-finite input is an error, not a physical velocity. */
export function clampBeta(beta: number): number {
  requireFinite(beta, 'beta')
  return Math.max(-0.98, Math.min(0.98, beta))
}

/** dτ/dt for a clock moving at a constant beta = v/c in the lab frame. */
export function properTimeRate(beta: number): number {
  requireInertialBeta(beta)
  return Math.sqrt((1 - beta) * (1 + beta))
}

export function lorentzFactor(beta: number): number {
  return 1 / properTimeRate(beta)
}

/**
 * Boost into the frame moving at +beta along x. Both origins coincide at ct = 0.
 * The inverse uses -beta. A null interval does not identify two events.
 */
export function transformEvent(event: SpacetimeEvent, beta: number): SpacetimeEvent {
  requireFinite(event.x, 'x')
  requireFinite(event.ct, 'ct')
  const gamma = lorentzFactor(beta)
  return {
    x: gamma * (event.x - beta * event.ct),
    ct: gamma * (event.ct - beta * event.x),
  }
}

/** Minkowski interval from the origin, with signature (+, −), in length². */
export function intervalSquared(event: SpacetimeEvent): number {
  requireFinite(event.x, 'x')
  requireFinite(event.ct, 'ct')
  return event.ct * event.ct - event.x * event.x
}

/** Collinear causal velocity u/c measured in the frame moving at +beta. */
export function transformVelocity(uOverC: number, beta: number): number {
  requireInertialBeta(beta)
  requireFinite(uOverC, 'uOverC')
  if (Math.abs(uOverC) > 1) throw new RangeError('A causal velocity requires |uOverC| ≤ 1')
  return (uOverC - beta) / (1 - uOverC * beta)
}

/** Total energy / rest energy = E/(mc²), for a massive particle. Not kinetic energy. */
export function energyRatio(beta: number): number {
  return lorentzFactor(beta)
}

function sampleClock(labTime: number, beta: number, height: number, rate: number): LightClockState {
  const properTime = labTime * rate
  const cycles = properTime / (2 * height)
  const ticks = Math.floor(cycles)
  const phase = cycles - ticks
  const upward = phase < 0.5

  return {
    properTime,
    roundTripTime: (2 * height) / rate,
    ticks,
    phase,
    position: {
      x: beta * labTime,
      y: height * (upward ? phase * 2 : (1 - phase) * 2),
    },
    velocity: { x: beta, y: upward ? rate : -rate },
  }
}

/**
 * Two ideal transverse light clocks in flat spacetime, sampled analytically.
 * c = 1: if height is in light-seconds, labTime is in seconds. Both pulses leave
 * the bottom mirror at t = 0; one clock stays at x = 0, one moves at x = beta t.
 * Motion has been uniform throughout. Changing beta selects a new experiment;
 * this is not an acceleration history or a simulation of a twin reunion.
 * Mirroring is instantaneous and transverse separation does not contract.
 */
export function lightClockSample(labTime: number, beta: number, height = 1): LightClockSample {
  requireFinite(labTime, 'labTime')
  requireFinite(height, 'height')
  if (labTime < 0) throw new RangeError('labTime must be non-negative')
  if (height <= 0) throw new RangeError('height must be positive')
  const rate = properTimeRate(beta)

  return {
    labTime,
    beta,
    height,
    gamma: 1 / rate,
    stationary: sampleClock(labTime, 0, height, 1),
    moving: sampleClock(labTime, beta, height, rate),
  }
}

/**
 * One upward leg of a transverse light clock, with uniform motion at beta c.
 * Light-second lengths and second durations make c = 1. The lab sees
 * h² + (beta tLab)² = tLab²; the clock frame sees a vertical path h in time h.
 * At beta = 0.8 and h = 3 the lab triangle is 3:4:5, while 5/5 = 3/3 = c.
 *
 * tClock is a coordinate duration assigned by synchronized clocks on the
 * apparatus, not the proper time along the light ray. A full counted tick
 * requires the return leg. Changing beta selects another inertial experiment;
 * interpolation between experiments must not be presented as acceleration.
 * See Einstein Online, "From light clocks to time dilation", and Tong,
 * Dynamics and Relativity, sections 7.1.1 and 7.2.2 (already in catalog sources).
 */
export function lightClockLegGeometry(beta: number, mirrorSeparation = 3): LightClockLegGeometry {
  requireFinite(mirrorSeparation, 'mirrorSeparation')
  if (mirrorSeparation <= 0) throw new RangeError('mirrorSeparation must be positive')
  const gamma = lorentzFactor(beta)
  const tLab = gamma * mirrorSeparation
  requireFinite(tLab, 'light-clock travel time')
  const displacement = beta * tLab

  return {
    beta,
    mirrorSeparation,
    gamma,
    vertical: mirrorSeparation,
    horizontal: Math.abs(displacement),
    hypotenuse: tLab,
    tLab,
    tClock: mirrorSeparation,
    emission: { x: 0, y: 0, ct: 0 },
    reflectionLab: { x: displacement, y: mirrorSeparation, ct: tLab },
    reflectionClock: { x: 0, y: mirrorSeparation, ct: mirrorSeparation },
  }
}

/**
 * Locate the light and both mirrors along one chosen inertial experiment.
 * Progress is clamped to [0, 1]; no elapsed history is accumulated. Renderers
 * can grow the triangle and move the upper mirror exactly onto the light ray.
 */
export function sampleLightClockLeg(geometry: LightClockLegGeometry, progress: number): LightClockLegSample {
  requireFinite(progress, 'progress')
  const fraction = Math.max(0, Math.min(1, progress))
  const ct = geometry.tLab * fraction
  const x = fraction === 0 ? 0 : geometry.reflectionLab.x * fraction
  const y = geometry.mirrorSeparation * fraction

  return {
    progress: fraction,
    photonLab: { x, y, ct },
    photonClock: { x: 0, y, ct: geometry.tClock * fraction },
    lowerMirrorLab: { x, y: 0, ct },
    upperMirrorLab: { x, y: geometry.mirrorSeparation, ct },
  }
}
