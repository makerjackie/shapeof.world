import {
	createContext,
	useContext,
	useEffect,
	useLayoutEffect,
	useState,
	useRef,
	type ReactNode,
	type RefObject,
} from 'react'
import { useThree } from '@react-three/fiber'
import { AnimationScope, useFrame } from './animation'
import { guardHiddenGroup } from './visibility'
import * as T from 'three'
import { AUXILIARY_TEARDOWN_GEOMETRY as A } from './vehicle-spec'
import type { Assembly } from './subassemblies'
import type { SystemId } from './parts'
import type { PartAnchors } from './EnginePartsUI'
import type { TeardownDefinition, TeardownPoint } from './teardown-types'

type TeardownContext = {
	assembly?: Assembly

	system: SystemId | null
	amount: number
	parts: readonly TeardownDefinition[]
	hovered: string | null
	selected: string | null
	anchorsRef?: RefObject<PartAnchors>
	onHover?: (id: string | null) => void
	onSelect?: (id: string) => void
}
const Context = createContext<TeardownContext>({
	system: null,
	amount: 0,
	parts: [],
	hovered: null,
	selected: null,
})
export const useTeardown = () => useContext(Context)
export const useTeardownProgress = () => useTeardown().amount
export function TeardownAssembly({
	children,
	...value
}: TeardownContext & { children: ReactNode }) {
	return <Context.Provider value={value}>{children}</Context.Provider>
}
const smooth = (v: number) => {
	const t = Math.max(0, Math.min(1, v))
	return t * t * (3 - 2 * t)
}

/** An outer assembly transform never overwrites a child's kinematic rotation.
 * Geometry can stay in vehicle coordinates, including hinge pivots. */
