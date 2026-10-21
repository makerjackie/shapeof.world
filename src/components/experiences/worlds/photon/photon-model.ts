export const LIGHT_SPEED = 299_792_458
export const PLANCK = 6.626_070_15e-34
export const EV_J = 1.602_176_634e-19
export const SCREEN_HALF_WIDTH = 0.016

const SCREEN_DISTANCE = 2
const SLIT_WIDTH = 0.000_06
const DISTRIBUTION_INTERVALS = 4096

export interface DetectionDistribution {
  positions: Float64Array
  cdf: Float64Array
}

export type ClockObserver = 'ground' | 'moving'

function positiveFinite(value: number, name: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be finite and positive`)
  }
}

function nonnegativeFinite(value: number, name: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be finite and nonnegative`)
  }
}

function wavelengthMeters(wavelengthNm: number) {
  positiveFinite(wavelengthNm, 'wavelengthNm')
  const meters = wavelengthNm * 1e-9
  positiveFinite(meters, 'wavelength in meters')
  return meters
}

// Exact SI constants: https://www.nist.gov/pml/special-publication-330/sp-330-section-2
export function photonProperties(wavelengthNm: number) {
  const wavelength = wavelengthMeters(wavelengthNm)
  const frequency = LIGHT_SPEED / wavelength
  positiveFinite(frequency, 'frequency')
  return {
    frequencyTHz: frequency / 1e12,
    energyEv: PLANCK * frequency / EV_J,
  }
}

/**
 * Narrow-band radiant power: photon rate × energy per photon, not perceived brightness.
 * At fixed beam area, irradiance has the same proportionality. Detector losses are omitted.
 * https://nvlpubs.nist.gov/nistpubs/Legacy/TN/nbstechnicalnote910-1.pdf
 */
export function photonBeamProperties(wavelengthNm: number, photonsPerSecond: number) {
  nonnegativeFinite(photonsPerSecond, 'photonsPerSecond')
  const properties = photonProperties(wavelengthNm)
  const powerWatts = properties.energyEv * EV_J * photonsPerSecond
  nonnegativeFinite(powerWatts, 'powerWatts')
  return { ...properties, photonsPerSecond, powerWatts }
}

/**
 * Center of a collimated narrow-band pulse launched at x = 0, t = 0 in vacuum.
 * Wavelength changes its central energy, not its envelope speed. c can use display units.
 * The pulse has a finite bandwidth; this is not a literal shape of an individual photon.
 * https://courses.physics.illinois.edu/phys436/sp2016/Phase_group_vel.html
 */
export function vacuumPulseState(elapsedTime: number, wavelengthNm: number, c = LIGHT_SPEED) {
  nonnegativeFinite(elapsedTime, 'elapsedTime')
  positiveFinite(c, 'c')
  const properties = photonProperties(wavelengthNm)
  const x = c * elapsedTime
  nonnegativeFinite(x, 'pulse position')
  return { x, speed: c, ...properties }
}

/** Ideal pure linear path markers; no analyzer or absorption is modeled. */
export function polarizationVisibility(angleDegrees: number) {
  if (!Number.isFinite(angleDegrees) || angleDegrees < 0 || angleDegrees > 90) {
    throw new RangeError('marker angle must be in [0, 90]')
  }
  return angleDegrees === 90 ? 0 : Math.cos(angleDegrees * Math.PI / 180)
}

function sinc(value: number) {
  return Math.abs(value) < 1e-8 ? 1 - value * value / 6 : Math.sin(value) / value
}

/**
 * Equal coherent slits, scalar Fraunhofer approximation, L = 2 m, a = 0.06 mm.
 * Relative density; it is normalized over the visible detector for sampling.
 * whichPath enables linear polarization markers separated by markerAngle degrees.
 * Tracing over orthogonal markers removes the cross term, even if nobody reads them. Equal slits then give the same normalized envelope as one slit, not equal flux.
 * Model: https://arxiv.org/html/2401.02351v1 (equations 3–6).
 */
