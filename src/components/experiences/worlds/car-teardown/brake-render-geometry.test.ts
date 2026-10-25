import { describe, expect, it } from 'vitest'
import { floatingCaliperBody } from './brake-geometry'
import { caliperGeometry, rotorGeometry } from './brake-render-geometry'

describe('brake inspection geometry cache', () => {
	it.each([true, false])('preserves the casting and owns disposable copies (front=%s)', (front) => {
		const reference = floatingCaliperBody(front)
		const first = caliperGeometry(front),
			second = caliperGeometry(front)
		for (const attribute of ['position', 'normal']) {
			expect(first.casting.getAttribute(attribute).array).toEqual(
				reference.getAttribute(attribute).array,
			)
			expect(second.casting.getAttribute(attribute).array).not.toBe(
				first.casting.getAttribute(attribute).array,
			)
		}
		first.casting.translate(1, 2, 3)
		Object.values(first).forEach((g) => g.dispose())
		const third = caliperGeometry(front)
		expect(third.casting.getAttribute('position').array).toEqual(
			reference.getAttribute('position').array,
		)
		expect(third.edges.getAttribute('position').array).toEqual(
			second.edges.getAttribute('position').array,
		)
		for (const geometries of [second, third]) Object.values(geometries).forEach((g) => g.dispose())
		reference.dispose()
	})
	it.each([true, false])('keeps separate rotor buffers for every corner (front=%s)', (front) => {
		const first = rotorGeometry(front),
			second = rotorGeometry(front)
		for (const name of ['ring', 'hat', 'grooves'] as const) {
			expect(first[name].getAttribute('position').array).toEqual(
				second[name].getAttribute('position').array,
			)
			expect(first[name].getAttribute('position').array).not.toBe(
				second[name].getAttribute('position').array,
			)
		}
		first.grooves.scale(2, 2, 2)
		const third = rotorGeometry(front)
		expect(third.grooves.getAttribute('position').array).toEqual(
			second.grooves.getAttribute('position').array,
		)
		for (const geometries of [first, second, third])
			Object.values(geometries).forEach((g) => g.dispose())
	})
})
