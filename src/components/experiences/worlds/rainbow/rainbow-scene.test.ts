import { describe, expect, it } from 'vitest'

import {
  CURTAIN_X_M,
  EYE_HEIGHT_M,
  advanceRain,
  angleFromAntisolarDeg,
  antisolarOnCurtain,
  bowPointOnCurtain,
  bowTopElevationDeg,
  buildCamera,
  coneDirection,
  fieldOfViewDeg,
  headShadowPoint,
  makeRainDrops,
  sunlightDirection,
  type Vec3,
} from './rainbow-scene'

const eye: Vec3 = [0, EYE_HEIGHT_M, 0]

describe('antisolar geometry', () => {
  it('puts the antisolar point as far below the horizon as the sun is above it', () => {
    const d = sunlightDirection(12)
    expect(Math.asin(-d[1]) * 180 / Math.PI).toBeCloseTo(12, 9)
    expect(d[0]).toBeGreaterThan(0)
  })

  it('measures zero for a point straight along the antisolar direction', () => {
    const anti = antisolarOnCurtain(eye, 10)
    expect(anti[0]).toBeCloseTo(CURTAIN_X_M, 9)
    expect(anti[1]).toBeLessThan(0)
    expect(angleFromAntisolarDeg(anti, eye, 10)).toBeCloseTo(0, 6)
  })

  it('puts every cone direction exactly the bow angle away from the axis', () => {
    for (const phi of [0, 37, 90, 135, 180, 250, 300]) {
      const d = coneDirection(8, 42, phi)
      const point: Vec3 = [eye[0] + d[0] * 50, eye[1] + d[1] * 50, eye[2] + d[2] * 50]
      expect(angleFromAntisolarDeg(point, eye, 8)).toBeCloseTo(42, 6)
    }
  })

  it('lifts the top of the bow to 42° minus the sun elevation', () => {
    expect(bowTopElevationDeg(12, 42)).toBe(30)
    const top = bowPointOnCurtain(eye, 12, 42, 0)
    expect(top).not.toBeNull()
    const rise = top![1] - eye[1]
    expect(Math.atan2(rise, CURTAIN_X_M) * 180 / Math.PI).toBeCloseTo(30, 6)
  })

  it('drops the whole bow underground once the sun passes 42°', () => {
    const top = bowPointOnCurtain(eye, 45, 42, 0)
    expect(top).not.toBeNull()
    expect(top![1]).toBeLessThan(0)
  })

  it('aims the head shadow along the antisolar direction', () => {
    const shadow = headShadowPoint(eye, 20)
    expect(shadow[1]).toBe(0)
    expect(shadow[0]).toBeCloseTo(EYE_HEIGHT_M / Math.tan(20 * Math.PI / 180), 6)
    expect(angleFromAntisolarDeg(shadow, eye, 20)).toBeCloseTo(0, 6)
  })

  it('keeps a low sun from throwing the shadow to infinity', () => {
    expect(headShadowPoint(eye, 0)[0]).toBeLessThanOrEqual(600)
  })
})

