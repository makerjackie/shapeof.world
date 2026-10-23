import * as T from 'three'
import {describe, expect, it} from 'vitest'

import {createMicroScene, getMicroFraming} from './micro-scene'
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
      opacity: material instanceof T.Material ? material.opacity : null,
      transparent: material instanceof T.Material ? material.transparent : null,
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

  it('starts inside dense, unhit material and advances an outward spherical reaction front', () => {
    const scene = createMicroScene()
    const nuclei = scene.group.getObjectByName('micro-nuclei') as T.InstancedMesh
    const focus = scene.group.getObjectByName('micro-focus-nuclei') as T.InstancedMesh
    const backdrop = scene.group.getObjectByName('micro-background-nuclei') as T.InstancedMesh
    const fragments = scene.group.getObjectByName('micro-fragments') as T.InstancedMesh
    const matrix = new T.Matrix4()
    const position = new T.Vector3()
    const meanFragmentRadius = () => {
      let sum = 0
      for (let i = 0; i < fragments.count; i += 1) {
        fragments.getMatrixAt(i, matrix)
        sum += position.setFromMatrixPosition(matrix).length()
      }
      return sum / fragments.count
    }
    try {
      scene.update(0)
      expect(nuclei.count + focus.count).toBe(2 ** DISPLAY_GENERATIONS - 1)
      expect(backdrop.count).toBeGreaterThanOrEqual(3_000)
      expect(fragments.count).toBe(0)
      scene.update(32)
      const earlyRadius = meanFragmentRadius()
      scene.update(82)
      expect(meanFragmentRadius()).toBeGreaterThan(earlyRadius + 1)
    } finally {
      scene.dispose()
    }
  })

  it('keeps split fragments visible while they cool over several generations', () => {
    const scene = createMicroScene()
    const fragments = scene.group.getObjectByName('micro-fragments') as T.InstancedMesh
    const color = new T.Color()
    try {
      scene.update(14)
      expect(fragments.count).toBe(2)
      fragments.getColorAt(0, color)
      const hot = color.r + color.g + color.b
      scene.update(34)
      expect(fragments.count).toBeGreaterThan(2)
      fragments.getColorAt(0, color)
      expect(color.r + color.g + color.b).toBeLessThan(hot * 0.5)
      expect(color.r + color.g + color.b).toBeGreaterThan(0)
    } finally {
      scene.dispose()
    }
  })

  it('provides a deterministic camera pullback as the sphere expands', () => {
    const initial = getMicroFraming(0)
    const expanded = getMicroFraming(110)
    expect(initial.position[2]).toBe(5.6)
    expect(expanded.position[2]).toBe(13.4)
    expect(expanded.frontRadius).toBeGreaterThan(initial.frontRadius)
    getMicroFraming(800)
    expect(getMicroFraming(110)).toEqual(expanded)
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
