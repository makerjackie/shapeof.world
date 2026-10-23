import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { createLeafGeometry, createOpenCellGeometry, sectionCells, seededLeafRandom, type SectionCell } from './leaf-model'

type LayerProps = { opacity: number; mobile?: boolean }

const leafPattern = /* glsl */ `
  vec2 lp = vLeafUv * 2.0 - 1.0;
  float ax = abs(lp.x);
  float mid = abs(lp.x + .025 * sin((lp.y + 1.0) * 1.5708) + .014 * sin(lp.y * 4.0));
  float vein = exp(-mid * mid / .000036);
  float sideDistance = 10.0;
  for (int k = 0; k < 11; k++) {
    float root = -.82 + float(k) * .155;
    float vy = root + ax * (.59 - root * .15) + .09 * ax * ax;
    float d = abs(lp.y - vy);
    sideDistance = min(sideDistance, d);
    vein = max(vein, exp(-d * d / .000009) * (1.0 - smoothstep(.78, 1.0, ax)));
  }
  vec2 net = vec2(lp.x * 77.0 + lp.y * 16.0, lp.y * 75.0 - lp.x * 19.0);
  net += .18 * sin(net.yx * .73);
  float network = pow(1.0 - abs(sin(net.x) * sin(net.y)), 14.0);
  float networkVisible = 1.0 - smoothstep(.4, 1.7, max(fwidth(net.x), fwidth(net.y)));
  vec3 tissue = mix(vec3(.085, .15, .037), vec3(.29, .40, .11), .54 + .24 * sin(lp.y * 3.5 + lp.x * 4.0));
  tissue += vec3(.07, .085, .018) * network * networkVisible;
  tissue = mix(tissue, vec3(.43, .48, .19), vein * .72);
  float mottling = sin(lp.x * 329.0 + sin(lp.y * 126.0)) * sin(lp.y * 287.0 + sin(lp.x * 148.0));
  tissue *= .96 + .045 * mottling;
  float leafWidth = pow(max(.0001, sin(vLeafUv.y * 3.14159)), .79)
    * (1.0 + .15 * exp(-pow((vLeafUv.y - .25) / .11, 2.0))) / 1.04;
  tissue *= 1.0 - .25 * smoothstep(.77, 1.0, ax / leafWidth);
  // The epidermis resolves only when each cell covers several pixels. Its waves
  // are drawn in physical coordinates, so no texture grows with the zoom.
  float pixelUm = max(length(dFdx(vLeafLocal.xy)), length(dFdy(vLeafLocal.xy)));
  float epidermis = 1.0 - smoothstep(2.0, 15.0, pixelUm);
  if (epidermis > .001) {
    vec2 p = vLeafLocal.xy / vec2(38.0, 47.0);
    p += .12 * sin(p.yx * 6.28318) + .08 * sin(p.yx * 3.31);
    vec2 q = abs(fract(p) - .5);
    float boundary = smoothstep(.44, .49, max(q.x, q.y));
    tissue = mix(tissue, vec3(.32, .44, .22), boundary * epidermis * .56);
    vec2 st = mod(vLeafLocal.xy + vec2(66.0, 81.5), vec2(132.0, 163.0)) - vec2(66.0, 81.5);
    float pore = length(st / vec2(2.3, 10.0));
    float guard1 = length((st - vec2(5.5, 0.0)) / vec2(5.0, 14.0));
    float guard2 = length((st + vec2(5.5, 0.0)) / vec2(5.0, 14.0));
    float guards = 1.0 - smoothstep(.8, 1.05, min(guard1, guard2));
    tissue = mix(tissue, vec3(.28, .41, .13), guards * epidermis);
    tissue = mix(tissue, vec3(.018, .035, .019), (1.0 - smoothstep(.68, 1.0, pore)) * epidermis);
  }
  diffuseColor.rgb *= tissue * 2.6;
  // Zoom reveals a local cut window, rather than dissolving the entire leaf.
  float openingRadius = (1.0 - opacity) * 1250.0;
  float openingDistance = length(vLeafLocal.xy + vec2(0.0, 190.0));
  float opening = 1.0 - smoothstep(openingRadius - 22.0, openingRadius + 22.0, openingDistance);
  diffuseColor.a = 1.0 - opening;
  float cutEdge = exp(-pow((openingDistance - openingRadius) / 6.0, 2.0)) * step(40.0, openingRadius);
  diffuseColor.rgb += vec3(.3, .26, .13) * cutEdge;
`

