import {describe, expect, it} from 'vitest'

import {FEATURED_CONCEPT_NAMES, SYSTEM_LABELS, SYSTEMS, structureNote, type Part} from './anatomy'
import {translateAnatomyName} from './anatomy-names'
import {createExplosionLayout} from './explosion-layout'
import {PointerTap} from './pointer-tap'

function part(id: string, width: number, height: number): Part {
  return {
    id,
    name: id,
    conceptId: id,
    system: 'skeletal',
    chunk: 0,
    positions: 0,
    normals: 0,
    indices: 0,
    vertexCount: 0,
    indexCount: 0,
    bounds: [[0, 0, 0], [width, height, 0.01]],
  }
}

describe('human-atlas explosion layout', () => {
  it('gives every visible mesh its own non-overlapping cell', () => {
    const parts = [part('a', 0.2, 0.3), part('b', 0.15, 0.4), part('c', 0.25, 0.2), part('d', 0.1, 0.1)]
    const {cells, width, height} = createExplosionLayout(parts, 1)
    expect(cells.size).toBe(4)
    expect(width).toBeGreaterThan(0)
    expect(height).toBeGreaterThan(0)
    const boxes = [...cells.values()].map((cell) => ({
      left: cell.x - cell.width / 2,
      right: cell.x + cell.width / 2,
      top: cell.y + cell.height / 2,
      bottom: cell.y - cell.height / 2,
    }))
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const overlapX = Math.min(boxes[i].right, boxes[j].right) - Math.max(boxes[i].left, boxes[j].left)
        const overlapY = Math.min(boxes[i].top, boxes[j].top) - Math.max(boxes[i].bottom, boxes[j].bottom)
        expect(overlapX < 1e-9 || overlapY < 1e-9).toBe(true)
      }
    }
  })
})

describe('human-atlas pointer tap', () => {
  it('counts a short press as a tap and a drag as not a tap', () => {
    const tap = new PointerTap()
    tap.down(1, 10, 10, 5)
    expect(tap.up(1, 12, 11)).toBe(true)
    tap.down(2, 10, 10, 5)
    tap.move(2, 40, 10)
    expect(tap.up(2, 40, 10)).toBe(false)
  })

  it('rejects a second finger as a tap', () => {
    const tap = new PointerTap()
    tap.down(1, 0, 0, 5)
    tap.down(2, 8, 8, 5)
    expect(tap.up(1, 0, 0)).toBe(false)
  })
})

describe('human-atlas names', () => {
  it('translates featured organs into Chinese', () => {
    expect(translateAnatomyName('heart')).toBe('心脏')
    expect(translateAnatomyName('liver')).toBe('肝')
    expect(translateAnatomyName('brain')).toBe('脑')
    expect(translateAnatomyName('urinary bladder')).toBe('膀胱')
    expect(translateAnatomyName('Left femur')).toBe('左股骨')
    expect(translateAnatomyName('Abdominal aorta')).toBe('腹主动脉')
  })

  it('keeps a note for every system and featured organ', () => {
    expect(SYSTEMS).toHaveLength(15)
    for (const system of SYSTEMS) {
      expect(SYSTEM_LABELS[system.id]).toBeTruthy()
      expect(structureNote('unknown structure', system.id)).toBeTruthy()
    }
    for (const name of FEATURED_CONCEPT_NAMES) {
      expect(structureNote(name, 'digestive') || structureNote(name, 'cardiac')).toBeTruthy()
    }
  })
})
