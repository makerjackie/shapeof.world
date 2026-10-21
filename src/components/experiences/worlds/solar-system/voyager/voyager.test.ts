import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { bodyPosition, craftPosition, sampleTrack, validateEphemeris, worldPosition, type Ephemeris } from './ephemeris'
import { chapterStart, makeJourney, sampleJourney } from './journey'
const root = resolve(import.meta.dirname, '../../../../../..')
const data = (id: 1 | 2) =>
	validateEphemeris(JSON.parse(readFileSync(resolve(root, `public/assets/solar-system/voyager/voyager-${id}.json`), 'utf8')), id)
for (const id of [1, 2] as const)
	describe(`Voyager ${id} frozen geometry`, () => {
		const d = data(id),
			journey = makeJourney(d)
		it('preserves closest approaches from directly sampled SPICE anchors', () => {
			for (const e of d.encounters) {
				const t = e.closest,
					craft = craftPosition(d, t),
					body = bodyPosition(d, e.id, t)
				const distance = Math.hypot(...craft.map((v, i) => v - body[i]))
				expect(Math.abs(distance - e.centerDistanceKm), e.id).toBeLessThan(2)
				expect(e.body.maxCheckedErrorKm).toBeLessThanOrEqual(0.2)
			}
		})
		it('bounds continuous-segment interpolation and records archive handoffs separately', () => {
			expect(d.craft.maxCheckedErrorKm).toBeLessThanOrEqual(1)
			expect(d.craft.seams?.length).toBeGreaterThan(0)
			for (const seam of d.craft.seams ?? []) {
				const span = seam.to - seam.from
				expect(sampleTrack(d.craft, seam.from + span * 0.75)).toEqual(sampleTrack(d.craft, seam.to))
				expect(sampleTrack(d.craft, seam.from + span * 0.25)).toEqual(sampleTrack(d.craft, seam.from))
			}
		})
		it('rejects out-of-coverage interpolation and isolates the labelled future model', () => {
			expect(() => sampleTrack(d.craft, d.end + 1)).toThrow(RangeError)
			expect(() => sampleTrack(d.craft, d.start - 1)).toThrow(RangeError)
			expect(() => sampleTrack(d.craft, NaN)).toThrow(RangeError)
			expect(craftPosition(d, d.end)).toEqual(sampleTrack(d.craft, d.end))
			expect(craftPosition(d, d.end + 86400).every(Number.isFinite)).toBe(true)
			expect(journey.chapters.at(-1)!.future).toBe(true)
			expect(journey.chapters.at(-1)!.from).toBe(d.end)
		})
		it('keeps chapter joins continuous and flyby centres exactly reachable while seeking', () => {
			journey.chapters.forEach((chapter, i) => {
				if (i) expect(chapter.from).toBe(journey.chapters[i - 1].to)
				expect(chapter.to).toBeGreaterThan(chapter.from)
				if (chapter.at) expect(sampleJourney(journey, chapterStart(journey, i) + chapter.duration / 2).time).toBe(chapter.at)
			})
			const times = Array.from({ length: 1001 }, (_, i) => (journey.duration * i) / 1000)
			const forward = times.map((t) => sampleJourney(journey, t).time)
			expect(
				[...times]
					.reverse()
					.map((t) => sampleJourney(journey, t).time)
					.reverse(),
			).toEqual(forward)
			expect(forward.every((t, i) => !i || t >= forward[i - 1])).toBe(true)
		})
		it('does not put the craft inside its flyby target', () => {
			const radii: Record<string, number> = { jupiter: 69911, saturn: 58232, titan: 2574.7, uranus: 25362, neptune: 24622, triton: 1353.4 }
			for (const e of d.encounters) expect(e.centerDistanceKm).toBeGreaterThan(radii[e.id])
		})
		it('matches the generator manifest checksum', () => {
			const path = resolve(root, `public/assets/solar-system/voyager/voyager-${id}.json`)
			const manifest = JSON.parse(readFileSync(resolve(root, 'public/assets/solar-system/voyager/ephemeris-sources.json'), 'utf8'))
			expect(createHash('sha256').update(readFileSync(path)).digest('hex')).toBe(manifest[`voyager-${id}`].sha256)
		})
	})
it('preserves right handed ecliptic distances under the common display transform', () => {
	const x = worldPosition([1, 0, 0]),
		y = worldPosition([0, 1, 0]),
		z = worldPosition([0, 0, 1])
	expect(x[0]).toBeGreaterThan(0)
	expect(y[2]).toBeLessThan(0)
	expect(z[1]).toBeGreaterThan(0)
	expect(Math.hypot(...x)).toBe(Math.hypot(...y))
	expect(Math.hypot(...y)).toBe(Math.hypot(...z))
})
it('rejects malformed or wrong-mission assets before rendering', () => {
	expect(() => validateEphemeris({ version: 1, mission: 1 }, 2)).toThrow()
	const d = data(1)
	const bad = { ...d, craft: { ...d.craft, rows: [d.craft.rows[0], d.craft.rows[0]] } } as Ephemeris
	expect(() => validateEphemeris(bad, 1)).toThrow()
})
