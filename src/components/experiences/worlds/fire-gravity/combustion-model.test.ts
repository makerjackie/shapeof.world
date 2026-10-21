import { describe, expect, it } from 'vitest'
import { combustionEquations, combustionState, countAtoms, methaneAtoms } from './combustion-model'
describe('combustion chemistry', () => {
  it.each(combustionEquations)('conserves every element in $id', equation => {
    expect(countAtoms(equation.left)).toEqual(countAtoms(equation.right))
  })
  it('animates exactly the atoms in the complete methane equation', () => {
    const atoms = { C: 0, H: 0, O: 0 }
    methaneAtoms.forEach(atom => { atoms[atom.element]++ })
    expect(atoms).toEqual(countAtoms(combustionEquations[0].left))
  })
  it('does not relight an extinguished flame when air returns', () => {
    expect(combustionState(0, true).burning).toBe(false)
    expect(combustionState(1, false).burning).toBe(false)
    expect(combustionState(1, true).burning).toBe(true)
  })
  it('bounds supply and keeps smoke qualitative, including after extinction', () => {
    expect(combustionState(-1, true).air).toBe(0)
    expect(combustionState(Infinity, true).air).toBe(1)
    expect(combustionState(.35, true).smoke).toBeGreaterThan(combustionState(1,true).smoke)
    expect(combustionState(.35, false).smoke).toBe(0)
  })
})
