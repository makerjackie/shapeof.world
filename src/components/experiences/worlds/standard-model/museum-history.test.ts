import { describe, expect, it } from 'vitest'
import { particleIds } from './particle-data'
import { discoveryMilestones } from './museum-history'

describe('standard-model museum discovery history', () => {
	it('keeps a compact chronological history covering every particle', () => {
		expect(discoveryMilestones.length).toBeGreaterThanOrEqual(8)
		expect(discoveryMilestones.length).toBeLessThanOrEqual(13)
		expect(discoveryMilestones.map(m => m.year)).toEqual([...discoveryMilestones].map(m => m.year).sort((a, b) => a - b))
		expect(new Set(discoveryMilestones.flatMap(m => m.particleIds))).toEqual(new Set(particleIds))
	})

	it('has unique stable IDs, valid particle references, sources and milestone kinds', () => {
		const ids = new Set(particleIds)
		const milestoneIds = new Set(discoveryMilestones.map(m => m.id))
		expect(milestoneIds.size).toBe(discoveryMilestones.length)
		for (const milestone of discoveryMilestones) {
			expect(milestone.id).toMatch(/^[a-z0-9-]+$/)
			expect(['proposal', 'observation', 'confirmation']).toContain(milestone.kind)
			expect(milestone.title.zh.length).toBeGreaterThan(0)
			expect(milestone.title.en.length).toBeGreaterThan(0)
			expect(milestone.summary.zh.length).toBeGreaterThan(20)
			expect(milestone.summary.en.length).toBeGreaterThan(20)
			expect(milestone.particleIds.length).toBeGreaterThan(0)
			for (const particleId of milestone.particleIds) expect(ids.has(particleId)).toBe(true)
			for (const source of milestone.sourceLinks) expect(source.url).toMatch(/^https:\/\/[^\s]+$/)
		}
	})

	it('preserves the scientific distinctions requested by the museum plan', () => {
		const byId = Object.fromEntries(discoveryMilestones.map(m => [m.id, m]))
		expect(byId['strange-hadron-1947'].summary.en).toContain('not a free strange quark')
		expect(byId['quark-model-1964'].kind).toBe('proposal')
		expect(byId['photon-1905'].kind).toBe('proposal')
		expect(byId['photon-1923'].kind).toBe('confirmation')
		expect(byId['neutrino-flavours'].summary.zh).toContain('反电子中微子')
		expect(byId['neutrino-flavours'].summary.zh).toContain('1962')
		expect(byId['neutrino-flavours'].summary.zh).toContain('2000')
	})
})
