import {describe, expect, it} from 'vitest'
import * as T from 'three'
import {OcclusionIndex} from './occlusion'

function random(seed: number) {return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296)}

describe('cached triangle occlusion', () => {
  it('matches Three raycasting for transformed, nested and sided meshes', () => {
    const root = new T.Group()
    const shell = new T.Mesh(new T.SphereGeometry(1, 20, 14, .6, 5.1), new T.MeshBasicMaterial({side: T.DoubleSide}))
    shell.scale.set(1.5, .8, 1.1)
    shell.position.set(.4, .2, -.3)
    shell.visible = false // Hidden ray proxies must still participate.
    const box = new T.Mesh(new T.BoxGeometry(.4, .9, .6), Array.from({length: 6}, (_, face) => new T.MeshBasicMaterial({side: face % 2 ? T.DoubleSide : T.FrontSide})))
    box.position.set(-1.1, .4, .3)
    box.rotation.set(.1, .4, -.1)
    const child = new T.Mesh(new T.SphereGeometry(.2, 8, 6).toNonIndexed(), new T.MeshBasicMaterial({side: T.BackSide}))
    child.position.set(.2, .6, 0)
    box.add(child)
    root.add(shell, box)
    const objects = [shell, box], query = new OcclusionIndex(objects), raycaster = new T.Raycaster(), next = random(5198)
    for (const offset of [0, .7, 1.4]) {
      shell.position.y = offset
      root.updateMatrixWorld(true)
      query.sync()
      for (let i = 0; i < 360; i++) {
        const origin = new T.Vector3((next() - .5) * 7, (next() - .5) * 5, (next() - .5) * 7)
        const direction = new T.Vector3((next() - .5) * 3, (next() - .5) * 3, (next() - .5) * 3).sub(origin).normalize()
        const distance = .01 + next() * 9
        raycaster.set(origin, direction)
        const hit = raycaster.intersectObjects(objects)[0]
        expect(query.occludes(raycaster.ray, distance), `offset ${offset}, ray ${i}`).toBe(Boolean(hit && hit.distance < distance))
      }
    }
    for (const mesh of [shell, box, child]) {
      mesh.geometry.dispose()
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.dispose()
    }
  })
})