/** Blade, veins, epidermal walls and guard cells are entirely procedural. */
export function LeafLayer({ opacity }: LayerProps) {
  const geometry = useMemo(createLeafGeometry, [])
  const material = useMemo(() => {
    const result = new THREE.MeshPhysicalMaterial({
      color: '#759f73', roughness: .7, metalness: 0, clearcoat: .25, clearcoatRoughness: .42,
      side: THREE.DoubleSide, transparent: true, depthWrite: true,
      emissive: '#2b3b0b', emissiveIntensity: .13,
    })
    result.onBeforeCompile = (shader) => {
      shader.vertexShader = 'varying vec2 vLeafUv; varying vec3 vLeafLocal;\n' + shader.vertexShader
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvLeafUv = uv; vLeafLocal = position;')
      shader.fragmentShader = 'varying vec2 vLeafUv; varying vec3 vLeafLocal;\n' + shader.fragmentShader
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n' + leafPattern)
    }
    result.customProgramCacheKey = () => 'plant-cell-leaf-1'
    return result
  }, [])
  const stalk = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -59_900, 0), new THREE.Vector3(-2_000, -70_000, -500), new THREE.Vector3(-5_000, -83_000, -1_700),
  ]), 20, 680, 8, false), [])
  useEffect(() => () => { geometry.dispose(); material.dispose(); stalk.dispose() }, [geometry, material, stalk])
  material.opacity = opacity
  return <group>
    <mesh geometry={geometry} material={material} />
    <mesh geometry={stalk}>
      <meshStandardMaterial color="#788953" roughness={.75} transparent opacity={opacity} />
    </mesh>
  </group>
}

function cellMatrix(cell: SectionCell) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(cell.x, cell.y, cell.z),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), cell.angle),
    new THREE.Vector3(cell.rx, cell.ry, cell.rz),
  )
}

function deformSponge(point: THREE.Vector3, cell: SectionCell) {
  if (cell.kind !== 'sponge') return point
  const phase = cell.x * .037 + cell.y * .019
  const x = point.x, y = point.y, z = point.z
  point.x *= 1 + .19 * Math.sin(y * 2.4 + phase) + .08 * Math.cos(z * 3.1 - phase)
  point.y *= .89 + .12 * Math.cos(x * 3.4 + phase)
  point.z *= 1 + .17 * Math.sin(y * 2.1 + x * 3 + phase)
  return point
}

function createSpongeGeometry(cells: SectionCell[]) {
  const original = createOpenCellGeometry()
  const base = original.toNonIndexed()
  original.dispose()
  const source = base.getAttribute('position')
  const positions: number[] = []
  const point = new THREE.Vector3()
  for (const cell of cells.filter((candidate) => candidate.kind === 'sponge')) {
    const matrix = cellMatrix(cell)
    for (let i = 0; i < source.count; i++) {
      point.fromBufferAttribute(source, i)
      deformSponge(point, cell).applyMatrix4(matrix)
      positions.push(point.x, point.y, point.z)
    }
  }
  base.dispose()
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}

function createSectionLines(cells: SectionCell[]) {
  const positions: number[] = []
  for (const cell of cells) {
    const matrix = cellMatrix(cell)
    // The section edge traces the two semicircular caps and the straight wall.
    const points: THREE.Vector3[] = []
    for (let i = 0; i <= 12; i++) {
      const angle = i / 12 * Math.PI
      points.push(deformSponge(new THREE.Vector3(Math.cos(angle), 4 / 3 + Math.sin(angle), 0), cell).applyMatrix4(matrix))
    }
    for (let i = 0; i <= 12; i++) {
      const angle = Math.PI + i / 12 * Math.PI
      points.push(deformSponge(new THREE.Vector3(Math.cos(angle), -4 / 3 + Math.sin(angle), 0), cell).applyMatrix4(matrix))
    }
    for (let i = 0; i < points.length; i++) positions.push(...points[i].toArray(), ...points[(i + 1) % points.length].toArray())
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  return geometry
}

function createSectionChloroplasts(cells: SectionCell[], mobile: boolean) {
  const random = seededLeafRandom(1298)
  const matrices: THREE.Matrix4[] = []
  const colors: THREE.Color[] = []
  const dummy = new THREE.Object3D()
  for (const cell of cells) {
    if (cell.kind === 'epidermis') continue
    const transform = cellMatrix(cell)
    const rows = mobile ? 6 : 8
    const columns = cell.kind === 'palisade' ? (mobile ? 6 : 9) : (mobile ? 4 : 6)
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const angle = Math.PI + (column + .4 + random() * .2) / columns * Math.PI
        const y = (row / (rows - 1) - .5) * 3.6
        const cap = Math.max(0, Math.abs(y) - 4 / 3)
        const radius = Math.sqrt(Math.max(.1, 1 - cap * cap)) * .88
        const location = deformSponge(new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius), cell).applyMatrix4(transform)
        dummy.position.copy(location)
        dummy.rotation.set(0, -angle, cell.angle + (random() - .5) * .5)
        const size = .85 + random() * .27
        dummy.scale.set(2.65 * size, 1.75 * size, .85 * size)
        dummy.updateMatrix()
        matrices.push(dummy.matrix.clone())
        colors.push(new THREE.Color().setHSL(.23 + random() * .035, .31 + random() * .12, .18 + random() * .09))
      }
    }
  }
  return { matrices, colors }
}

