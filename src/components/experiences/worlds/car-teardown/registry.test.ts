import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'
import {PARTS, SYSTEMS, partCount, systemOffset} from './parts'
import {VEHICLE_SPEC as S} from './vehicle-spec'

describe('rendered-part registry', () => {
	it('gives every registered part one unique ID and complete bilingual metadata', () => {
		expect(new Set(PARTS.map((part) => part.id)).size).toBe(PARTS.length)
		expect(new Set(PARTS.map((part) => part.order)).size).toBe(PARTS.length)
		for (const part of PARTS) {
			expect(SYSTEMS.some((system) => system.id === part.system)).toBe(true)
			for (const value of [
				part.id,
				part.name,
				part.nameEn,
				part.function,
				part.functionEn,
				part.material,
				part.materialEn,
			]) {
				expect(value.trim().length).toBeGreaterThan(0)
			}
			expect(part.explode).toHaveLength(3)
			expect(part.explode.every(Number.isFinite)).toBe(true)
		}
		for (const system of SYSTEMS) expect(partCount(system.id)).toBeGreaterThan(0)
	})

	it('registers every literal part ID actually referenced by the scene components', () => {
		const ids = new Set(PARTS.map((part) => part.id))
		for (const file of [
			'Body.tsx',
			'Engine.tsx',
			'Systems.tsx',
			'Wheels.tsx',
			'Transmission.tsx',
			'SteeringMechanism.tsx',
			'BrakeMechanism.tsx',
			'SuspensionMechanism.tsx',
		]) {
			const source = readFileSync(
				resolve('src/components/experiences/worlds/car-teardown', file),
				'utf8',
			)
			const literalId = /\b(?:partId|id)=["']([^"']+)["']|\bpartId:\s*["']([^"']+)["']/g
			for (const match of source.matchAll(literalId)) {
				expect(
					ids.has(match[1] ?? match[2]),
					`${file} references unregistered part ${match[1] ?? match[2]}`,
				).toBe(true)
			}
		}
	})

	it('accounts for all four cylinder assemblies and all sixteen valves and springs', () => {
		const ids = new Set(PARTS.map((part) => part.id))
		for (let cylinder = 1; cylinder <= S.engine.cylinders; cylinder++) {
			for (const prefix of [
				'piston',
				'piston-rings',
				'piston-pin',
				'connecting-rod',
				'spark-plug',
				'ignition-coil',
			]) {
				expect(ids.has(`${prefix}-${cylinder}`)).toBe(true)
			}
			for (const type of ['intake', 'exhaust'])
				for (const index of [1, 2]) {
					expect(ids.has(`valve-${type}-${cylinder}-${index}`)).toBe(true)
					expect(ids.has(`valve-spring-${type}-${cylinder}-${index}`)).toBe(true)
				}
		}
		for (const type of ['intake', 'exhaust']) expect(ids.has(`${type}-camshaft`)).toBe(true)
		for (let bearing = 1; bearing <= 5; bearing++)
			expect(ids.has(`main-bearing-${bearing}`)).toBe(true)
		for (const shaft of ['crank', 'intake', 'exhaust'])
			expect(ids.has(`${shaft}-sprocket`)).toBe(true)
	})

	it('provides all four tires and rims with distinct registered identities', () => {
		const ids = new Set(PARTS.map((part) => part.id))
		for (const end of ['front', 'rear'])
			for (const side of ['left', 'right']) {
				expect(ids.has(`tyre-${end}-${side}`)).toBe(true)
				expect(ids.has(`rim-${end}-${side}`)).toBe(true)
			}
	})
})

describe('continuous system explosion', () => {
	it('starts assembled and reaches the specified final offsets without overshoot', () => {
		for (const system of SYSTEMS) {
			const target = system.id === 'brakes' ? [0, 0, 0] : S.explosion[system.id]
			expect(systemOffset(system.id, 0)).toEqual([0, 0, 0])
			expect(systemOffset(system.id, 1)).toEqual(target)
			for (let amount = 0; amount <= 1; amount += 0.023) {
				const offset = systemOffset(system.id, amount)
				offset.forEach((value, axis) => {
					expect(value).toBeGreaterThanOrEqual(0)
					expect(value).toBeLessThanOrEqual(target[axis])
				})
			}
		}
	})

	it('stagger-starts systems at 80 ms intervals within the 1.6 second action', () => {
		SYSTEMS.forEach((system, index) => {
			const start = (index * S.explosion.stagger) / S.explosion.duration
			expect(systemOffset(system.id, start)).toEqual([0, 0, 0])
		})
		expect(systemOffset('body', 0.04)[1]).toBeGreaterThan(0)
		expect(systemOffset('electrical', 0.04)[1]).toBe(0)
	})
})
