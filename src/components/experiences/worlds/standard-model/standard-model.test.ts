import { describe, expect, it } from 'vitest'
import { cardQuests, cardRating, familyInfo, neighbours, particleIndex, particles } from './particle-data'
import { particleStories } from './particle-stories'

const sceneKinds = [
	'proton', 'meson', 'top-decay', 'atom', 'cosmic', 'tau-shower',
	'oscillation', 'photon-wave', 'flux-tube', 'beta-decay', 'z-exchange', 'higgs-field',
] as const

describe('standard-model particle data', () => {
	it('holds exactly the seventeen Standard Model particles', () => {
		expect(particles).toHaveLength(17)
		expect(new Set(particles.map(p => p.id)).size).toBe(17)
		const families = new Set(particles.map(p => p.family))
		expect(families).toEqual(new Set(['quark', 'lepton', 'gauge', 'scalar']))
		expect(particles.filter(p => p.family === 'quark')).toHaveLength(6)
		expect(particles.filter(p => p.family === 'lepton')).toHaveLength(6)
		expect(particles.filter(p => p.family === 'gauge')).toHaveLength(4)
		expect(particles.filter(p => p.family === 'scalar')).toHaveLength(1)
	})

	it('keeps grid placement unique and inside the wall', () => {
		const seen = new Set<string>()
		for (const p of particles) {
			expect(p.col).toBeGreaterThanOrEqual(2)
			expect(p.col).toBeLessThanOrEqual(6)
			expect(p.row).toBeGreaterThanOrEqual(1)
			expect(p.row).toBeLessThanOrEqual(4)
			const key = p.family === 'scalar' ? `pillar-${p.col}` : `${p.col}-${p.row}`
			expect(seen.has(key)).toBe(false)
			seen.add(key)
		}
		const higgs = particles[particleIndex('higgs')]
		expect(higgs.rowSpan).toBe(4)
	})

	it('keeps physical facts coherent within families', () => {
		for (const p of particles) {
			expect(sceneKinds).toContain(p.scene)
			expect(p.rating).toBeGreaterThanOrEqual(1)
			expect(p.rating).toBeLessThanOrEqual(5)
			expect(p.year).toBeGreaterThanOrEqual(1897)
			expect(p.spin).toMatch(/^(1\/2|1|0)$/)
		}
		for (const p of particles.filter(p => p.family === 'quark')) {
			const upType = p.role === '上型夸克'
			expect(p.charge).toBe(upType ? '+2/3' : '−1/3')
			expect(p.generation).toBeGreaterThan(0)
		}
		for (const p of particles.filter(p => p.family === 'lepton')) {
			const neutrino = p.role === '中微子'
			expect(p.charge).toBe(neutrino ? '0' : '−1')
			expect(p.spin).toBe('1/2')
		}
		for (const p of particles.filter(p => p.family === 'gauge')) {
			expect(p.charge === '0' || p.charge === '±1').toBe(true)
			expect(p.spin).toBe('1')
		}
	})

	it('cycles through every particle with prev/next neighbours', () => {
		const visited = new Set<string>()
		let current = particles[0]
		for (let i = 0; i < particles.length; i++) {
			visited.add(current.id)
			current = neighbours(current.id)[1]
		}
		expect(visited.size).toBe(17)
		expect(current.id).toBe(particles[0].id)
	})

	it('rates the everyday-matter particles highest, deliberately', () => {
		expect(cardRating('e')).toBe(5)
		expect(cardRating('gamma')).toBe(5)
		expect(cardRating('higgs')).toBe(5)
		expect(cardRating('t')).toBe(5)
		expect(cardRating('vmu')).toBeLessThan(5)
	})

	it('groups collectible quests from real particle sets', () => {
		const ids = new Set(particles.map(p => p.id))
		const all = cardQuests.flatMap(q => q.symbols)
		expect(new Set(all).size).toBe(all.length)
		for (const id of all) expect(ids.has(id as never)).toBe(true)
		expect(cardQuests.find(q => q.id === 'daily')!.symbols.sort()).toEqual(['d', 'e', 'u', 've'])
	})
})

describe('standard-model stories', () => {
	it('gives every particle a complete bilingual dossier', () => {
		for (const p of particles) {
			const story = particleStories[p.id]
			expect(story, `missing story for ${p.id}`).toBeTruthy()
			expect(story.title.length).toBeGreaterThan(2)
			expect(story.titleEn.length).toBeGreaterThan(2)
			expect(story.story.length).toBeGreaterThan(40)
			expect(story.storyEn.length).toBeGreaterThan(40)
			expect(story.note.length).toBeGreaterThan(4)
			expect(story.noteEn.length).toBeGreaterThan(4)
			expect(story.sceneCaption).not.toMatch(/undefined/)
			expect(story.sceneNoteEn).not.toMatch(/\p{Script=Han}/u)
			expect(story.story).not.toMatch(/!\uFF01/)
		}
	})

	it('names all four families for shell labels', () => {
		expect(Object.keys(familyInfo)).toEqual(['quark', 'lepton', 'gauge', 'scalar'])
		for (const info of Object.values(familyInfo)) {
			expect(info.label.length).toBeGreaterThan(0)
			expect(info.labelEn.length).toBeGreaterThan(0)
			expect(info.color).toMatch(/^#[0-9a-f]{6}$/i)
		}
	})
})
