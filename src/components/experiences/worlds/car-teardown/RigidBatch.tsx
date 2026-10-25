import { useLayoutEffect, useRef, type ReactNode } from 'react'
import type { Group } from 'three'
import { batchRigidMeshes } from './rigid-batch'

/** Children must have fixed local transforms for the lifetime of this group.
 * Its parent may move; articulated components must stay outside the batch. */
export function RigidBatch({ children }: { children: ReactNode }) {
	const root = useRef<Group>(null)
	useLayoutEffect(() => (root.current ? batchRigidMeshes(root.current) : undefined), [])
	return <group ref={root}>{children}</group>
}