export function interferenceDensity(
  yMeters: number,
  wavelengthNm: number,
  slitDistanceMm: number,
  twoSlits = true,
  whichPath = false,
  markerAngle = 90,
) {
  if (!Number.isFinite(yMeters)) throw new RangeError('yMeters must be finite')
  const wavelength = wavelengthMeters(wavelengthNm)
  positiveFinite(slitDistanceMm, 'slitDistanceMm')
  const scale = Math.PI * yMeters / (wavelength * SCREEN_DISTANCE)
  if (!Number.isFinite(scale)) throw new RangeError('Diffraction phase must be finite')
  const envelope = sinc(SLIT_WIDTH * scale) ** 2
  const visibility = whichPath ? polarizationVisibility(markerAngle) : 1
  // Equal path amplitudes with linear polarization overlap cos(theta). The common
  // scale keeps the historic peak convention; sampling normalizes the whole window.
  return twoSlits ? envelope * (1 + visibility * Math.cos(2 * slitDistanceMm * 1e-3 * scale)) / (1 + visibility) : envelope
}

export function createDetectionDistribution(
  wavelengthNm: number,
  slitDistanceMm: number,
  twoSlits = true,
  whichPath = false,
  markerAngle = 90,
): DetectionDistribution {
  const positions = new Float64Array(DISTRIBUTION_INTERVALS + 1)
  const cdf = new Float64Array(DISTRIBUTION_INTERVALS + 1)
  const step = 2 * SCREEN_HALF_WIDTH / DISTRIBUTION_INTERVALS
  let previous = interferenceDensity(-SCREEN_HALF_WIDTH, wavelengthNm, slitDistanceMm, twoSlits, whichPath, markerAngle)
  positions[0] = -SCREEN_HALF_WIDTH
  for (let i = 1; i <= DISTRIBUTION_INTERVALS; i += 1) {
    const position = -SCREEN_HALF_WIDTH + i * step
    const density = interferenceDensity(position, wavelengthNm, slitDistanceMm, twoSlits, whichPath, markerAngle)
    positions[i] = position
    cdf[i] = cdf[i - 1] + (previous + density) * step / 2
    previous = density
  }
  const integral = cdf[DISTRIBUTION_INTERVALS]
  positiveFinite(integral, 'Probability integral')
  for (let i = 1; i <= DISTRIBUTION_INTERVALS; i += 1) cdf[i] /= integral
  cdf[DISTRIBUTION_INTERVALS] = 1
  return { positions, cdf }
}

/** Inverts the detector CDF. u is a supplied uniform variate in [0, 1]. */
export function sampleDetection({ positions, cdf }: DetectionDistribution, u: number) {
  if (!Number.isFinite(u) || u < 0 || u > 1) throw new RangeError('u must be in [0, 1]')
  const last = cdf.length - 1
  if (last < 1 || positions.length !== cdf.length || cdf[0] !== 0 || cdf[last] !== 1) {
    throw new RangeError('A normalized detector distribution is required')
  }
  if (u === 0) return positions[0]
  if (u === 1) return positions[last]
  let low = 0
  let high = last
  while (high - low > 1) {
    const middle = (low + high) >>> 1
    if (cdf[middle] < u) low = middle
    else high = middle
  }
  const fraction = (u - cdf[low]) / (cdf[high] - cdf[low])
  return positions[low] + fraction * (positions[high] - positions[low])
}

export function properTimeRatio(beta: number) {
  if (!Number.isFinite(beta) || Math.abs(beta) >= 1) {
    throw new RangeError('beta must be finite with |beta| < 1')
  }
  return Math.sqrt((1 - beta) * (1 + beta))
}

export function lorentzFactor(beta: number) {
  return 1 / properTimeRatio(beta)
}

