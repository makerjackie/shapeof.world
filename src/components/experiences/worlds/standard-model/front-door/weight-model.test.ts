import { describe, expect, it } from 'vitest'
import { bodyQuarkKg, combine, electronShareOfAtom, lifetimeFromWidth, neutronQuarkShare, protonQuarkShare, quarkSum } from './weight-model'

describe('weight model', () => {
	it('puts about one percent of a proton in its quarks', () => {
		expect(quarkSum(['u', 'u', 'd'])).toBeCloseTo(9.02, 2)
		expect(protonQuarkShare).toBeGreaterThan(0.009)
		expect(protonQuarkShare).toBeLessThan(0.01)
		expect(neutronQuarkShare).toBeGreaterThan(0.012)
		expect(neutronQuarkShare).toBeLessThan(0.013)
	})

	it('turns a 60 kg body into well under a kilogram of quarks', () => {
		const kg = bodyQuarkKg(60)
		expect(kg).toBeGreaterThan(0.6)
		expect(kg).toBeLessThan(0.7)
		expect(electronShareOfAtom).toBeLessThan(0.001)
	})

	it('names every u/d triple', () => {
		expect(combine(['u', 'u', 'd']).id).toBe('proton')
		expect(combine(['d', 'u', 'd']).id).toBe('neutron')
		expect(combine(['u', 'u', 'u']).id).toBe('delta-plus-plus')
		expect(combine(['d', 'd', 'd']).id).toBe('delta-minus')
		expect(combine(['u']).id).toBe('incomplete')
		expect(combine(['u', 'u', 'u']).fate[0]).toContain('×10⁻²⁴')
	})

	it('derives the Δ lifetime from its width', () => {
		expect(lifetimeFromWidth(117)).toBeCloseTo(5.6e-24, 25)
	})
})
