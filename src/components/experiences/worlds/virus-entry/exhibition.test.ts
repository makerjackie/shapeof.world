import { describe, expect, it } from 'vitest'
import { BILAYER_DISPLAY, membranePatch, structureBookmark, viewSelection } from './exhibition'
import { frameAt, PARTS } from './model'

describe('generic exhibit reading aids', () => {
  it('locates each selected structure in a view where it is actually visible', () => {
    for (const part of PARTS) {
      const bookmark = structureBookmark(part.id)
      expect(bookmark.view).toBe(part.id === 'cell' ? 'membrane' : part.id === 'vesicle' ? 'inside' : 'particle')
      if (part.id === 'vesicle') {
        const frame = frameAt(bookmark.progress!, bookmark.route!)
        expect(frame.vesicleVisible).toBe(true)
        expect(frame.hasReachedCytoplasm).toBe(false)
      }
    }
    expect(viewSelection('membrane')).toBe('cell')
    expect(viewSelection('inside')).toBe('vesicle')
  })
  it('shows a centred finite closeup patch and keeps inward tails between head layers', () => {
    const points = membranePatch(true)
    expect(points.length).toBe(352)
    expect(points[0]).toEqual([-2.1, 0, -1.5])
    expect(points.at(-1)).toEqual([2.1, 0, 1.5])
    expect(membranePatch(false).length).toBe(2560)
    expect(points.flat().every(Number.isFinite)).toBe(true)
    expect(BILAYER_DISPLAY.tailY + BILAYER_DISPLAY.tailLength / 2).toBeLessThan(BILAYER_DISPLAY.headY)
    expect(BILAYER_DISPLAY.tailY - BILAYER_DISPLAY.tailLength / 2).toBeGreaterThan(0)
  })
})
