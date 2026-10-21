/**
 * Geometric optics of a single spherical water drop, and the angular colour
 * profile a whole curtain of such drops sends back to one observer.
 *
 * Everything the rainbow world draws — the ray fan inside the magnified drop,
 * the brightness curve beside it, and the arc painted across the sky — comes
 * out of the functions here. The two views are therefore never allowed to
 * disagree: the sky is literally painted with the profile the drop produced.
 *
 * The model is classical ray optics: Snell's law with real dispersion for
 * water, Fresnel throughput at every interface, and the geometric weighting of
 * an incoming parallel beam. It is not Airy or Mie theory, so the finite-drop
 * effects (bow width, the wash-out into a white fogbow) enter as a documented
 * approximation rather than a first-principles calculation. See
 * `angularBlurDeg` for exactly what is approximated.
 */

/** The sun is not a point: its disc is about 0.53° across, seen from Earth. */
export const SUN_ANGULAR_DIAMETER_DEG = 0.533

/** Visible band sampled when integrating a spectrum into a colour. */
export const SHORTEST_VISIBLE_NM = 400
export const LONGEST_VISIBLE_NM = 700

/**
 * Cauchy-type dispersion fit for pure water near 20 °C, wavelength in nm.
 * Reproduces n = 1.3325 at the sodium D line, 1.3437 at 400 nm and 1.3297 at
 * 700 nm, which is what fixes the primary bow at 40.6°…42.4°.
 */
export function waterRefractiveIndex(wavelengthNm: number): number {
  const l = wavelengthNm
  return 1.31279 + 15.762 / l - 4382 / (l * l) + 1.1455e6 / (l * l * l)
}

/**
 * Unpolarized Fresnel reflectance at an air/water interface. Reciprocity makes
 * this the same number whether the ray is entering at `incidence` or striking
 * the inside of the wall at `refraction`, which is why one call covers every
 * bounce in the drop.
 */
export function unpolarizedReflectance(
  incidence: number,
  refraction: number,
  index: number,
): number {
  const cosI = Math.cos(incidence)
  const cosT = Math.cos(refraction)
  const s = (cosI - index * cosT) / (cosI + index * cosT)
  const p = (cosT - index * cosI) / (cosT + index * cosI)
  return (s * s + p * p) / 2
}

/**
 * Where the ray ends up, measured as an angle away from the antisolar point —
 * the direction pointing straight away from the sun, which for an observer with
 * the sun behind them is the shadow of their own head.
 *
 * A ray is deviated by `2(i − r)` at the two refractions plus `π − 2r` at every
 * internal reflection. Light that comes straight back at the sun has deviation
 * π and is seen at 0° from the antisolar point, so the observable angle is the
 * deviation folded around π.
 */
export function scatterAngleRad(
  incidence: number,
  refraction: number,
  reflections: number,
): number {
  const deviation = 2 * (incidence - refraction) + reflections * (Math.PI - 2 * refraction)
  let folded = (deviation - Math.PI) % (2 * Math.PI)
  if (folded > Math.PI) folded -= 2 * Math.PI
  if (folded < -Math.PI) folded += 2 * Math.PI
  return Math.abs(folded)
}

/**
 * The stationary point of the deviation — the rainbow angle itself.
 *
 * Setting dD/di = 0 gives cos²i = (n² − 1) / (k² + 2k). Rays crowd together
 * there, which is the whole reason a bow exists: it is a caustic, an angle no
 * ray can get past and many rays land on.
 */
export function rainbowAngleDeg(index: number, reflections: number): number {
  const k = reflections
  const cosSquared = (index * index - 1) / (k * k + 2 * k)
  const incidence = Math.acos(Math.sqrt(cosSquared))
  const refraction = Math.asin(Math.sin(incidence) / index)
  return (scatterAngleRad(incidence, refraction, k) * 180) / Math.PI
}

export type DropRay = {
  /** Impact parameter as a fraction of the drop radius, 0 at the axis. */
  impact: number
  incidence: number
  refraction: number
  /** Total turn away from the original direction of travel, in radians. */
  deviationRad: number
  /** Angle from the antisolar point, in degrees. */
  scatterDeg: number
  /** Fraction of the incident energy that survives the whole path. */
  throughput: number
  /**
   * Hit points on the unit circle, entry first and exit last, ready to stroke
   * as the ray's path through a drop drawn at radius 1 centred on the origin.
   */
  path: Array<[number, number]>
}

