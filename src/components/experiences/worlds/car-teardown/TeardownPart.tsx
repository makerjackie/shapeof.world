import { createContext, useContext, useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as T from 'three'
import type { SystemId } from './parts'
import type { PartAnchors } from './EnginePartsUI'
import type { TeardownDefinition, TeardownPoint } from './teardown-types'

type TeardownContext = {
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
	const context = useTeardown(),
		definition = context.parts.find((part) => part.id === id)
	const root = useRef<T.Group>(null),
		coordinates = useRef<T.Group>(null)
	const { camera, size } = useThree()
	const point = useRef(new T.Vector3())
	const amount = definition ? context.amount : 0
	const shift = offset ?? definition?.offset ?? [0, 0, 0]
	const translation = rotation ? smooth((amount - rotationStage) / (1 - rotationStage)) : amount
	const turn = smooth(amount / rotationStage)
	const origin = pivot ?? [0, 0, 0]
	useEffect(() => {
		if (!definition || !root.current || (context.hovered !== id && context.selected !== id)) return
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
	}, [definition, context.hovered, context.selected, id])
	useFrame(() => {
		if (!definition || !coordinates.current || !context.anchorsRef || !representative) return
		coordinates.current.updateWorldMatrix(true, false)
		point.current.set(...(anchor ?? definition.anchor))
		coordinates.current.localToWorld(point.current).project(camera)
		context.anchorsRef.current[id] = {
			x: ((point.current.x + 1) / 2) * size.width,
			y: ((1 - point.current.y) / 2) * size.height,
			visible: point.current.z < 1 && point.current.z > -1,
		}
	})
	return (
		<group
			ref={root}
			position={[shift[0] * translation, shift[1] * translation, shift[2] * translation]}
			userData={{ teardownId: definition ? id : undefined }}
			onPointerOver={(event) => {
				if (definition) {
					event.stopPropagation()
					context.onHover?.(id)
				}
			}}
			onPointerOut={(event) => {
				if (definition) {
					event.stopPropagation()
					context.onHover?.(null)
				}
			}}
			onClick={(event) => {
				if (definition && event.delta < 5) {
					event.stopPropagation()
					context.onSelect?.(id)
				}
			}}
		>
			<group
				position={origin as TeardownPoint}
				rotation={
					rotation ? [rotation[0] * turn, rotation[1] * turn, rotation[2] * turn] : undefined
				}
			>
				<group ref={coordinates} position={[-origin[0], -origin[1], -origin[2]]}>
					{children}
				</group>
			</group>
		</group>
	)
}
