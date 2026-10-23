import * as T from 'three'
import {describe, expect, it} from 'vitest'

import {createMicroScene} from './micro-scene'
import {chainSummary, DISPLAY_GENERATIONS, GENERATION_NS} from './model'

/** Snapshot only submitted draw ranges; spare buffer capacity is never rendered. */
function renderedState(group: T.Group) {
  return group.children.map((object) => {
    const renderable = object as T.Mesh | T.Points | T.LineSegments
    const instanced = object instanceof T.InstancedMesh ? object : null
    const geometry = renderable.geometry
    const drawCount = geometry.drawRange.count
    const attributes = Object.fromEntries(Object.entries(geometry.attributes).map(([name, attribute]) => {
      const count = Number.isFinite(drawCount) ? Math.min(attribute.count, drawCount) : attribute.count
      return [name, Array.from(attribute.array).slice(0, count * attribute.itemSize)]
    }))
    const material = renderable.material
    const uniforms = material instanceof T.ShaderMaterial
      ? Object.fromEntries(Object.entries(material.uniforms).map(([name, uniform]) => [name, uniform.value]))
      : null
    return {
      name: object.name,
      visible: object.visible,
      drawCount,
      attributes,
      count: instanced?.count,
      instances: instanced ? Array.from(instanced.instanceMatrix.array).slice(0, instanced.count * 16) : null,
      instanceColors: instanced?.instanceColor ? Array.from(instanced.instanceColor.array).slice(0, instanced.count * 3) : null,
      uniforms,
    }
  })
}

describe('reversible microscopic illustration', () => {
  it('reproduces every submitted transform, particle, trail and shader value after scrubbing', () => {
    const scene = createMicroScene()
    try {
      for (const t of [0, 8, 24, 80, 119, 130, 740, 790, chainSummary().durationNs]) {
        scene.update(t)
        const expected = renderedState(scene.group)
        for (const other of [chainSummary().durationNs, 3, 119, -3, 76]) scene.update(other)
        scene.update(t)
        expect(renderedState(scene.group), `rendered state at ${t} ns`).toEqual(expected)
      }
    } finally {
      scene.dispose()
    }
  })

  it('shows the branching illustration, then hands off to an energy-driven continuous field', () => {
    const scene = createMicroScene()
    const nuclei = scene.group.getObjectByName('micro-nuclei') as T.InstancedMesh
    const fragments = scene.group.getObjectByName('micro-fragments') as T.InstancedMesh
    const glow = scene.group.getObjectByName('micro-neutron-glow') as T.Points
    const trails = scene.group.getObjectByName('micro-neutron-trails') as T.LineSegments
    const backdrop = scene.group.getObjectByName('micro-background-nuclei') as T.InstancedMesh
    const field = scene.group.getObjectByName('micro-heat-field') as T.Mesh<T.PlaneGeometry, T.ShaderMaterial>
    try {
      scene.update(8 * GENERATION_NS)
      expect(nuclei.count).toBeGreaterThan(1)
      expect(fragments.count).toBeGreaterThan(0)
      expect(glow.geometry.drawRange.count).toBeGreaterThan(0)
      expect(trails.geometry.drawRange.count).toBeGreaterThan(0)

      scene.update((DISPLAY_GENERATIONS + 2) * GENERATION_NS)
      expect(nuclei.count).toBe(0)
      expect(fragments.count).toBe(0)
      expect(glow.geometry.drawRange.count).toBe(0)
      expect(trails.geometry.drawRange.count).toBe(0)
      expect(backdrop.visible).toBe(false)
      expect(field.material.uniforms.transition.value).toBe(1)
      expect(field.material.uniforms.energy.value).toBeLessThan(0.001)

      scene.update(chainSummary().durationNs)
      expect(field.material.uniforms.energy.value).toBe(1)
      expect(field.material.uniforms.whiteout.value).toBe(1)
    } finally {
      scene.dispose()
    }
  })
})
