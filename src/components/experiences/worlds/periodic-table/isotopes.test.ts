import { describe, expect, it } from 'vitest'
import { isotopesFor } from './isotopes'

describe('NIST isotope data', () => {
  it('covers all atomic numbers in the periodic table', () => {
    for (let atomicNumber = 1; atomicNumber <= 118; atomicNumber += 1) {
      expect(isotopesFor(atomicNumber).length, 'Z=' + atomicNumber).toBeGreaterThan(0)
    }
  })

  it('preserves mass numbers and measured abundances', () => {
    expect(isotopesFor(1)).toEqual([
      { mass: 1, abundance: 0.999885 },
      { mass: 2, abundance: 0.000115 },
      { mass: 3, abundance: null },
    ])
    expect(isotopesFor(6)).toContainEqual({ mass: 12, abundance: 0.9893 })
    expect(isotopesFor(84)).toEqual([
      { mass: 209, abundance: null },
      { mass: 210, abundance: null },
    ])
  })

  it('does not invent records and does not expose internal state', () => {
    expect(isotopesFor(0)).toEqual([])
    expect(isotopesFor(119)).toEqual([])
    const hydrogen = isotopesFor(1)
    hydrogen[0].mass = 999
    expect(isotopesFor(1)[0].mass).toBe(1)
  })
})
