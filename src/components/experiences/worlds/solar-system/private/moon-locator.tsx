import { useMemo, useRef } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useExperienceI18n } from '~/i18n/experience'

/** A screen-edge locator, never a displaced Moon or a physical-size marker. */
export function MoonLocator({ body, onSelect }: { body: React.RefObject<THREE.Group | null>; onSelect: (id: string) => void }) {
	const tx = useExperienceI18n()
	const button = useRef<HTMLButtonElement>(null)
	const arrow = useRef<HTMLSpanElement>(null)
	const position = useMemo(() => new THREE.Vector3(), [])
	useFrame(({ camera, size, gl }) => {
		if (!body.current || !button.current) return
		body.current.getWorldPosition(position).project(camera)
		const root = gl.domElement.closest('.solar-system-experience')
		const canvasTop = gl.domElement.getBoundingClientRect().top
		const details = root?.querySelector('.ss-details')?.getBoundingClientRect()
		const caption = root?.querySelector('.ss-frame-caption')?.getBoundingClientRect()
		const mobile = size.width <= 720
		const margin = mobile ? 55 : 125
		const minY = Math.max(size.height * 0.32, (caption?.bottom ?? canvasTop) - canvasTop + 26)
		const maxY = mobile && details ? details.top - canvasTop - 30 : size.height * 0.7
		const flip = position.z > 1 ? -1 : 1
		const x = position.x * flip,
			y = -position.y * flip
		const px = ((x + 1) * size.width) / 2,
			py = ((y + 1) * size.height) / 2
		const covered =
			details &&
			px > details.left - 50 &&
			px < details.right + 50 &&
			py + canvasTop > details.top - 24 &&
			py + canvasTop < details.bottom + 24
		const inside = !covered && position.z > -1 && position.z < 1 && px > margin && px < size.width - margin && py > minY && py < maxY
		button.current.hidden = false
		button.current.dataset.offscreen = String(!inside)
		const edgeMinY = !mobile && x >= 0 && details ? Math.max(minY, details.bottom - canvasTop + 28) : minY
		button.current.style.left = `${inside ? px + 25 : x >= 0 ? size.width - margin : margin}px`
		button.current.style.top = `${inside ? py : THREE.MathUtils.clamp(py, Math.min(edgeMinY, maxY), maxY)}px`
		if (arrow.current) {
			arrow.current.hidden = inside
			arrow.current.style.transform = `rotate(${Math.atan2(y, x)}rad)`
		}
	})
	return (
		<Html
			fullscreen
			calculatePosition={(_, __, size) => [size.width / 2, size.height / 2]}
			zIndexRange={[7, 1]}
			style={{ pointerEvents: 'none' }}
		>
			<button ref={button} hidden type="button" className="ss-moon-locator" data-experience-overlay="true" onClick={() => onSelect('moon')}>
				{tx('月球')}{' '}
				<span ref={arrow} aria-hidden="true">
					→
				</span>
			</button>
		</Html>
	)
}