/**
 * Trace one ray through a drop of unit radius for `reflections` internal
 * bounces. Rays arrive travelling in +x at height `impact`; every internal
 * chord turns the ray through the same angle, so the hit points are evenly
 * spaced around the circle.
 */
export function traceDropRay(impact: number, index: number, reflections: number): DropRay {
  const clamped = Math.min(Math.max(impact, -0.999999), 0.999999)
  const incidence = Math.asin(Math.abs(clamped))
  const refraction = Math.asin(Math.abs(clamped) / index)
  const reflectance = unpolarizedReflectance(incidence, refraction, index)
  const transmitted = 1 - reflectance
  const throughput = transmitted * transmitted * Math.pow(reflectance, reflections)

  const deviation = 2 * (incidence - refraction) + reflections * (Math.PI - 2 * refraction)
  // Rays entering above the axis bend downwards, so they walk clockwise around
  // the drop. Below the axis everything mirrors.
  const sense = clamped >= 0 ? -1 : 1
  const entryAngle = Math.atan2(clamped, -Math.sqrt(1 - clamped * clamped))
  const chord = Math.PI - 2 * refraction
  const path: Array<[number, number]> = []
  for (let hit = 0; hit <= reflections + 1; hit += 1) {
    const angle = entryAngle + sense * hit * chord
    path.push([Math.cos(angle), Math.sin(angle)])
  }

  return {
    impact: clamped,
    incidence,
    refraction,
    deviationRad: deviation,
    scatterDeg: (scatterAngleRad(incidence, refraction, reflections) * 180) / Math.PI,
    throughput,
    path,
  }
}

/** Unit direction the ray leaves along, in the same frame as `traceDropRay`. */
export function exitDirection(ray: DropRay): [number, number] {
  const sense = ray.impact >= 0 ? -1 : 1
  return [Math.cos(ray.deviationRad), sense * Math.sin(ray.deviationRad)]
}

/**
 * Piecewise-Gaussian fits to the CIE 1931 colour matching functions
 * (Wyman, Sloan & Shirley 2013). Accurate enough that an integrated spectrum
 * lands on believable sRGB instead of a decorative hue ramp.
 */
function lobe(x: number, mean: number, sigmaLow: number, sigmaHigh: number): number {
  const t = (x - mean) * (x < mean ? 1 / sigmaLow : 1 / sigmaHigh)
  return Math.exp(-0.5 * t * t)
}

export function cieMatch(wavelengthNm: number): [number, number, number] {
  const l = wavelengthNm
  return [
    1.056 * lobe(l, 599.8, 37.9, 31.0)
      + 0.362 * lobe(l, 442.0, 16.0, 26.7)
      - 0.065 * lobe(l, 501.1, 20.4, 26.2),
    0.821 * lobe(l, 568.8, 46.9, 40.5) + 0.286 * lobe(l, 530.9, 16.3, 31.1),
    1.217 * lobe(l, 437.0, 11.8, 36.0) + 0.681 * lobe(l, 459.0, 26.0, 13.8),
  ]
}

/** CIE XYZ to linear sRGB primaries, before any gamma encoding. */
export function xyzToLinearRgb(x: number, y: number, z: number): [number, number, number] {
  return [
    3.2406 * x - 1.5372 * y - 0.4986 * z,
    -0.9689 * x + 1.8758 * y + 0.0415 * z,
    0.0557 * x - 0.204 * y + 1.057 * z,
  ]
}

/** A single wavelength as a screen colour, normalised to its own brightest channel. */
export function wavelengthToRgb(wavelengthNm: number): [number, number, number] {
  const [x, y, z] = cieMatch(wavelengthNm)
  const linear = xyzToLinearRgb(x, y, z)
  const peak = Math.max(...linear, 1e-6)
  return linear.map((channel) => {
    const normalised = Math.max(channel / peak, 0)
    return Math.round(255 * (normalised <= 0.0031308
      ? 12.92 * normalised
      : 1.055 * Math.pow(normalised, 1 / 2.4) - 0.055))
  }) as [number, number, number]
}

