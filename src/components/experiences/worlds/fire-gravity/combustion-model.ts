export type ChemistryView = 'products' | 'incomplete' | 'energy' | 'chain'
export type Composition = { C: number; H: number; O: number }
export type Species = { count: number; atoms: Composition }
const species = (count: number, C: number, H: number, O: number): Species => ({ count, atoms: { C, H, O } })
/** Overall bookkeeping examples, not elementary mechanisms or product-yield predictions. */
export const combustionEquations = [
  { id: 'complete', display: 'CH₄ + 2 O₂ → CO₂ + 2 H₂O', left: [species(1,1,4,0), species(2,0,0,2)], right: [species(1,1,0,2), species(2,0,2,1)] },
  { id: 'co', display: '2 CH₄ + 3 O₂ → 2 CO + 4 H₂O', left: [species(2,1,4,0), species(3,0,0,2)], right: [species(2,1,0,1), species(4,0,2,1)] },
  { id: 'soot', display: 'CH₄ + O₂ → C + 2 H₂O', left: [species(1,1,4,0), species(1,0,0,2)], right: [species(1,1,0,0), species(2,0,2,1)] },
  { id: 'branch', display: 'H + O₂ → O + OH', left: [species(1,0,1,0), species(1,0,0,2)], right: [species(1,0,0,1), species(1,0,1,1)] },
] as const
export function countAtoms(side: readonly Species[]): Composition {
  return side.reduce((sum, item) => ({ C: sum.C + item.count * item.atoms.C, H: sum.H + item.count * item.atoms.H, O: sum.O + item.count * item.atoms.O }), { C: 0, H: 0, O: 0 })
}
export function relativeSupply(value: number) { return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1 }
/** Deliberately qualitative: neither a measured oxygen fraction nor an extinction threshold. */
export function combustionState(supply: number, lit: boolean) {
  const air = relativeSupply(supply)
  return { air, burning: lit && air > .08, smoke: lit && air > .08 ? Math.max(0, (1 - air) * 1.4 - .15) : 0 }
}
export const methaneAtoms = [
  { element: 'C', from: [60,65], to: [270,42] },
  { element: 'H', from: [60,43], to: [226,94] },
  { element: 'H', from: [38,65], to: [250,94] },
  { element: 'H', from: [82,65], to: [303,94] },
  { element: 'H', from: [60,87], to: [327,94] },
  { element: 'O', from: [130,42], to: [246,42] },
  { element: 'O', from: [152,42], to: [294,42] },
  { element: 'O', from: [130,90], to: [238,78] },
  { element: 'O', from: [152,90], to: [315,78] },
] as const