/** A 0.5 mm section: upper epidermis, palisade, spongy mesophyll and lower epidermis. */
export function SectionLayer({ opacity, mobile = false }: LayerProps) {
  const cells = useMemo(sectionCells, [])
  const regularCells = useMemo(() => cells.filter((cell) => cell.kind !== 'sponge'), [cells])
  const spongeGeometry = useMemo(() => createSpongeGeometry(cells), [cells])
  const cellRef = useRef<THREE.InstancedMesh>(null)
  const chloroplastRef = useRef<THREE.InstancedMesh>(null)
  const cellGeometry = useMemo(createOpenCellGeometry, [])
  const lines = useMemo(() => createSectionLines(cells), [cells])
  const chloroplasts = useMemo(() => createSectionChloroplasts(cells, mobile), [cells, mobile])
  const cellMaterial = useMemo(() => {
    const material = new THREE.MeshPhysicalMaterial({
      color: '#9baf85', roughness: .83, side: THREE.DoubleSide,
      transparent: true, opacity: .18, depthWrite: false,
      clearcoat: .05, emissive: '#1c2918', emissiveIntensity: .15,
    })
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
        diffuseColor.a *= .23 + .77 * pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.2);
        #include <opaque_fragment>
      `)
    }
    material.customProgramCacheKey = () => 'plant-cell-section-membrane-1'
    return material
  }, [])
  useLayoutEffect(() => {
    if (cellRef.current) {
      regularCells.forEach((cell, i) => cellRef.current!.setMatrixAt(i, cellMatrix(cell)))
      cellRef.current.instanceMatrix.needsUpdate = true
      cellRef.current.computeBoundingSphere()
    }
    if (chloroplastRef.current) {
      chloroplasts.matrices.forEach((matrix, i) => {
        chloroplastRef.current!.setMatrixAt(i, matrix)
        chloroplastRef.current!.setColorAt(i, chloroplasts.colors[i])
      })
      chloroplastRef.current.instanceMatrix.needsUpdate = true
      if (chloroplastRef.current.instanceColor) chloroplastRef.current.instanceColor.needsUpdate = true
      chloroplastRef.current.computeBoundingSphere()
    }
  }, [regularCells, chloroplasts])
  useEffect(() => () => { cellGeometry.dispose(); spongeGeometry.dispose(); lines.dispose(); cellMaterial.dispose() }, [cellGeometry, spongeGeometry, lines, cellMaterial])
  cellMaterial.opacity = opacity * .4
  return <group>
    <instancedMesh ref={cellRef} args={[cellGeometry, cellMaterial, regularCells.length]} />
    <mesh geometry={spongeGeometry} material={cellMaterial} />
    <lineSegments geometry={lines}>
      <lineBasicMaterial color="#c9c7a0" transparent opacity={opacity * .38} depthWrite={false} />
    </lineSegments>
    <instancedMesh ref={chloroplastRef} args={[undefined, undefined, chloroplasts.matrices.length]}>
      <sphereGeometry args={[1, mobile ? 7 : 10, 6]} />
      <meshStandardMaterial color="#91ad65" roughness={.78} transparent opacity={opacity} />
    </instancedMesh>
    <VascularBundle opacity={opacity} />
    <GuardCells opacity={opacity} />
    {/* Thin cuticle plates remain subtly reflective, never a cartoon border. */}
    {[58, -454].map((y) => <mesh key={y} position={[0, y, -30]}>
      <boxGeometry args={[1_115, 1.2, 106]} />
      <meshPhysicalMaterial color="#a8b692" roughness={.53} transparent opacity={opacity * .25} depthWrite={false} />
    </mesh>)}
  </group>
}

function VascularBundle({ opacity }: { opacity: number }) {
  const bundle = useMemo(() => {
    const random = seededLeafRandom(9911)
    return Array.from({length: 25}, (_, i) => {
      const radius = i === 0 ? 0 : 21 + 19 * Math.floor((i - 1) / 10)
      const angle = i * 2.399963
      return {x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, radius: 5 + random() * 4}
    })
  }, [])
  return <group position={[260, -190, -35]} rotation={[.15, -.3, -.05]}>
    <mesh scale={[1.15, .8, 1]}>
      <sphereGeometry args={[70, 32, 20]} />
      <meshPhysicalMaterial color="#8b9972" roughness={.8} transparent opacity={opacity * .12} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    {bundle.map((tube, i) => <group key={i} position={[tube.x, tube.y, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[tube.radius, tube.radius * .92, 106, 12, 1, true]} />
        <meshStandardMaterial color={tube.y > 0 ? '#a89b65' : '#6a8c74'} roughness={.77} transparent opacity={opacity * .52} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 54]}>
        <torusGeometry args={[tube.radius, .4, 5, 16]} />
        <meshStandardMaterial color="#c4bb8c" roughness={.75} transparent opacity={opacity * .8} />
      </mesh>
    </group>)}
  </group>
}

function GuardCells({ opacity }: { opacity: number }) {
  return <group>
    {[-108, 108].flatMap((x) => [-1, 1].map((side) => <mesh key={`${x}-${side}`} position={[x + side * 7.8, -441, 5]} rotation={[0, 0, side * .2]} scale={[5, 4.5, 14]}>
      <sphereGeometry args={[1, 16, 12]} />
      <meshPhysicalMaterial color="#78916a" roughness={.7} transparent opacity={opacity * .85} />
    </mesh>))}
  </group>
}
