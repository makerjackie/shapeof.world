import { createContext, useContext } from 'react'
import { useFrame as useR3FFrame, type RenderCallback } from '@react-three/fiber'

// Hidden systems retain resources, but do not run their mechanisms. The shared
// clock advances independently, so they reappear in the correct phase.
export const AnimationScope = createContext(true)
export function useFrame(callback: RenderCallback, priority = 0) {
	const active = useContext(AnimationScope)
	useR3FFrame((state, delta, frame) => {
		if (active) callback(state, delta, frame)
	}, priority)
}