export function TeardownPart({
	id,
	children,
	offset,
	anchor,
	pivot,
	rotation,
	rotationStage = 0.35,
	representative = true,
}: {
	id: string
	children: ReactNode
	offset?: readonly [number, number, number]
	anchor?: TeardownPoint
	pivot?: TeardownPoint
	rotation?: TeardownPoint
	rotationStage?: number
	representative?: boolean
}) {
	const systemActive = useContext(AnimationScope)
	const context = useTeardown(),
		definition = context.parts.find((part) => part.id === id)
	const root = useRef<T.Group>(null),
		coordinates = useRef<T.Group>(null)
	const { camera, size } = useThree()
	const point = useRef(new T.Vector3())
	const localCenter = useRef(new T.Vector3())
	const centerReady = useRef(false)
	const nextProjection = useRef(0)
	const amount = definition ? context.amount : 0
	const [flatShift, setFlatShift] = useState<[number, number, number]>([0, 0, 0])
	const compact = context.assembly
	let shift: readonly [number, number, number] = compact
		? (definition?.offset ?? [0, 0, 0])
		: (offset ?? definition?.offset ?? [0, 0, 0])
	if (compact && offset && id === 'brake-pads' && offset[2] > 0.3)
		shift = [0, 0, compact.size * 0.76]
	if (
		compact &&
		offset &&
		(id === 'steer-ties' ||
			id === 'steer-gaiters' ||
			id === 'drive-halfshafts' ||
			id === 'drive-axle' ||
			id === 'drive-side-gears')
	)
		shift = [shift[0], shift[1], Math.sign(offset[2]) * shift[2]]
	if (compact && offset && id === 'drive-joints')
		shift = [Math.sign(offset[0]) * shift[0], shift[1], shift[2]]
	if (compact && offset && id === 'drive-planets')
		shift = [shift[0], Math.sign(offset[1]) * shift[1], shift[2]]
	if (compact?.id === 'knolling' && definition) shift = flatShift
	useLayoutEffect(() => {
		if (compact?.id !== 'knolling' || !coordinates.current || !definition) return
		coordinates.current.updateWorldMatrix(true, true)
		const box = new T.Box3().setFromObject(coordinates.current)
		// The grid is in vehicle coordinates, independent of the turntable and any
		// previous visit to this assembly. Remove the current extraction before fitting.
		if (root.current?.parent) box.applyMatrix4(root.current.parent.matrixWorld.clone().invert())
		if (root.current) box.translate(root.current.position.clone().negate())
		const center = box.getCenter(new T.Vector3())
		const i = compact.ids.indexOf(id),
			paired = id.includes('lights'),
			side = (anchor?.[2] ?? definition.anchor[2]) < 0 ? -1 : 1
		const target = new T.Vector3(
			((i % 4) - 1.5) * A.electrical.flatColumnSpacing,
			A.electrical.flatGroundY,
			A.electrical.flatOriginZ +
				Math.floor(i / 4) * A.electrical.flatRowSpacing +
				(paired ? side * A.electrical.flatLampSpacing : 0),
		)
		setFlatShift([target.x - center.x, target.y - box.min.y, target.z - center.z])
	}, [compact?.id, id])
	const translation = rotation ? smooth((amount - rotationStage) / (1 - rotationStage)) : amount
	const turn = smooth(amount / rotationStage)
	const origin = pivot ?? [0, 0, 0]
	useEffect(() => {
		if (
			!definition ||
			!systemActive ||
			!root.current ||
			(context.hovered !== id && context.selected !== id)
		)
			return
		const restores: (() => void)[] = []
		root.current.traverse((object) => {
			if (!(object instanceof T.Mesh)) return
			const old = object.material
			const materials = (Array.isArray(old) ? old : [old]).map((original) => {
				if (!(original instanceof T.MeshStandardMaterial)) return original
				const copy = original.clone()
				copy.onBeforeCompile = original.onBeforeCompile
				copy.customProgramCacheKey = original.customProgramCacheKey.bind(original)
				if (context.hovered === id || context.selected === id) {
					copy.emissive.add(new T.Color('#9fb4c8').multiplyScalar(0.14))
					copy.emissiveIntensity = Math.max(copy.emissiveIntensity, 0.5)
					copy.roughness = Math.max(0.2, copy.roughness * 0.85)
				}
				return copy
			})
			object.material = Array.isArray(old) ? materials : materials[0]
			restores.push(() => {
				object.material = old
				materials.forEach((material, i) => {
					if (material !== (Array.isArray(old) ? old[i] : old)) material.dispose()
				})
			})
		})
		return () => restores.forEach((restore) => restore())
	}, [definition, context.hovered, context.selected, id, systemActive])
	useEffect(() => {
		if (compact?.id !== 'knolling' || id !== 'electrical-harness' || !root.current) return
		const restore: (() => void)[] = []
		root.current.traverse((object) => {
			if (!(object instanceof T.Mesh) || !(object.material instanceof T.MeshStandardMaterial))
				return
			const original = object.material,
				copy = original.clone()
			copy.transparent = true
			copy.opacity = 0.1
			copy.depthWrite = false
			object.material = copy
			restore.push(() => {
				object.material = original
				copy.dispose()
			})
		})
		return () => restore.forEach((f) => f())
	}, [compact?.id, id])
	useLayoutEffect(() => {
		centerReady.current = false
	}, [compact?.id, id, Boolean(definition), representative, systemActive])
	useFrame(({ clock }) => {
		if (!definition || !coordinates.current || !context.anchorsRef || !representative) return
		if (clock.elapsedTime < nextProjection.current) return
		nextProjection.current = clock.elapsedTime + 1 / 30
		coordinates.current.updateWorldMatrix(true, false)
		if (compact) {
			// Mechanisms position their children in frame callbacks. Cache only after
			// those callbacks, so spring/strut labels use their assembled positions.
			if (!centerReady.current) {
				coordinates.current.updateWorldMatrix(true, true)
				new T.Box3().setFromObject(coordinates.current).getCenter(localCenter.current)
				coordinates.current.worldToLocal(localCenter.current)
				centerReady.current = true
			}
			point.current.copy(localCenter.current)
		} else point.current.set(...(anchor ?? definition.anchor))
		coordinates.current.localToWorld(point.current).project(camera)
		const projected = (context.anchorsRef.current[id] ??= { x: 0, y: 0, visible: false })
		projected.x = ((point.current.x + 1) / 2) * size.width
		projected.y = ((1 - point.current.y) / 2) * size.height
		projected.visible = point.current.z < 1 && point.current.z > -1
	}, 0.4)
	const hidden = Boolean(compact && !definition && id !== 'electrical-harness')
	return (
		<group
			ref={root}
			visible={!hidden}
			onUpdate={guardHiddenGroup}
			position={[shift[0] * translation, shift[1] * translation, shift[2] * translation]}
			userData={{
				teardownId: definition ? id : undefined,
				extraction: [...shift],
				extractionAmount: amount,
				excludeFromFit: id === 'electrical-harness',
			}}
			onPointerOver={
				definition && systemActive
					? (event) => {
							if (definition) {
								event.stopPropagation()
								context.onHover?.(id)
							}
						}
					: undefined
			}
			onPointerOut={
				definition && systemActive
					? (event) => {
							if (definition) {
								event.stopPropagation()
								context.onHover?.(null)
							}
						}
					: undefined
			}
			onClick={
				definition && systemActive
					? (event) => {
							if (definition && event.delta < 5) {
								event.stopPropagation()
								context.onSelect?.(id)
							}
						}
					: undefined
			}
		>
			<group
				position={origin as TeardownPoint}
				rotation={
					rotation ? [rotation[0] * turn, rotation[1] * turn, rotation[2] * turn] : undefined
				}
			>
				<group ref={coordinates} position={[-origin[0], -origin[1], -origin[2]]}>
					<AnimationScope.Provider value={systemActive && !hidden}>
						{children}
					</AnimationScope.Provider>
				</group>
			</group>
		</group>
	)
}