/**
 * How badly a real drop smears its own caustic.
 *
 * Two effects dominate and both are honest to include: the sun is a 0.53° disc
 * rather than a point, and a drop only a few wavelengths across diffracts the
 * caustic into a broad Airy pattern. Full Airy theory would give the fringe
 * structure; this keeps only its leading scale, width ∝ (λ/a)^(2/3), fitted so
 * a 10 µm fog droplet lands near the 3–4° smear that turns a fogbow white and
 * a 1 mm raindrop stays well inside the solar disc.
 *
 * Nothing shifts the caustic by hand. The inward drift of a real fogbow's
 * maximum falls out on its own, because there is light inside the bow and none
 * outside it, so a symmetric smear of an asymmetric edge moves the peak
 * inwards — which lands a 10 µm droplet bow near the observed 39°.
 */
export function angularBlurDeg(dropRadiusMm: number, wavelengthNm: number): number {
  const sun = SUN_ANGULAR_DIAMETER_DEG / 2.355
  const ratio = (wavelengthNm * 1e-6) / Math.max(dropRadiusMm, 1e-4)
  return Math.hypot(sun, 24.2 * Math.pow(ratio, 2 / 3))
}

export type RainbowProfile = {
  /** Angle from the antisolar point covered by bin 0. */
  startDeg: number
  stepDeg: number
  /** Linear-light sRGB radiance per bin, peak-normalised to 1. */
  red: Float32Array
  green: Float32Array
  blue: Float32Array
  /**
   * The same radiance smoothed over several degrees. Subtracting it separates
   * the broad backscatter glow from the narrow bows — see `sampleGraded`.
   */
  baseRed: Float32Array
  baseGreen: Float32Array
  baseBlue: Float32Array
  /** Relative luminance per bin, peak-normalised to 1. */
  luminance: Float32Array
  /** Where each order's caustic sits for mid-spectrum light. */
  primaryDeg: number
  secondaryDeg: number
}

/** Angular scale that counts as "broad" when splitting glow from bows. */
const BASELINE_SIGMA_DEG = 5.5

function smoothOver(source: Float32Array, stepDeg: number): Float32Array {
  const sigma = BASELINE_SIGMA_DEG / stepDeg
  const radius = Math.min(Math.ceil(3 * sigma), source.length - 1)
  const kernel = new Float64Array(radius * 2 + 1)
  let norm = 0
  for (let offset = -radius; offset <= radius; offset += 1) {
    const weight = Math.exp(-(offset * offset) / (2 * sigma * sigma))
    kernel[offset + radius] = weight
    norm += weight
  }
  const out = new Float32Array(source.length)
  for (let bin = 0; bin < source.length; bin += 1) {
    let total = 0
    let used = 0
    for (let offset = -radius; offset <= radius; offset += 1) {
      const index = bin + offset
      if (index < 0 || index >= source.length) continue
      total += source[index] * kernel[offset + radius]
      used += kernel[offset + radius]
    }
    out[bin] = total / (used || norm)
  }
  return out
}

export type ProfileOptions = {
  dropRadiusMm: number
  /** Internal-reflection orders to include; 1 is the everyday bow. */
  orders: Array<number>
  bins?: number
  /** Impact parameters traced per wavelength. */
  samples?: number
  /** Wavelength slices across the visible band. */
  slices?: number
}

const MAX_DEG = 90

/**
 * Integrate the drop over its whole face and over the visible spectrum to get
 * the colour it returns at each angle from the antisolar point.
 *
 * The caustic is not inserted anywhere: it appears because dθ/db vanishes at
 * the rainbow angle, so a wide band of impact parameters piles into a couple of
 * bins. For the same reason the region outside the primary bow comes out empty
 * while the region inside stays lit — that step in brightness, and the dark gap
 * before the secondary bow, are predictions of this loop rather than paint.
 */
