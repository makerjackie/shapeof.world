import { events, type RootState, type RootStore } from '@react-three/fiber'

/** CameraControls handles DOM gestures itself. Picking while orbiting was doing
 * full triangle intersections on every move, including hidden systems. */
export function inspectionEvents(store: RootStore) {
	const manager = events(store)
	const seen = new Set<number>()
	let downX = 0,
		downY = 0,
		dragged = false
	return {
		...manager,
		filter(hits: Parameters<NonNullable<typeof manager.filter>>[0]) {
			// Only the nearest surface of a mesh/line can be selected. Keeping every
			// X-ray edge made R3F's click/missed-event bookkeeping quadratic.
			seen.clear()
			return hits.filter((hit) => {
				if (seen.has(hit.object.id)) return false
				seen.add(hit.object.id)
				return true
			})
		},
		compute(event: Parameters<NonNullable<typeof manager.compute>>[0], state: RootState) {
			if (event.type === 'pointerdown') {
				downX = event.offsetX
				downY = event.offsetY
				dragged = false
			}
			if (
				event.type === 'pointermove' &&
				event.buttons !== 0 &&
				Math.hypot(event.offsetX - downX, event.offsetY - downY) > 5
			)
				dragged = true
			if (dragged && (event.type === 'pointerup' || event.type === 'click')) {
				state.raycaster.camera = null as unknown as RootState['camera']
				return
			}
			// No 3D part handles wheel events; CameraControls owns dolly on the DOM.
			if (event.type === 'wheel' || (event.type === 'pointermove' && event.buttons !== 0)) {
				state.raycaster.camera = null as unknown as RootState['camera']
				return
			}
			// Three's default line tolerance is one metre: wider than the engine.
			// That produced enormous X-ray-edge hit lists on each input event.
			state.raycaster.params.Line.threshold = 0.004
			manager.compute?.(event, state)
		},
	}
}