/**
 * A transverse light clock in one inertial ground frame, starting at the lower mirror.
 * c is a display-unit speed. A tick requires a complete return to the lower mirror.
 * https://www.einstein-online.info/en/spotlight/light-clocks-time-dilation/
 */
export function lightClockState(groundTime: number, beta: number, height = 1, c = 1) {
  if (!Number.isFinite(groundTime) || groundTime < 0) {
    throw new RangeError('groundTime must be finite and nonnegative')
  }
  positiveFinite(height, 'height')
  positiveFinite(c, 'c')
  const properTime = groundTime * properTimeRatio(beta)
  const cycles = properTime * c / (2 * height)
  // Snap only floating-point roundoff at a completed cycle, avoiding a missed tick.
  const nearest = Math.round(cycles)
  const settledCycles = Math.abs(cycles - nearest) <= 4 * Number.EPSILON * Math.max(1, cycles)
    ? nearest
    : cycles
  const ticks = Math.floor(settledCycles)
  const phase = settledCycles - ticks
  return {
    x: beta * c * groundTime,
    y: height * (phase <= 0.5 ? 2 * phase : 2 * (1 - phase)),
    properTime,
    ticks,
    phase,
  }
}

/**
 * The same two physical clocks compared on a simultaneous slice of the chosen frame.
 * Their lower mirrors start at x = 0, t = 0 (they may be separated along z in the scene).
 * The observer's own clock is at rest; the other moves at signed relative velocity.
 * Each properTime belongs to its physical identity, and both emitted light paths obey c.
 * The caller can preserve a ship event on a frame switch with clockFrameTime.
 * Following a camera alone is not this change of simultaneity. These are coordinate measurements, not light-delay camera images.
 * https://www.einstein-online.info/en/spotlight/dialectic/
 */
export function lightClockComparison(
  frameTime: number,
  beta: number,
  observer: ClockObserver = 'ground',
  height = 1,
  c = 1,
) {
  if (observer !== 'ground' && observer !== 'moving') {
    throw new RangeError('observer must be ground or moving')
  }
  properTimeRatio(beta)
  const groundBeta = observer === 'moving' && beta !== 0 ? -beta : 0
  const movingBeta = observer === 'ground' ? beta : 0
  return {
    observer,
    frameTime,
    ground: { ...lightClockState(frameTime, groundBeta, height, c), relativeBeta: groundBeta },
    moving: { ...lightClockState(frameTime, movingBeta, height, c), relativeBeta: movingBeta },
  }
}

/** Coordinate time of a slice anchored at a fixed event on the ship clock. */
export function clockFrameTime(shipProperTime: number, beta: number, observer: ClockObserver) {
  nonnegativeFinite(shipProperTime, 'shipProperTime')
  const ratio = properTimeRatio(beta)
  if (observer !== 'ground' && observer !== 'moving') throw new RangeError('Invalid observer')
  return observer === 'ground' ? shipProperTime / ratio : shipProperTime
}

/**
 * Events in fixed ground coordinates (x/c, t), c = 1. Both clocks meet at (0, 0).
 * Hold the ship event fixed: ground simultaneity is horizontal; ship simultaneity
 * obeys t - beta*x = constant. A frame switch changes the selected ground event,
 * not either worldline or a clock's history. No optical signal delay is included.
 * https://www.einstein-online.info/en/spotlight/dialectic/
 */
export function simultaneousClockEvents(shipProperTime: number, beta: number, observer: ClockObserver) {
  const groundTime = clockFrameTime(shipProperTime, beta, 'ground')
  const frameTime = clockFrameTime(shipProperTime, beta, observer)
  const ratio = properTimeRatio(beta)
  return {
    frameTime,
    ship: { x: beta * groundTime, t: groundTime, properTime: shipProperTime },
    ground: { x: 0, t: observer === 'ground' ? groundTime : frameTime * ratio },
    slope: observer === 'ground' ? 0 : beta,
  }
}
