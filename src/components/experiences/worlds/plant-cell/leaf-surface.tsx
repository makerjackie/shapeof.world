import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as T from 'three'
import { createLeafGeometry, LEAF_ENTRY, LEAF_MIDRIB_X, leafSurfaceY } from './leaf-model'
import { createEpidermis, createGuardGeometry, createLeafVeins, guardCellMatrices } from './leaf-surface-geometry'

import type { WaterReadings } from './water-model'

type SurfaceKind = 'blade' | 'vein' | 'epidermis' | 'guard' | 'chloroplast'
function surfaceMaterial(kind: SurfaceKind, detailRadius: number) {
  const colors = { blade: '#376126', vein: '#658448', epidermis: '#487133', guard: '#537d38', chloroplast: '#244a20' }
  const material = new T.MeshPhysicalMaterial({ color: colors[kind], roughness: kind === 'vein' ? .8 : .64,
    metalness: 0, clearcoat: kind === 'vein' ? .04 : .2, clearcoatRoughness: .42,
    side: T.DoubleSide, transparent: true, opacity: 1, depthWrite: kind === 'blade' || kind === 'vein',
    vertexColors: kind === 'epidermis', emissive: kind === 'vein' ? '#273411' : '#1c300d', emissiveIntensity: .11 })
  material.userData.waterWilt = { value: 0 }
  material.userData.guardOpen = { value: .6 }
  const isMicro = ['epidermis', 'guard', 'chloroplast'].includes(kind)
  material.onBeforeCompile = (shader) => {
    shader.uniforms.waterWilt = material.userData.waterWilt
    shader.uniforms.guardOpen = material.userData.guardOpen
    shader.vertexShader = 'varying vec3 vLeafPosition; uniform float guardOpen; uniform float waterWilt;\n' + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      ${kind === 'guard' ? 'transformed.x += guardOpen * 4.0 * sin(clamp((position.z / 25.0 + .5), 0.0, 1.0) * 3.141593);' : ''}
      vec4 leafPoint = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        leafPoint = instanceMatrix * leafPoint;
      #endif
      vLeafPosition = leafPoint.xyz;
      ${!isMicro ? `
        float outsideAnchor = smoothstep(2000.0, 12000.0, length(transformed.xz));
        float along = clamp((60000.0 - transformed.z) / 120000.0, 0.0, 1.0);
        float edgeCurl = pow(abs((transformed.x + 1500.0) / 40000.0), 3.0);
        transformed.y += waterWilt * outsideAnchor * (-45000.0 * along * along + 12000.0 * edgeCurl);
        transformed.x = mix(transformed.x, -1500.0 + (transformed.x + 1500.0) * (1.0 - .14 * edgeCurl), waterWilt * outsideAnchor);
      ` : ''}
    `)
    shader.fragmentShader = 'varying vec3 vLeafPosition; uniform float guardOpen;\n' + shader.fragmentShader
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      vec2 poreOffset = vLeafPosition.xz - vec2(${LEAF_ENTRY[0]}, ${LEAF_ENTRY[2]});
      float radial = length(poreOffset);
      float pixelUm = max(length(dFdx(vLeafPosition.xz)), length(dFdy(vLeafPosition.xz)));
      float detail = 1.0 - smoothstep(2.5, 12.0, pixelUm);
      float surfacePatch = 1.0 - smoothstep(${(detailRadius * .55).toFixed(3)}, ${(detailRadius * .98).toFixed(3)}, radial);
      float cutProgress = clamp(1.0 - opacity, 0.0, 1.0);
      float aperture = 1350.0 * pow(cutProgress, .72);
      float opened = smoothstep(aperture - 4.0, aperture + 4.0, radial);
      float boundary = exp(-pow((radial - aperture) / 3.0, 2.0)) * step(8.0, aperture);
      ${kind === 'blade' ? `
        vec2 p = vLeafPosition.xz / 1800.0;
        float mottling = .93 + .09 * sin(p.x * 1.7 + sin(p.y)) * sin(p.y * 2.1 + .2 * sin(p.x * 3.0));
        diffuseColor.rgb *= mottling;
        diffuseColor.a = opened;
        // Actual narrow pores pass through the blade underneath the two guards.
        vec2 siteIndex = floor((poreOffset - vec2(66.0, 78.0)) / vec2(176.0, 156.0) + .5);
        vec2 site = siteIndex * vec2(176.0, 156.0) + vec2(66.0, 78.0);
        vec2 cellIndex = siteIndex * vec2(4.0, 3.0) + vec2(1.0);
        float seed = fract(sin(dot(cellIndex, vec2(127.1, 311.7))) * 43758.5453);
        float angle = (seed - .5) * 1.3;
        vec2 slit = poreOffset - site;
        slit = mat2(cos(angle), sin(angle), -sin(angle), cos(angle)) * slit;
        float width = .18 + guardOpen * 4.0;
        float poreDistance = min(length(slit / vec2(width, 11.0)), length(poreOffset / vec2(width, 11.0)));
        float poreMask = smoothstep(.80, 1.03, poreDistance);
        diffuseColor.a *= mix(1.0, poreMask, detail * surfacePatch);
      ` : isMicro ? 'diffuseColor.a = detail * surfacePatch * opened;' : 'diffuseColor.a = opened;'}
      if (diffuseColor.a < .01) discard;
      diffuseColor.rgb += vec3(.19, .17, .10) * boundary;
    `)
  }
  material.customProgramCacheKey = () => `plant-cell-leaf-surface-${kind}-${detailRadius}-2`
  return material
}

