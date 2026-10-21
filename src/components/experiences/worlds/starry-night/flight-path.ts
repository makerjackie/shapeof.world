type Vec3 = [number, number, number]
type Keyframe = { sec: number; p: Vec3; t: Vec3 }

// Authored in the same imagined metres as the village. The low section follows
// the gaps between actual buildings and the middle opening of the stone bridge.
export const FLIGHT: Keyframe[] = [
  { sec: 0, p: [-23.5, 9.8, 26], t: [0, 12, -25] },
  { sec: 1, p: [-23, 9.3, 20], t: [-17, 5, 5] },
  { sec: 2.2, p: [-16, 4.6, 8], t: [-14.5, 3, -4] },
  { sec: 3, p: [-14.5, 3.1, 0], t: [-9, 3, -5] },
  { sec: 3.9, p: [-10, 3.1, -5], t: [4, 3, -6.5] },
  { sec: 4.8, p: [2, 3.1, -6.5], t: [19, 2.2, -5] },
  { sec: 5.9, p: [17, 2.8, -5], t: [23, 1, -12] },
  { sec: 6.9, p: [22.7, 1, -8], t: [23, 1.3, -23] },
  { sec: 7.5, p: [22.67, 1, -12], t: [23, 2, -30] },
  // Leave the arch along the river. The steeple stays far to the left;
  // the old waypoint turned toward it while simultaneously pitching upward.
  { sec: 8.2, p: [23, 2.2, -24], t: [23, 6, -48] },
  { sec: 9.3, p: [23, 7, -44], t: [19, 19, -72] },
  { sec: 10.6, p: [20, 20, -68], t: [8, 36, -102] },
  { sec: 12.4, p: [3, 40, -104], t: [-12, 53, -139] },
  { sec: 14.4, p: [-12, 57, -145], t: [-3, 64, -168] },
  { sec: 16.4, p: [10, 66, -162], t: [50, 65, -145] },
  { sec: 18.4, p: [56, 60, -108], t: [70, 39, -53] },
  { sec: 20.5, p: [65, 38, 2], t: [20, 17, 16] },
  { sec: 22, p: [52, 28, 40], t: [-5, 22, -60] },
  { sec: 24, p: [28, 24, 28], t: [-9, 35, -110] },
]

export const FLIGHT_DURATION = FLIGHT[FLIGHT.length - 1].sec
export const FLIGHT_CHAPTERS = [0, 2.2, 5.9, 8.2, 12.4, 20.5] as const
export const FLIGHT_BRIDGE_TIME = 7.5
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

// Time-aware cubic Hermite interpolation: unlike uniform Catmull-Rom with
// unequal shot lengths, velocity stays continuous at every authored waypoint.
function sampleVector(time: number, field: 'p' | 't'): Vec3 {
  const t = clamp(time, 0, FLIGHT_DURATION)
  let i = 0
  while (i < FLIGHT.length - 2 && t > FLIGHT[i + 1].sec) i++
  const b = FLIGHT[i], c = FLIGHT[i + 1]
  const a = FLIGHT[Math.max(0, i - 1)], d = FLIGHT[Math.min(FLIGHT.length - 1, i + 2)]
  const span = c.sec - b.sec, u = (t - b.sec) / span
  return b[field].map((v, axis) => {
    const m0 = i === 0 ? 0 : (c[field][axis] - a[field][axis]) / (c.sec - a.sec)
    const m1 = i + 1 === FLIGHT.length - 1 ? 0 : (d[field][axis] - b[field][axis]) / (d.sec - b.sec)
    return (2*u**3 - 3*u**2 + 1)*v + (u**3 - 2*u**2 + u)*span*m0
      + (-2*u**3 + 3*u**2)*c[field][axis] + (u**3 - u**2)*span*m1
  }) as Vec3
}

export function sampleFlight(seconds: number, reducedMotion = false, aspect = 16 / 9) {
  const time = clamp(Number.isFinite(seconds) ? seconds : 0, 0, FLIGHT_DURATION)
  const p = sampleVector(time, 'p'), t = sampleVector(time, 't')
  // The portrait finale needs a little more of the right-hand sky so the moon
  // stays in frame. Ease the gaze only; both formats fly the same continuous path.
  if (aspect < 1) {
    const u = clamp((time - 18) / 6, 0, 1), blend = u * u * (3 - 2 * u)
    t[0] += 32 * blend
    t[1] += 3 * blend
  }
  const before = sampleVector(Math.max(0, time - .01), 'p')
  const after = sampleVector(Math.min(FLIGHT_DURATION, time + .01), 'p')
  const speed = Math.hypot(...after.map((v, i) => v - before[i])) / .02
  const heading = (at: number) => {
    const eye = sampleVector(at, 'p'), target = sampleVector(at, 't')
    return Math.atan2(target[0] - eye[0], eye[2] - target[2])
  }
  const delta = heading(Math.min(FLIGHT_DURATION, time + .25)) - heading(Math.max(0, time - .25))
  const turn = Math.atan2(Math.sin(delta), Math.cos(delta))
  const bank = reducedMotion ? 0 : clamp(-turn * .35, -.13, .13)
  const fov = reducedMotion ? 62 : 62 + Math.min(8, speed * .6)
  const chapter = FLIGHT_CHAPTERS.reduce<number>((current, start, index) => time >= start ? index : current, 0)
  return { p, t, bank, fov, chapter, speed }
}
