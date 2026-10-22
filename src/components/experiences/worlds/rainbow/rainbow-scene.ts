/**
 * The stage on which the rainbow world happens: one observer standing on flat
 * ground, the sun low behind them, and a curtain of rain some tens of metres
 * ahead. Everything here is plain geometry — where the antisolar direction
 * points, which drops sit at the rainbow angle, where the observer's shadow
 * falls, and a camera that can swing continuously from a side view of the whole
 * arrangement to the observer's own eyes.
 *
 * The optics of a single drop live in `rainbow-optics.ts`. This module never
 * decides how bright a drop is; it only answers "how far is this drop from the
 * antisolar direction, as seen from the eye", and the optics profile turns that
 * angle into a colour.
 */

export type Vec3 = [number, number, number]

const DEG = Math.PI / 180

export const EYE_HEIGHT_M = 1.65
/** Distance from the observer's starting point to the rain curtain. */
export const CURTAIN_X_M = 60
/** Half-thickness of the rain slab, so it reads as a volume rather than a sheet. */
export const CURTAIN_DEPTH_M = 3
export const CURTAIN_TOP_M = 100
export const CURTAIN_HALF_WIDTH_M = 110

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

export function scale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s]
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

export function length(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2])
}

export function normalize(a: Vec3): Vec3 {
  const l = length(a) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high)
}

export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

/**
 * Direction sunlight travels: the sun is behind the observer (at −x) and
 * `sunElevationDeg` above the horizon, so its light heads towards +x and
 * downwards. Looking along this direction from the eye is looking at the
 * antisolar point, which is why it sits exactly as far below the horizon as
 * the sun stands above it.
 */
export function sunlightDirection(sunElevationDeg: number): Vec3 {
  const h = sunElevationDeg * DEG
  return [Math.cos(h), -Math.sin(h), 0]
}

/** Angle, in degrees, between the line eye→point and the antisolar direction. */
export function angleFromAntisolarDeg(point: Vec3, eye: Vec3, sunElevationDeg: number): number {
  const toPoint = normalize(sub(point, eye))
  const cosine = clamp(dot(toPoint, sunlightDirection(sunElevationDeg)), -1, 1)
  return Math.acos(cosine) / DEG
}

/**
 * A direction on the rainbow cone: `bowDeg` away from the antisolar direction,
 * at azimuth `phiDeg` around it. Zero azimuth is the top of the bow.
 */
export function coneDirection(sunElevationDeg: number, bowDeg: number, phiDeg: number): Vec3 {
  const h = sunElevationDeg * DEG
  const axis = sunlightDirection(sunElevationDeg)
  // Perpendicular to the axis inside the vertical plane, pointing "up the bow".
  const up: Vec3 = [Math.sin(h), Math.cos(h), 0]
  const side: Vec3 = [0, 0, 1]
  const b = bowDeg * DEG
  const phi = phiDeg * DEG
  return normalize(add(
    scale(axis, Math.cos(b)),
    add(scale(up, Math.sin(b) * Math.cos(phi)), scale(side, Math.sin(b) * Math.sin(phi))),
  ))
}

/**
 * Where a ray from the eye in `direction` meets the vertical plane x = planeX.
 * Returns null when the ray runs parallel to or away from the plane.
 */
export function intersectCurtain(eye: Vec3, direction: Vec3, planeX: number): Vec3 | null {
  if (direction[0] <= 1e-6) return null
  const t = (planeX - eye[0]) / direction[0]
  if (t <= 0) return null
  return add(eye, scale(direction, t))
}

/** A point on the rainbow ring drawn on the curtain plane, or null if it never gets there. */
export function bowPointOnCurtain(
  eye: Vec3,
  sunElevationDeg: number,
  bowDeg: number,
  phiDeg: number,
  planeX = CURTAIN_X_M,
): Vec3 | null {
  return intersectCurtain(eye, coneDirection(sunElevationDeg, bowDeg, phiDeg), planeX)
}

/** Elevation of the top of a bow above the horizon, as seen by the observer. */
export function bowTopElevationDeg(sunElevationDeg: number, bowDeg: number): number {
  return bowDeg - sunElevationDeg
}

/**
 * Where the shadow of the observer's head lands on the ground. It lies exactly
 * along the antisolar direction, which is why "the direction of your head's
 * shadow" and "the centre of the rainbow" are the same thing. With the sun on
 * the horizon the shadow runs off to infinity; it is clamped for drawing.
 */
export function headShadowPoint(eye: Vec3, sunElevationDeg: number, maxDistanceM = 600): Vec3 {
  const h = Math.max(sunElevationDeg, 0.05) * DEG
  const reach = Math.min(eye[1] / Math.tan(h), maxDistanceM)
  return [eye[0] + reach, 0, eye[2]]
}

/** Antisolar point projected onto the curtain plane (usually underground). */
export function antisolarOnCurtain(eye: Vec3, sunElevationDeg: number, planeX = CURTAIN_X_M): Vec3 {
  const d = sunlightDirection(sunElevationDeg)
  const t = (planeX - eye[0]) / d[0]
  return add(eye, scale(d, t))
}

export type CameraSetup = {
  eye: Vec3
  /** 0 = side view of the whole arrangement, 1 = looking out of the observer's eyes. */
  orbit: number
  sunElevationDeg: number
  width: number
  height: number
}