/** The blade, its epidermal patch and entry pore all share L1's physical frame. */
export function LeafLayer({ opacity, mobile = false, stomataOpen = .6, water }: { opacity: number; mobile?: boolean; stomataOpen?: number; water: WaterReadings }) {
  const root = useRef<T.Group>(null), detail = useRef<T.Group>(null)
  const guardsRef = useRef<T.InstancedMesh>(null), chloroplastRef = useRef<T.InstancedMesh>(null)
  const resources = useMemo(() => {
    const blade = createLeafGeometry(), veins = createLeafVeins(), epidermis = createEpidermis(mobile), guard = createGuardGeometry()
    const stalkCurve = new T.CatmullRomCurve3([
      new T.Vector3(LEAF_MIDRIB_X, leafSurfaceY(LEAF_MIDRIB_X, 59900), 59900),
      new T.Vector3(LEAF_MIDRIB_X - 1700, -1000, 71000), new T.Vector3(LEAF_MIDRIB_X - 5400, -4500, 85000),
    ])
    const stalk = new T.TubeGeometry(stalkCurve, 28, 680, 10, false)
    const materials = Object.fromEntries(['blade', 'vein', 'epidermis', 'guard', 'chloroplast'].map((kind) => [kind, surfaceMaterial(kind as SurfaceKind, epidermis.radius)])) as Record<SurfaceKind, T.MeshPhysicalMaterial>
    return { blade, veins, epidermis, guard, stalk, materials }
  }, [mobile])
  const poses = useMemo(() => guardCellMatrices(resources.epidermis.stomata, T.MathUtils.clamp(stomataOpen, 0, 1)), [resources, stomataOpen])
  useLayoutEffect(() => {
    for (const [mesh, matrices] of [[guardsRef.current, poses.guards], [chloroplastRef.current, poses.chloroplasts]] as const) if (mesh) {
      matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix)); mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere()
    }
  }, [poses])
  useEffect(() => () => {
    for (const geometry of [resources.blade, resources.veins.main, resources.veins.secondary, resources.veins.fine, resources.epidermis.geometry, resources.guard, resources.stalk]) geometry.dispose()
    Object.values(resources.materials).forEach((material) => material.dispose())
  }, [resources])
  const scale = useMemo(() => new T.Vector3(), [])
  useFrame(() => {
    if (root.current && detail.current) {
      root.current.getWorldScale(scale)
      detail.current.visible = scale.x > .0018
    }
  })
  Object.values(resources.materials).forEach((material) => { material.opacity = opacity; material.userData.waterWilt.value = water.wilt; material.roughness = .64 + .3 * water.wilt; material.clearcoat = .2 * (1 - water.wilt); material.userData.guardOpen.value = T.MathUtils.clamp(stomataOpen, 0, 1) })
  return <group ref={root}>
    {water.immersion > .001 && <mesh position={[-1500,-30000,10000]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[150000,210000]} /><meshPhysicalMaterial color="#8baca8" transparent opacity={.07 * opacity} roughness={.18} side={T.DoubleSide} depthWrite={false} /></mesh>}
    <mesh geometry={resources.blade} material={resources.materials.blade} />
    <mesh geometry={resources.veins.main} material={resources.materials.vein} />
    <mesh geometry={resources.veins.secondary} material={resources.materials.vein} />
    <mesh geometry={resources.veins.fine} material={resources.materials.vein} />
    <mesh geometry={resources.stalk} material={resources.materials.vein} />
    <group ref={detail}>
      <mesh geometry={resources.epidermis.geometry} material={resources.materials.epidermis} />
      <instancedMesh ref={guardsRef} args={[resources.guard, resources.materials.guard, poses.guards.length]} />
      <instancedMesh ref={chloroplastRef} args={[undefined, resources.materials.chloroplast, poses.chloroplasts.length]}>
        <sphereGeometry args={[1, 8, 6]} />
      </instancedMesh>
    </group>
  </group>
}
