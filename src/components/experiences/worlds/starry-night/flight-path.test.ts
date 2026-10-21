import { describe, expect, it } from 'vitest'
import { FLIGHT, FLIGHT_BRIDGE_TIME, FLIGHT_DURATION, sampleFlight } from './flight-path'

describe('the flight through the painted village', () => {
  it('keeps the camera inside the real middle bridge opening', () => {
    for (let sec = FLIGHT_BRIDGE_TIME - .4; sec <= FLIGHT_BRIDGE_TIME + .4; sec += .02) {
      const { p: [x, y, z] } = sampleFlight(sec)
      if (Math.abs(z + 12) > 2.2) continue
      const centreX = 26 + 6 * Math.sin(-12 * .022) + 3 * Math.sin(-12 * .05)
      expect(Math.hypot(x - centreX, y - .15)).toBeLessThan(2.3)
      expect(y).toBeGreaterThan(-1.2)
    }
  })

  it('does not jolt at changes of shot duration', () => {
    for (const { sec } of FLIGHT.slice(1, -1)) {
      const a = sampleFlight(sec - .001).p, b = sampleFlight(sec).p, c = sampleFlight(sec + .001).p
      for (let axis = 0; axis < 3; axis++) {
        expect(Math.abs((c[axis] - b[axis]) / .001 - (b[axis] - a[axis]) / .001)).toBeLessThan(.08)
      }
    }
  })

  it('starts and ends at rest and clamps the timeline', () => {
    expect(sampleFlight(-20).p).toEqual(FLIGHT[0].p)
    expect(sampleFlight(1000).p).toEqual(FLIGHT.at(-1)!.p)
    expect(sampleFlight(NaN).p).toEqual(FLIGHT[0].p)
    expect(sampleFlight(FLIGHT_DURATION).speed).toBeLessThan(.2)
  })

  it('flies forward along the river, staying clear of the rejected steeple detour', () => {
    for (let sec = 7.5; sec <= 10.6; sec += .02) {
      const { p, t } = sampleFlight(sec)
      const ahead = sampleFlight(sec + .01).p
      const travel = ahead.map((v, i) => v - p[i])
      const gaze = t.map((v, i) => v - p[i])
      const alignment = travel.reduce((sum, v, i) => sum + v * gaze[i], 0)
        / (Math.hypot(...travel) * Math.hypot(...gaze))
      expect(alignment).toBeGreaterThan(.85)
      if (p[1] < 30) expect(Math.hypot(p[0] + 1.5, p[2] + 19.5)).toBeGreaterThan(18)
    }
  })

  it('does not whip the gaze sideways or upward on leaving the bridge', () => {
    const direction = (sec: number) => {
      const { p, t } = sampleFlight(sec)
      const d = t.map((v, i) => v - p[i]), length = Math.hypot(...d)
      return d.map(v => v / length)
    }
    for (let sec = 7.5; sec <= 10.6; sec += .01) {
      const a = direction(sec), b = direction(sec + .01)
      const dot = Math.min(1, a.reduce((sum, v, i) => sum + v * b[i], 0))
      const degreesPerSecond = Math.acos(dot) * 180 / Math.PI / .01
      expect(degreesPerSecond).toBeLessThan(30)
    }
  })

  it('keeps banking gentle and removes it for reduced motion', () => {
    for (let sec = 0; sec <= FLIGHT_DURATION; sec += .1) {
      const pose = sampleFlight(sec)
      expect([...pose.p, ...pose.t, pose.bank, pose.fov].every(Number.isFinite)).toBe(true)
      expect(Math.abs(pose.bank)).toBeLessThanOrEqual(.13)
      expect(sampleFlight(sec, true).bank).toBe(0)
      expect(sampleFlight(sec, true).fov).toBe(62)
    }
  })
})
