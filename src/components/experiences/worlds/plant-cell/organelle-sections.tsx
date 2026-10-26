import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as T from 'three'
import { cellRadius } from './cell-geometry'
import { useCutaway, TissueMaterial } from './cutaway'

/** Intersect actual moving ellipsoids with the same plane as the cell wall.
 * These are caps of the live volumes, not enlarged decorative organelles. */
export function OrganelleSections({ source, count, color, name, opacity }: {
  source: RefObject<T.InstancedMesh | null>; count: number; color: string; name: string; opacity: number
}) {
  const ref = useRef<T.InstancedMesh>(null), cut = useCutaway()
  const scratch = useMemo(() => ({ body: new T.Matrix4(), inverse: new T.Matrix4(), plane: new T.Plane(), cap: new T.Object3D(), z: new T.Vector3(0,0,1) }), [])
  const geometry = useMemo(() => new T.CircleGeometry(1, 16), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useLayoutEffect(() => {
    for (const mesh of [source.current, ref.current]) if (mesh) mesh.boundingSphere = new T.Sphere(new T.Vector3(), 50)
  }, [source])
  useFrame(() => {
    if (!source.current || !ref.current || !cut) return
    for (let node: T.Object3D | null = source.current; node; node = node.parent) if (!node.visible) return
    source.current.updateWorldMatrix(true, false)
    for (let i = 0; i < count; i++) {
      source.current.getMatrixAt(i, scratch.body)
      scratch.inverse.multiplyMatrices(source.current.matrixWorld, scratch.body).invert()
      scratch.plane.copy(cut.plane).applyMatrix4(scratch.inverse)
      const d = scratch.plane.constant
      const e = scratch.body.elements
      const inVacuole = Math.hypot(e[12], e[14]) < cellRadius(e[13]/.94)*.80
      const r = inVacuole ? 0 : Math.sqrt(Math.max(0, 1 - d*d))
      scratch.cap.position.copy(scratch.plane.normal).multiplyScalar(-d - .02)
      scratch.cap.quaternion.setFromUnitVectors(scratch.z, scratch.plane.normal)
      scratch.cap.scale.set(r, r, 1); scratch.cap.updateMatrix()
      ref.current.setMatrixAt(i, scratch.body.multiply(scratch.cap.matrix))
    }
    ref.current.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} name={name} args={[geometry, undefined, count]} frustumCulled={false}>
    <TissueMaterial color={color} opacity={opacity} clipped={false} />
  </instancedMesh>
}
