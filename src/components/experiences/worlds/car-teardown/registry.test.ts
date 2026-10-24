import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import ts from 'typescript'
import { TEARDOWN_PARTS } from './teardown-registry'
import { PARTS, SYSTEMS, partCount, systemOffset } from './parts'
import { VEHICLE_SPEC as S } from './vehicle-spec'

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

	it('resolves physical mesh IDs and grouped teardown IDs in their separate registries', () => {
		const physicalIds = new Set(PARTS.map((part) => part.id))
		const groupIds = new Set(
			Object.values(TEARDOWN_PARTS)
				.flat()
				.map((part) => part.id),
		)
		const directory = resolve('src/components/experiences/worlds/car-teardown')
		let physicalReferences = 0
		let groupReferences = 0
		// JSX-aware inspection excludes unrelated DOM IDs and distinguishes a
		// selectable group (e.g. body-seats) from its three physical seat IDs.
		const literals = (node: ts.Node): string[] => {
			if (ts.isStringLiteral(node)) return [node.text]
			if (ts.isJsxExpression(node) && node.expression) return literals(node.expression)
			if (ts.isConditionalExpression(node))
				return [...literals(node.whenTrue), ...literals(node.whenFalse)]
			return []
		}
		for (const file of readdirSync(directory).filter((name) => name.endsWith('.tsx'))) {
			const source = ts.createSourceFile(
				file,
				readFileSync(resolve(directory, file), 'utf8'),
				ts.ScriptTarget.Latest,
				true,
				ts.ScriptKind.TSX,
			)
			const validate = (node: ts.Node, grouped: boolean) => {
				for (const id of literals(node)) {
					expect(
						(grouped ? groupIds : physicalIds).has(id),
						`${file} references unregistered ${grouped ? 'teardown group' : 'physical part'} ${id}`,
					).toBe(true)
					if (grouped) groupReferences++
					else physicalReferences++
				}
			}
			const visit = (node: ts.Node) => {
				if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
					const component = node.tagName.getText(source)
					for (const attribute of node.attributes.properties) {
						if (!ts.isJsxAttribute(attribute) || !attribute.initializer) continue
						const name = attribute.name.getText(source)
						if (name === 'partId') validate(attribute.initializer, false)
						if (name === 'id' && component === 'TeardownPart') validate(attribute.initializer, true)
						if (name === 'id' && ['Box', 'Bar', 'Pipe'].includes(component))
							validate(attribute.initializer, false)
					}
				}
				if (ts.isPropertyAssignment(node) && node.name.getText(source) === 'partId')
					validate(node.initializer, false)
				ts.forEachChild(node, visit)
			}
			visit(source)
		}
		expect(physicalReferences).toBeGreaterThan(40)
		expect(groupReferences).toBeGreaterThan(40)
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

describe('seven-system teardown contract', () => {
	it('covers exactly the selectable systems and keeps group identities unique', () => {
		expect(Object.keys(TEARDOWN_PARTS).sort()).toEqual(SYSTEMS.map(({ id }) => id).sort())
		const groups = Object.values(TEARDOWN_PARTS).flat()
		expect(new Set(groups.map(({ id }) => id)).size).toBe(groups.length)
	})
	for (const [system, groups] of Object.entries(TEARDOWN_PARTS)) {
		it(`${system} cards resolve physical parts and have bilingual copy and finite transforms`, () => {
			const ids = new Set(PARTS.map(({ id }) => id))
			const members = groups.flatMap(({ partIds }) => partIds)
			expect(new Set(members).size).toBe(members.length)
			for (const group of groups) {
				expect(group.data.length, `${group.id}: key data`).toBeGreaterThan(0)
				for (const field of [
					group.name,
					group.description,
					group.material,
					...group.data.map(({ label }) => label),
				]) {
					expect(field.zh.trim().length, `${group.id}: Chinese text`).toBeGreaterThan(0)
					expect(field.en.trim().length, `${group.id}: English text`).toBeGreaterThan(0)
					expect(field.en).not.toMatch(/[\u3400-\u9fff]/)
				}
				for (const { value } of group.data) {
					if (typeof value === 'string') expect(value.trim()).not.toBe('')
					else {
						expect(value.zh.trim()).not.toBe('')
						expect(value.en.trim()).not.toBe('')
						expect(value.en).not.toMatch(/[\u3400-\u9fff]/)
					}
				}
				expect(group.partIds.length, group.id).toBeGreaterThan(0)
				for (const partId of group.partIds)
					expect(ids.has(partId), `${group.id}: ${partId}`).toBe(true)
				expect(Number.isInteger(group.count)).toBe(true)
				expect(group.count).toBeGreaterThan(0)
				for (const vector of [group.offset, group.anchor]) {
					expect(vector).toHaveLength(3)
					expect(vector.every(Number.isFinite)).toBe(true)
				}
			}
		})
	}
})
