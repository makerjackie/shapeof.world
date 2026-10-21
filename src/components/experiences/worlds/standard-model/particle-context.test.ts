import { describe, expect, it } from 'vitest'
import { particleIds } from './particle-data'
import { particleContexts } from './particle-context'

describe('standard-model particle contexts', () => {
	it('covers all 17 particle cards exactly once', () => {
		expect(Object.keys(particleContexts).sort()).toEqual([...particleIds].sort())
	})

	it('keeps generations and interaction labels within the museum contract', () => {
		const interactions = new Set(['electromagnetic', 'strong', 'weak'])
		for (const [id, value] of Object.entries(particleContexts)) {
			expect(value.generation === null || [1, 2, 3].includes(value.generation)).toBe(true)
			expect(value.antiparticle.zh.length).toBeGreaterThan(0)
			expect(value.antiparticle.en.length).toBeGreaterThan(0)
			expect(value.connection.zh.length).toBeGreaterThan(20)
			expect(value.connection.en.length).toBeGreaterThan(20)
			for (const interaction of value.interactions) expect(interactions.has(interaction)).toBe(true)
			for (const source of value.sourceLinks) {
				expect(source.title.length).toBeGreaterThan(0)
				expect(source.url).toMatch(/^https:\/\/[^\s]+$/)
			}
			expect(value.sourceLinks.length).toBeGreaterThan(0)
			if (id === 'higgs') expect(value.interactions).toEqual([])
		}
	})

	it('records the important antiparticle edge cases explicitly', () => {
		expect(particleContexts.w.antiparticle.en).toContain('W+ and W−')
		expect(particleContexts.gamma.antiparticle.zh).toContain('自身')
		expect(particleContexts.gluon.antiparticle.zh).toContain('色')
		expect(particleContexts.ve.antiparticle.en).toContain('Majorana')
		expect(particleContexts.higgs.connection.en).toContain('does not make it a direct carrier')
	})
})