export function buildRainbowProfile(options: ProfileOptions): RainbowProfile {
  const bins = options.bins ?? 900
  const samples = options.samples ?? 2600
  const slices = options.slices ?? 28
  const stepDeg = MAX_DEG / bins

  const x = new Float64Array(bins)
  const y = new Float64Array(bins)
  const z = new Float64Array(bins)
  const scratch = new Float64Array(bins)
  const smeared = new Float64Array(bins)

  const sliceWidth = (LONGEST_VISIBLE_NM - SHORTEST_VISIBLE_NM) / slices
  for (let slice = 0; slice < slices; slice += 1) {
    const wavelength = SHORTEST_VISIBLE_NM + (slice + 0.5) * sliceWidth
    const index = waterRefractiveIndex(wavelength)
    const sigmaDeg = angularBlurDeg(options.dropRadiusMm, wavelength)

    scratch.fill(0)
    for (const order of options.orders) {
      for (let sample = 0; sample < samples; sample += 1) {
        // Impact parameter sampled across the drop's face. The b·db weight is
        // the area of the annulus of the incoming beam that this sample stands
        // for, so wide outer rings correctly count for more light.
        const impact = (sample + 0.5) / samples
        const incidence = Math.asin(impact)
        const refraction = Math.asin(impact / index)
        const reflectance = unpolarizedReflectance(incidence, refraction, index)
        const transmitted = 1 - reflectance
        const energy = transmitted * transmitted * Math.pow(reflectance, order) * impact
        const angle = (scatterAngleRad(incidence, refraction, order) * 180) / Math.PI
        const bin = Math.floor(angle / stepDeg)
        if (bin >= 0 && bin < bins) scratch[bin] += energy
      }
    }

    // Light leaving at angle θ spreads over a ring of solid angle ∝ sin θ, so
    // the same energy is more concentrated near the antisolar point.
    for (let bin = 0; bin < bins; bin += 1) {
      const centre = ((bin + 0.5) * stepDeg * Math.PI) / 180
      scratch[bin] /= Math.max(Math.sin(centre), 0.02)
    }

    // Smear with the drop's own angular resolution. Wavelengths are blurred
    // separately because small drops blur the red and the violet by different
    // amounts, and that overlap is exactly what drains the colour out of a
    // fogbow.
    const radius = Math.min(Math.ceil((3 * sigmaDeg) / stepDeg), bins - 1)
    if (radius <= 0) {
      smeared.set(scratch)
    } else {
      const denominator = 2 * (sigmaDeg / stepDeg) * (sigmaDeg / stepDeg)
      let norm = 0
      const kernel = new Float64Array(radius * 2 + 1)
      for (let offset = -radius; offset <= radius; offset += 1) {
        const weight = Math.exp(-(offset * offset) / denominator)
        kernel[offset + radius] = weight
        norm += weight
      }
      for (let bin = 0; bin < bins; bin += 1) {
        let total = 0
        for (let offset = -radius; offset <= radius; offset += 1) {
          const source = bin + offset
          if (source >= 0 && source < bins) total += scratch[source] * kernel[offset + radius]
        }
        smeared[bin] = total / norm
      }
    }

    const [cx, cy, cz] = cieMatch(wavelength)
    for (let bin = 0; bin < bins; bin += 1) {
      x[bin] += cx * smeared[bin] * sliceWidth
      y[bin] += cy * smeared[bin] * sliceWidth
      z[bin] += cz * smeared[bin] * sliceWidth
    }
  }

  const red = new Float32Array(bins)
  const green = new Float32Array(bins)
  const blue = new Float32Array(bins)
  const luminance = new Float32Array(bins)
  let peak = 1e-9
  for (let bin = 0; bin < bins; bin += 1) {
    const [r, g, b] = xyzToLinearRgb(x[bin], y[bin], z[bin])
    red[bin] = Math.max(r, 0)
    green[bin] = Math.max(g, 0)
    blue[bin] = Math.max(b, 0)
    luminance[bin] = y[bin]
    peak = Math.max(peak, red[bin], green[bin], blue[bin])
  }
  let luminancePeak = 1e-9
  for (let bin = 0; bin < bins; bin += 1) {
    red[bin] /= peak
    green[bin] /= peak
    blue[bin] /= peak
    luminancePeak = Math.max(luminancePeak, luminance[bin])
  }
  for (let bin = 0; bin < bins; bin += 1) luminance[bin] /= luminancePeak

  const midIndex = waterRefractiveIndex(550)
  return {
    startDeg: 0,
    stepDeg,
    red,
    green,
    blue,
    baseRed: smoothOver(red, stepDeg),
    baseGreen: smoothOver(green, stepDeg),
    baseBlue: smoothOver(blue, stepDeg),
    luminance,
    primaryDeg: rainbowAngleDeg(midIndex, 1),
    secondaryDeg: rainbowAngleDeg(midIndex, 2),
  }
}

