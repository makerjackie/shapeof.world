import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Line2 } from 'three/addons/lines/Line2.js'
import { LineGeometry } from 'three/addons/lines/LineGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { PLANETS } from '../solar-data'
import { historyPosition, orbitalPeriodDays, GALACTIC_HISTORY_DAYS } from '../orbital-model'
export function GalacticTrails({
	simDaysRef,
	blendRef,
}: {
	simDaysRef: React.MutableRefObject<number>
	blendRef: React.MutableRefObject<number>
}) {
	const { size } = useThree()
	const lastTrailUpdate = useRef({ day: NaN, blend: NaN, tick: 0 })
	const lines = useMemo(
		() =>
			PLANETS.map((planet) => {
				const count = 480
				const geometry = new LineGeometry()
				const positions = new Float32Array(count * 3)
				geometry.setPositions(positions)
				const colors = new Float32Array(count * 3)
				const color = new THREE.Color(planet.color).lerp(new THREE.Color('#bdd5e2'), 0.65)
				for (let i = 0; i < count; i++) {
					const fade = Math.pow(1 - i / (count - 1), 1.15)
					colors.set([color.r * fade, color.g * fade, color.b * fade], i * 3)
				}
				geometry.setColors(colors)
				// One screen-space stroke stays readable on high-DPI displays; no glow layers.
				const material = new LineMaterial({
					linewidth: 1.25,
					vertexColors: true,
					transparent: true,
					opacity: 0,
					depthWrite: false,
					blending: THREE.AdditiveBlending,
				})
				const line = new Line2(geometry, material)
				line.frustumCulled = false
				return { planet, count, geometry, material, line, positions }
			}),
		[],
	)
	useEffect(
		() => () =>
			lines.forEach(({ geometry, material }) => {
				geometry.dispose()
				material.dispose()
			}),
		[lines],
	)
	useFrame(({ clock }) => {
		const last = lastTrailUpdate.current
		if (clock.elapsedTime - last.tick < 1 / 30) return
		if (last.day === simDaysRef.current && Math.abs(last.blend - blendRef.current) < 0.00001) return
		last.day = simDaysRef.current
		last.blend = blendRef.current
		last.tick = clock.elapsedTime
		for (const { planet, count, geometry, material, positions } of lines) {
			material.opacity = blendRef.current * 0.76
			material.resolution.set(size.width, size.height)
			material.linewidth = size.width < 720 ? 1.05 : 1.25
			if (blendRef.current < 0.001) continue
			// A short memory of each orbit leaves open space, rather than a wall of coils.
			const history = Math.min(GALACTIC_HISTORY_DAYS, orbitalPeriodDays(planet.elements) * 4)
			for (let i = 0; i < count; i++) {
				positions.set(historyPosition(planet.elements, simDaysRef.current, (i / (count - 1)) * history, blendRef.current), i * 3)
			}
			geometry.setPositions(positions)
		}
	})
	return (
		<>
			{lines.map(({ planet, line }) => (
				<primitive key={planet.id} object={line} />
			))}
		</>
	)
}
