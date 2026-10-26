import { preparePaintMaterial } from './illustration'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as T from 'three'
import { Cutaway, useCutaway } from './cutaway'
import type { WaterReadings } from './water-model'
import { cellFold } from './water-geometry'
import { LEAF_ENTRY } from './leaf-model'
import { createGuardGeometry, guardCellMatrices } from './leaf-surface-geometry'
import { createSectionCells, createSectionChloroplasts, createTissueGeometry, createXylemGeometry, LOWER_PORES, SECTION_STOMATA } from './leaf-section-model'

export { LeafLayer } from './leaf-surface'
type LayerProps = { opacity: number; mobile?: boolean; stomataOpen?: number; water: WaterReadings }

function SectionMaterial({ opacity, kind = 'wall', color = '#ffffff', open = .6 }: { opacity: number; kind?: 'wall' | 'chloroplast' | 'xylem' | 'guard' | 'cuticle'; color?: string; open?: number }) {
  const cut = useCutaway()
  const material = useMemo(() => {
    const mat = new T.MeshPhysicalMaterial({ color, roughness: kind === 'cuticle' ? .55 : .83, clearcoat: kind === 'guard' ? .1 : .02,
      vertexColors: false, side: T.DoubleSide, transparent: true, depthWrite: kind !== 'wall' && kind !== 'cuticle' })
    mat.userData.open = { value: open }
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.sectionCut = { value: cut?.normal ?? new T.Vector3(0, 0, 1) }
      shader.uniforms.guardOpen = mat.userData.open
      shader.uniforms.sectionFromWorld = { value: cut?.fromWorld ?? new T.Matrix4() }
      shader.vertexShader = 'varying vec3 vSection; uniform float guardOpen; uniform mat4 sectionFromWorld;\n' + shader.vertexShader
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        ${kind === 'guard' ? 'transformed.x += guardOpen * 4.0 * sin(clamp((position.z / 25.0 + .5), 0.0, 1.0) * 3.141593);' : ''}
        vec4 sectionPoint = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          sectionPoint = instanceMatrix * sectionPoint;
        #endif
        vSection = (sectionFromWorld * modelMatrix * sectionPoint).xyz;
      `)
      shader.fragmentShader = 'varying vec3 vSection; uniform vec3 sectionCut;\n' + shader.fragmentShader
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float cutDistance = dot(vSection, sectionCut) + 1.2;
        if (cutDistance > 0.0) discard;
        float received = .88 + .12 * exp(min(0.0,cutDistance)*.006);
        diffuseColor.rgb *= received;
        ${kind === 'wall' || kind === 'cuticle' ? `
          vec2 topPore = (vSection.xz - vec2(${LEAF_ENTRY[0]}, ${LEAF_ENTRY[2]})) / vec2(5.7, 12.0);
          if (vSection.y > 34.0 && dot(topPore, topPore) < 1.0) discard;
          ${LOWER_PORES.map(([x, , z]) => `if (vSection.y < -412.0 && dot((vSection.xz - vec2(${x.toFixed(1)}, ${z.toFixed(1)})) / vec2(5.7, 12.0), (vSection.xz - vec2(${x.toFixed(1)}, ${z.toFixed(1)})) / vec2(5.7, 12.0)) < 1.0) discard;`).join('\n')}
        ` : ''}
      `)
      if (kind === 'wall') shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
        float facing = abs(dot(normal, normalize(vViewPosition)));
        float edge = pow(clamp(1.0 - facing, 0.0, 1.0), 1.8);
        diffuseColor.a *= .3 + .7 * edge;
        outgoingLight = mix(outgoingLight, vec3(.56, .61, .45) * received, edge * .65);
        float rim = 1.0 - smoothstep(.12, .65, -cutDistance);
        outgoingLight = mix(outgoingLight, vec3(.88, .81, .65) * received, rim);
        diffuseColor.a = mix(diffuseColor.a, opacity, rim);
        #include <opaque_fragment>
      `)
    }
    mat.customProgramCacheKey = () => `plant-section-${kind}-3`
    return preparePaintMaterial(mat)
    // The opening is a uniform; it does not rebuild any material or geometry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color, kind, cut])
  material.opacity = opacity; material.userData.open.value = open
  useEffect(() => () => material.dispose(), [material])
  return <primitive object={material} attach="material" />
}

/** The same pore and 500 µm slab share the leaf and hero cell coordinate frame. */
export function SectionLayer(props: LayerProps) {
  return <Cutaway><SectionTissue {...props} /></Cutaway>
}

function SectionTissue({ opacity, mobile = false, stomataOpen = .6, water }: LayerProps) {
  const chloroplastRef = useRef<T.InstancedMesh>(null), guardsRef = useRef<T.InstancedMesh>(null), guardChloroplastRef = useRef<T.InstancedMesh>(null)
  const resources = useMemo(() => {
    const cells = createSectionCells(mobile)
    const tissue = createTissueGeometry(cells)
    return { tissue, protoplast: tissue.clone(), chloroplasts: createSectionChloroplasts(cells, mobile), xylem: createXylemGeometry(), guard: createGuardGeometry() }
  }, [mobile])
  const poses = useMemo(() => guardCellMatrices(SECTION_STOMATA, stomataOpen), [stomataOpen])
  useLayoutEffect(() => {
    for (const [geometry, radial, axial, wrinkle] of [[resources.tissue,water.wallRadial,water.wallAxial,water.wrinkles], [resources.protoplast,water.radial,water.axial,water.wrinkles]] as const) {
      const attr = geometry.getAttribute('position') as T.BufferAttribute, centers = geometry.getAttribute('cellCenter')
      geometry.userData.restPositions ??= new Float32Array(attr.array)
      const rest = geometry.userData.restPositions as Float32Array
      for (let i=0;i<attr.count;i++) {
        const y=rest[i*3+1]-centers.getY(i), fold=cellFold(y,wrinkle)
        attr.setXYZ(i,centers.getX(i)+(rest[i*3]-centers.getX(i))*radial*fold,centers.getY(i)+y*axial,centers.getZ(i)+(rest[i*3+2]-centers.getZ(i))*radial*fold)
      }
      attr.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere()
    }
  }, [resources, water.radial, water.axial, water.wallRadial, water.wallAxial, water.wrinkles])
  useLayoutEffect(() => {
    const chloroplasts = chloroplastRef.current
    if (chloroplasts) {
      resources.chloroplasts.matrices.forEach((matrix, index) => {
        const transformed=matrix.clone(), c=resources.chloroplasts.centers[index], e=transformed.elements
        e[12]=c.x+(e[12]-c.x)*water.radial;e[13]=c.y+(e[13]-c.y)*water.axial;e[14]=c.z+(e[14]-c.z)*water.radial
        chloroplasts.setMatrixAt(index, transformed); chloroplasts.setColorAt(index, resources.chloroplasts.colors[index]) })
      chloroplasts.instanceMatrix.needsUpdate = true
      if (chloroplasts.instanceColor) chloroplasts.instanceColor.needsUpdate = true
      chloroplasts.computeBoundingSphere()
    }
    for (const [mesh, matrices] of [[guardsRef.current, poses.guards], [guardChloroplastRef.current, poses.chloroplasts]] as const) if (mesh) {
      matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix)); mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere()
    }
  }, [resources, poses, water.radial, water.axial])
  useEffect(() => () => { resources.tissue.dispose(); resources.protoplast.dispose(); resources.xylem.wall.dispose(); resources.xylem.spiral.dispose(); resources.guard.dispose() }, [resources])
  return <group>
    <mesh geometry={resources.tissue}><SectionMaterial opacity={opacity * .85} color="#c2d0b4" /></mesh>
    <mesh geometry={resources.protoplast} visible={water.immersion > .001}><SectionMaterial opacity={opacity * .65} color="#a9c1aa" /></mesh>
    <instancedMesh ref={chloroplastRef} args={[undefined, undefined, resources.chloroplasts.matrices.length]}>
      <sphereGeometry args={[1, mobile ? 7 : 10, 6]} /><SectionMaterial kind="chloroplast" color="#7f9e69" opacity={opacity * .95} />
    </instancedMesh>
    <mesh geometry={resources.xylem.wall}><SectionMaterial kind="xylem" color="#d6cfb0" opacity={opacity * .78} /></mesh>
    <mesh geometry={resources.xylem.spiral}><SectionMaterial kind="xylem" color="#eee3c8" opacity={opacity * .85} /></mesh>
    <instancedMesh ref={guardsRef} args={[resources.guard, undefined, poses.guards.length]}><SectionMaterial kind="guard" color="#68834b" opacity={opacity} open={stomataOpen} /></instancedMesh>
    <instancedMesh ref={guardChloroplastRef} args={[undefined, undefined, poses.chloroplasts.length]}>
      <sphereGeometry args={[1, 8, 6]} /><SectionMaterial kind="chloroplast" color="#35532d" opacity={opacity} />
    </instancedMesh>
    {LOWER_PORES.map(([x, y, z]) => <group key={x} position={[x, y, z]} rotation={[Math.PI, 0, 0]}>
      {[-1, 1].map((side) => <mesh key={side} geometry={resources.guard} scale={[side, 1, 1]} position={[-side * 2.5, 0, 0]}>
        <SectionMaterial kind="guard" color="#637452" opacity={opacity * .8} open={stomataOpen} />
      </mesh>)}
    </group>)}
    {[60, -440].map((y) => <mesh key={y} position={[0, y, -20]}>
      <boxGeometry args={[814, .6, 80]} /><SectionMaterial kind="cuticle" color="#d4cfb5" opacity={opacity * .13} />
    </mesh>)}
  </group>
}