/** Sample the profile at an arbitrary angle, with linear interpolation. */
export function sampleProfile(
  profile: RainbowProfile,
  degrees: number,
  out: [number, number, number],
): [number, number, number] {
  const position = degrees / profile.stepDeg - 0.5
  const low = Math.floor(position)
  const bins = profile.red.length
  if (low < -1 || low >= bins) {
    out[0] = 0
    out[1] = 0
    out[2] = 0
    return out
  }
  const blend = position - low
  const a = Math.min(Math.max(low, 0), bins - 1)
  const b = Math.min(Math.max(low + 1, 0), bins - 1)
  out[0] = profile.red[a] * (1 - blend) + profile.red[b] * blend
  out[1] = profile.green[a] * (1 - blend) + profile.green[b] * blend
  out[2] = profile.blue[a] * (1 - blend) + profile.blue[b] * blend
  return out
}

/**
 * The profile split into broad glow and narrow bow, then recombined with the
 * glow turned down.
 *
 * This is tone mapping, not a change to the optics. Geometric optics puts a
 * huge amount of light in the smooth backscatter inside the primary bow and
 * only a little in the secondary bow, so any single curve that stops the glow
 * washing out the sky also erases the secondary bow. Splitting by angular scale
 * keeps both: the eye picks out the bows because they are narrow and coloured,
 * not because they are the brightest thing in the sky, and this reproduces that.
 */
export function sampleGraded(
  profile: RainbowProfile,
  degrees: number,
  out: [number, number, number],
  glowGain: number,
): [number, number, number] {
  const position = degrees / profile.stepDeg - 0.5
  const low = Math.floor(position)
  const bins = profile.red.length
  if (low < -1 || low >= bins) {
    out[0] = 0
    out[1] = 0
    out[2] = 0
    return out
  }
  const blend = position - low
  const a = Math.min(Math.max(low, 0), bins - 1)
  const b = Math.min(Math.max(low + 1, 0), bins - 1)
  const mix = (values: Float32Array) => values[a] * (1 - blend) + values[b] * blend

  const channels: Array<[Float32Array, Float32Array]> = [
    [profile.red, profile.baseRed],
    [profile.green, profile.baseGreen],
    [profile.blue, profile.baseBlue],
  ]
  for (let channel = 0; channel < 3; channel += 1) {
    const [values, baseline] = channels[channel]
    const glow = mix(baseline)
    out[channel] = glow * glowGain + Math.max(mix(values) - glow, 0)
  }
  return out
}

/**
 * Elevation of the antisolar point, in degrees. It sits exactly as far below
 * the horizon as the sun stands above it, which is the whole reason a high sun
 * pushes the bow out of sight.
 */
export function antisolarElevationDeg(sunElevationDeg: number): number {
  return -sunElevationDeg
}

/**
 * How much of the primary bow can still clear the horizon for a given sun
 * height: 1 when the sun is on the horizon and the full semicircle shows,
 * 0 once the sun climbs past the bow's own radius.
 */
export function visibleArcFraction(sunElevationDeg: number, bowRadiusDeg: number): number {
  if (sunElevationDeg <= 0) return 1
  if (sunElevationDeg >= bowRadiusDeg) return 0
  return Math.acos(sunElevationDeg / bowRadiusDeg) / (Math.PI / 2)
}

/**
 * Azimuth of one primary-bow foot on the horizon, measured from the antisolar
 * azimuth. Zero when the whole cone sits below the ground.
 */
export function rainbowFootAzimuthDeg(sunElevationDeg: number, bowRadiusDeg: number): number {
  const cosAz = Math.cos((bowRadiusDeg * Math.PI) / 180)
    / Math.max(Math.cos((sunElevationDeg * Math.PI) / 180), 1e-6)
  if (cosAz >= 1) return 0
  if (cosAz <= -1) return 180
  return (Math.acos(cosAz) * 180) / Math.PI
}