describe('camera', () => {
  it('sits at the eye when orbit is 1 and beside the scene when orbit is 0', () => {
    const at = buildCamera({ eye, orbit: 1, sunElevationDeg: 10, width: 1440, height: 900 })
    expect(at.position[0]).toBeCloseTo(eye[0], 6)
    expect(at.position[1]).toBeCloseTo(eye[1], 6)
    expect(at.position[2]).toBeCloseTo(eye[2], 6)
    const side = buildCamera({ eye, orbit: 0, sunElevationDeg: 10, width: 1440, height: 900 })
    expect(Math.abs(side.position[2])).toBeGreaterThan(60)
  })

  it('shows the rain curtain to the right of the observer in the side view', () => {
    const side = buildCamera({ eye, orbit: 0, sunElevationDeg: 10, width: 1440, height: 900 })
    const observer = side.project([0, 1, 0])
    const curtain = side.project([CURTAIN_X_M, 20, 0])
    expect(observer).not.toBeNull()
    expect(curtain).not.toBeNull()
    expect(curtain![0]).toBeGreaterThan(observer![0])
    expect(observer![0]).toBeGreaterThan(0)
    expect(curtain![0]).toBeLessThan(1440)
  })

  it('projects and unprojects consistently', () => {
    const camera = buildCamera({ eye, orbit: 0.4, sunElevationDeg: 15, width: 1200, height: 800 })
    const point: Vec3 = [40, 20, -10]
    const screen = camera.project(point)!
    const ray = camera.ray(screen[0], screen[1])
    const rebuilt: Vec3 = [
      camera.position[0] + ray[0] * screen[2] / (ray[0] * camera.forward[0] + ray[1] * camera.forward[1] + ray[2] * camera.forward[2]),
      camera.position[1] + ray[1] * screen[2] / (ray[0] * camera.forward[0] + ray[1] * camera.forward[1] + ray[2] * camera.forward[2]),
      camera.position[2] + ray[2] * screen[2] / (ray[0] * camera.forward[0] + ray[1] * camera.forward[1] + ray[2] * camera.forward[2]),
    ]
    expect(rebuilt[0]).toBeCloseTo(point[0], 5)
    expect(rebuilt[1]).toBeCloseTo(point[1], 5)
    expect(rebuilt[2]).toBeCloseTo(point[2], 5)
  })

  it('fits the whole primary bow inside the eye view on a landscape screen', () => {
    const camera = buildCamera({ eye, orbit: 1, sunElevationDeg: 12, width: 1440, height: 900 })
    const top = bowPointOnCurtain(eye, 12, 42.4, 0)!
    const screen = camera.project(top)!
    expect(screen[1]).toBeGreaterThan(40)
    for (const phi of [-90, 90]) {
      const foot = bowPointOnCurtain(eye, 12, 42.4, phi)!
      const s = camera.project(foot)!
      expect(s[0]).toBeGreaterThan(0)
      expect(s[0]).toBeLessThan(1440)
    }
  })

  it('widens the field of view continuously towards the eye view', () => {
    expect(fieldOfViewDeg(0, 1440, 900)).toBeLessThan(fieldOfViewDeg(0.5, 1440, 900))
    expect(fieldOfViewDeg(0.5, 1440, 900)).toBeLessThan(fieldOfViewDeg(1, 1440, 900))
    expect(fieldOfViewDeg(1, 390, 844)).toBeLessThan(fieldOfViewDeg(1, 1440, 900))
  })
})

describe('rain', () => {
  it('keeps every drop inside the curtain while falling', () => {
    const drops = makeRainDrops(500)
    for (let step = 0; step < 40; step += 1) advanceRain(drops, 0.5)
    for (let i = 0; i < drops.count; i += 1) {
      expect(drops.y[i]).toBeGreaterThanOrEqual(0)
      expect(drops.y[i]).toBeLessThanOrEqual(100)
      expect(Math.abs(drops.x[i] - CURTAIN_X_M)).toBeLessThanOrEqual(3)
    }
  })

  it('leaves a share of drops near the primary bow for a low sun', () => {
    const drops = makeRainDrops(6000)
    let near = 0
    for (let i = 0; i < drops.count; i += 1) {
      const angle = angleFromAntisolarDeg([drops.x[i], drops.y[i], drops.z[i]], eye, 10)
      if (angle > 40.5 && angle < 42.5) near += 1
    }
    expect(near).toBeGreaterThan(60)
  })
})


describe('double rainbow framing', () => {
  it('keeps the outer arc visible above the main arc on desktop and phone', () => {
    for (const [width, height] of [[1440, 900], [390, 844]]) {
      const camera = buildCamera({ eye, orbit: 1, sunElevationDeg: 12, width, height })
      for (const phi of width < height ? [-30, 0, 30] : [-72, 0, 72]) {
        const point = bowPointOnCurtain(eye, 12, 53.4, phi)!
        const projected = camera.project(point)!
        expect(projected[0]).toBeGreaterThan(0)
        expect(projected[0]).toBeLessThan(width)
        expect(projected[1]).toBeGreaterThan(75)
        expect(projected[1]).toBeLessThan(height * 0.75)
      }
    }
  })

  it('can leave a secondary arc above the horizon after the primary sinks', () => {
    expect(bowTopElevationDeg(45, 42.4)).toBeLessThan(0)
    expect(bowTopElevationDeg(45, 51.2)).toBeGreaterThan(0)
  })
})