export type Camera = {
  position: Vec3
  forward: Vec3
  right: Vec3
  up: Vec3
  /** Focal length in pixels: screen offset = focal · (lateral / depth). */
  focal: number
  width: number
  height: number
  /** Screen position and depth of a world point, or null if behind the camera. */
  project: (point: Vec3) => [number, number, number] | null
  /** Unit world direction of the ray through a screen pixel. */
  ray: (sx: number, sy: number) => Vec3
}

/** Horizontal field of view chosen so both the side view and the eye view fit. */
export function fieldOfViewDeg(orbit: number, width: number, height: number): number {
  const portrait = height > width
  // Desktop includes both complete arcs above the horizon. Portrait keeps
  // the two crowns large enough to compare without shrinking the scene.
  const eyeView = portrait ? 86 : 114
  const sideView = portrait ? 54 : 60
  return lerp(sideView, eyeView, smoothstep(0, 1, orbit))
}

/**
 * Camera swinging from beside the scene to the observer's own eyes.
 *
 * At orbit 0 the camera stands far off to the side, so the observer, their
 * shadow, the sunbeams and the rain curtain all appear in one profile. As orbit
 * rises the camera slides round behind the observer while closing in, and at
 * orbit 1 it sits exactly at the eye: only then does what it sees equal the
 * rainbow the observer sees.
 */
export function buildCamera({ eye, orbit, sunElevationDeg, width, height }: CameraSetup): Camera {
  const u = clamp(orbit, 0, 1)
  const eased = smoothstep(0, 1, u)
  const yaw = lerp(90, 0, eased) * DEG
  const pitch = lerp(9, 0, eased) * DEG
  const distance = 96 * Math.pow(1 - u, 1.45)
  const offset: Vec3 = [
    -Math.cos(yaw) * Math.cos(pitch) * distance,
    Math.sin(pitch) * distance,
    Math.sin(yaw) * Math.cos(pitch) * distance,
  ]
  const position = add(eye, offset)

  const bowTop = bowTopElevationDeg(sunElevationDeg, 42)
  const portrait = height > width
  const eyeLookElevation = (portrait
    ? -5
    : clamp(bowTop * 0.5 - 2, 4, 22)) * DEG
  // A phone is narrow: aim the side view nearer the observer so they stay in frame.
  const sideTarget: Vec3 = [eye[0] + (portrait ? 19 : 27), portrait ? 12 : 15, eye[2]]
  const eyeTarget: Vec3 = add(eye, [60, 60 * Math.tan(eyeLookElevation), 0])
  const target: Vec3 = [
    lerp(sideTarget[0], eyeTarget[0], eased),
    lerp(sideTarget[1], eyeTarget[1], eased),
    lerp(sideTarget[2], eyeTarget[2], eased),
  ]

  const forward = normalize(sub(target, position))
  const right = normalize(cross(forward, [0, 1, 0]))
  const up = cross(right, forward)
  const fov = fieldOfViewDeg(u, width, height) * DEG
  const focal = (width * 0.5) / Math.tan(fov / 2)

  const project = (point: Vec3): [number, number, number] | null => {
    const rel = sub(point, position)
    const depth = dot(rel, forward)
    if (depth <= 0.05) return null
    const x = dot(rel, right)
    const y = dot(rel, up)
    return [width * 0.5 + (x / depth) * focal, height * 0.5 - (y / depth) * focal, depth]
  }

  const ray = (sx: number, sy: number): Vec3 => {
    const x = (sx - width * 0.5) / focal
    const y = (height * 0.5 - sy) / focal
    return normalize(add(forward, add(scale(right, x), scale(up, y))))
  }

  return { position, forward, right, up, focal, width, height, project, ray }
}

export type RainDrops = {
  count: number
  x: Float32Array
  y: Float32Array
  z: Float32Array
  speed: Float32Array
  /** Per-drop size jitter, around 1. */
  size: Float32Array
}

/**
 * A fixed population of drops filling the curtain. Nothing about them knows
 * where the observer stands: the rainbow is whichever of them happen to sit at
 * the right angle this instant, and when the observer walks, a different set
 * takes over.
 */
export function makeRainDrops(count: number, seed = 0x2545f491): RainDrops {
  let state = seed >>> 0
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
  const drops: RainDrops = {
    count,
    x: new Float32Array(count),
    y: new Float32Array(count),
    z: new Float32Array(count),
    speed: new Float32Array(count),
    size: new Float32Array(count),
  }
  for (let i = 0; i < count; i += 1) {
    drops.x[i] = CURTAIN_X_M + (random() * 2 - 1) * CURTAIN_DEPTH_M
    drops.y[i] = random() * CURTAIN_TOP_M
    drops.z[i] = (random() * 2 - 1) * CURTAIN_HALF_WIDTH_M
    drops.speed[i] = 5.5 + random() * 3.5
    drops.size[i] = 0.7 + random() * 0.7
  }
  return drops
}

/** Let the rain fall by `dt` seconds, wrapping drops that reach the ground. */
export function advanceRain(drops: RainDrops, dt: number) {
  for (let i = 0; i < drops.count; i += 1) {
    let y = drops.y[i] - drops.speed[i] * dt
    if (y < 0) y += CURTAIN_TOP_M
    drops.y[i] = y
  }
}
