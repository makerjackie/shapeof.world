import { describe, expect, it } from 'vitest'
import { Quaternion, SphereGeometry, Vector3 } from 'three'
import { cellRadius } from './cell-geometry'
import { advanceChloroplastMotion, chloroplastClearance, createChloroplastMotion, FOCUS_INITIAL_POSITION, FOCUS_INITIAL_QUATERNION, getChloroplastTargetWeights } from './chloroplast-motion'

function assertSeparated(state: ReturnType<typeof createChloroplastMotion>) {
  for (let i = 0; i < state.poses.length; i++) for (let j = i + 1; j < state.poses.length; j++) expect(chloroplastClearance(state.poses[i], state.poses[j])).toBeGreaterThanOrEqual(1 - 1e-7)
}

describe('persistent wall chloroplasts', () => {
  it('starts with 200 real, reproducible, separated lenses and a correctly oriented focus', () => {
    const state = createChloroplastMotion()
    expect(state.poses).toHaveLength(200)
    expect(state.poses).toEqual(createChloroplastMotion().poses)
    expect(new Set(state.poses.map((pose) => pose.id)).size).toBe(200)
    const focus = state.poses[0]
    focus.positionUm.forEach((value, i) => expect(value).toBeCloseTo(FOCUS_INITIAL_POSITION[i], 10))
    expect(focus.quaternion).toEqual(FOCUS_INITIAL_QUATERNION)
    focus.normal.forEach((value, i) => expect(value).toBeCloseTo([1, 0, 0][i], 12))
    focus.longAxis.forEach((value, i) => expect(value).toBeCloseTo([0, -1, 0][i], 12))
    expect(focus.sizeScale).toBe(1)
    for (const pose of state.poses) expect(pose.sizeScale).toBeGreaterThan(0)
    assertSeparated(state)
  })

  it('makes weak and strong destinations different while retaining a sidewall focus', () => {
    const weak = createChloroplastMotion(), strong = createChloroplastMotion()
    const startFocus = [...weak.poses[0].positionUm]
    advanceChloroplastMotion(weak, 50, 300)
    advanceChloroplastMotion(strong, 1800, 300)
    const topMean = (state: typeof weak) => state.poses.slice(1, 25).reduce((sum, pose) => sum + pose.positionUm[1], 0) / 24
    expect(topMean(weak) - topMean(strong)).toBeGreaterThan(2)
    expect(Math.hypot(...weak.poses[0].positionUm.map((v, i) => v - startFocus[i]))).toBeGreaterThan(0.2)
    expect(Math.abs(weak.poses[0].normal[1])).toBeLessThan(0.05)
    assertSeparated(weak)
    assertSeparated(strong)
    expect(getChloroplastTargetWeights(400).avoidance).toBeGreaterThan(0)
    expect(getChloroplastTargetWeights(400).avoidance).toBeLessThan(1)
    expect(getChloroplastTargetWeights(0).dark).toBe(1)
  })

  it('keeps the rendered lens surfaces within the corrugated cell wall', () => {
    const state = createChloroplastMotion()
    const geometry = new SphereGeometry(1, 48, 32).scale(3, 1.9, 1.15)
    const vertices = geometry.getAttribute('position'), point = new Vector3(), rotation = new Quaternion()
    try {
      for (const light of [null, 50, 1800, 0]) {
        if (light !== null) advanceChloroplastMotion(state, light, 300)
        let maximumProtrusion = -Infinity
        for (const pose of state.poses) {
          rotation.fromArray(pose.quaternion)
          for (let i = 0; i < vertices.count; i++) {
            point.fromBufferAttribute(vertices, i).multiplyScalar(pose.sizeScale).applyQuaternion(rotation)
            point.x += pose.positionUm[0]; point.y += pose.positionUm[1]; point.z += pose.positionUm[2]
            const angle = Math.atan2(-point.z, point.x)
            // Same radial profile and angular ripple used by cellSurface().
            const wallRadius = cellRadius(point.y) * (1 + 0.008 * Math.sin(angle * 9 + point.y * 0.28))
            maximumProtrusion = Math.max(maximumProtrusion, Math.hypot(point.x, point.z) - wallRadius)
          }
        }
        expect(maximumProtrusion).toBeLessThanOrEqual(0.03)
        assertSeparated(state)
      }
    } finally { geometry.dispose() }
  })

  it('includes collision correction in the 1–3 µm/min displacement limit', () => {
    const state = createChloroplastMotion()
    for (const light of [50, 1800, 0]) for (let step = 0; step < 20; step++) {
      const previous = state.poses.map((pose) => [...pose.positionUm])
      advanceChloroplastMotion(state, light, 15)
      for (const pose of state.poses) {
        expect(pose.speedUmPerSecond).toBeGreaterThanOrEqual(1 / 60)
        expect(pose.speedUmPerSecond).toBeLessThanOrEqual(3 / 60)
        expect(Math.hypot(...pose.positionUm.map((v, i) => v - previous[pose.id][i]))).toBeLessThanOrEqual(pose.speedUmPerSecond * 15 + 1e-7)
        expect(Math.hypot(...pose.normal)).toBeCloseTo(1, 10)
        expect(Math.hypot(...pose.longAxis)).toBeCloseTo(1, 10)
        expect(Math.hypot(...pose.quaternion)).toBeCloseTo(1, 10)
        expect(pose.normal.reduce((sum, n, i) => sum + n * pose.longAxis[i], 0)).toBeCloseTo(0, 10)
      }
    }
    assertSeparated(state)
  })
})
