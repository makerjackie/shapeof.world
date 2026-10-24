import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { SphereImpostorMaterial } from '~/components/experiences/SphereImpostorMaterial'
import { useExperienceI18n } from '~/i18n/experience'
import { isWorldPaused } from '~/lib/world-playback'
import { loadATPAtoms, loadMoleculeSurface, loadMetabolite, type MetaboliteData, type MetaboliteId } from './molecule-data'
import { MOLECULAR_ATP_ANCHOR_NM, advanceMotor, atomRadiusNm, createMotorState, getMolecularReadings, isRotorGroup, createAppressedPatch } from './molecular-model'
import { chloroplastRandom } from './chloro-model'
import { clusterMoleculeSurface } from './molecule-lod'

export { MOLECULAR_ATP_ANCHOR_NM } from './molecular-model'
type SurfaceData = Awaited<ReturnType<typeof loadMoleculeSurface>>
type AtomData = Awaited<ReturnType<typeof loadATPAtoms>>
type PDB = '3JCU' | '5L8R' | '6RQF' | '1RWT' | '8RUC' | '1AG6' | '1A70' | '1FNB' | '6FKF'
type Point = [number, number, number]
type Pose = { position: Point; rotation?: Point; scale?: number; phase?: number; zone?: string; layer?: number; lower?: boolean }
type Inspection = { pdb: PDB; position: Point; size: string; species: string }
const PDB_IDS: PDB[] = ['3JCU', '5L8R', '6RQF', '1RWT', '8RUC', '1AG6', '1A70', '1FNB', '6FKF']
const NAMES: Record<PDB, [string, string, string, string]> = {
  '3JCU': ['光系统 II · 捕光天线', 'Photosystem II–LHCII', '从水中取电子，释放氧气和质子', '等待光子'],
  '5L8R': ['光系统 I', 'Photosystem I–LHCI', '再次激发电子，交给铁氧还蛋白', '等待光子'],
  '6RQF': ['细胞色素 b₆f', 'Cytochrome b₆f', '传递电子，把质子积累到腔里', '电子流停止'],
  '1RWT': ['捕光复合物', 'LHCII trimer', '吸收光，把能量传给光系统 II', '等待光子'],
  '8RUC': ['RuBisCO', 'Ribulose-bisphosphate carboxylase', '在基质里固定二氧化碳', '碳固定减慢'],
  '1AG6': ['质体蓝素', 'Plastocyanin', '在腔里把电子送到光系统 I', '在腔内扩散'],
  '1A70': ['铁氧还蛋白（E92K 参照）', 'Ferredoxin', '把电子从光系统 I 交给 FNR', '在基质内扩散'],
  '1FNB': ['铁氧还蛋白 NADP⁺ 还原酶', 'Ferredoxin–NADP⁺ reductase', '用电子生成 NADPH', '电子流停止'],
  '6FKF': ['ATP 合酶', 'Chloroplast ATP synthase', '14 个质子转一圈，做出 3 个 ATP', 'γ 亚基的氧化还原开关锁住转子'],
}
function smooth(a: number, b: number, x: number) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const _dummy = new T.Object3D()

interface Props { opacity?: number; mobile?: boolean; light?: number; playing?: boolean; timeScale?: number; scale: number; capture?: boolean }

/** Every mesh is expressed in nm. The scene provides the 0.001 µm conversion. */
export function MolecularLayers({ opacity = 1, mobile = false, light = 400, playing = true, timeScale = 0.001, scale, capture = false }: Props) {
  const [surfaces, setSurfaces] = useState<Partial<Record<PDB, SurfaceData>>>({})
  const [atoms, setAtoms] = useState<AtomData | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [inspection, setInspection] = useState<Inspection | null>(null)
  const pinned = useRef(false)
  const tx = useExperienceI18n()
  const motor = useRef(createMotorState()), elapsed = useRef(0), root = useRef<T.Group>(null)
  const readings = getMolecularReadings(light, scale, timeScale, playing)
  const readingsRef = useRef(readings); readingsRef.current = readings
  const atomWeight = smooth(-7.12, -7.40, scale)
  const sectionCutNm = 220 * smooth(-6.38, -6.88, scale)
  const resourcesVisible = opacity > 0.002
  useEffect(() => {
    let mounted = true
    PDB_IDS.forEach((pdb) => { loadMoleculeSurface(pdb).then((data) => { if (mounted) setSurfaces((old) => ({ ...old, [pdb]: data })) }).catch(() => { if (mounted) setLoadError(true) }) })
    loadATPAtoms().then((data) => { if (mounted) setAtoms(data) }).catch(() => { if (mounted) setLoadError(true) })
    return () => { mounted = false }
  }, [])
  useEffect(() => { if (!resourcesVisible || capture) setInspection(null) }, [resourcesVisible, capture])
  useFrame(({ gl }, dt) => {
    const stopped = !playing || isWorldPaused() || document.hidden
    if (!stopped && resourcesVisible) {
      elapsed.current += Math.min(dt, 0.1)
      motor.current = advanceMotor(motor.current, Math.min(dt, 0.1), readingsRef.current.displayRps)
    }
    if (root.current) {
      root.current.userData.rotorAngle = motor.current.angle
      root.current.userData.protons = motor.current.protons
      root.current.userData.atp = motor.current.atp
      root.current.userData.actualRps = readingsRef.current.actualRps
      root.current.userData.displayRps = stopped ? 0 : readingsRef.current.displayRps
      root.current.userData.lumenNm = readingsRef.current.lumenNm
    }
    if (resourcesVisible) {
      gl.domElement.dataset.motorAngle = motor.current.angle.toFixed(5)
      gl.domElement.dataset.motorProtons = String(motor.current.protons)
      gl.domElement.dataset.motorAtp = String(motor.current.atp)
      gl.domElement.dataset.molecularReady = String(Object.keys(surfaces).length === PDB_IDS.length && !!atoms)
      gl.domElement.dataset.motorRps = String(readingsRef.current.actualRps)
      gl.domElement.dataset.membraneLumenNm = String(readingsRef.current.lumenNm)
    }
  })
  const inspect = (pdb: PDB, pose: Pose, metadata?: SurfaceData['metadata'], pin = false) => {
    pinned.current = pin
    if (capture) return
    const info = metadata as unknown as { spansNm?: number[]; organism?: string; species?: string }
    setInspection({ pdb, position: [pose.position[0], pose.position[1] + 13, pose.position[2]], size: info?.spansNm?.map((n) => n.toFixed(1)).join(' × ') ?? (pdb === '6FKF' ? '12 × 20 × 12' : '—'), species: info?.organism ?? info?.species ?? (pdb === '5L8R' ? 'Pisum sativum' : 'Spinacia oleracea') })
  }
  const dismiss = () => { if (!pinned.current) setInspection(null) }
  const channelAzimuth = useMemo(()=>{
    if(!atoms)return 0
    let x=0,z=0,count=0
    for(let i=0;i<atoms.groups.length;i++)if(atoms.groups[i]===4){x+=atoms.positions[i*3];z+=atoms.positions[i*3+2];count++}
    return count?Math.atan2(-z,x):0
  },[atoms])
  const bodies = useMemo(() => createProteinArrangement(mobile), [mobile])
  return <group onPointerMissed={()=>{pinned.current=false;setInspection(null)}} ref={root} name="plant-molecular-frame" visible={resourcesVisible} userData={{ units: 'nm', stromaAxis: '+Y', atomCount: atoms?.positions.length ? atoms.positions.length / 3 : 0 }}>
    <MembraneArchitecture opacity={opacity} light={light} mobile={mobile} scale={scale} />
    {PDB_IDS.filter((id) => id !== '6FKF').map((pdb) => surfaces[pdb] && <SurfacePopulation key={pdb} data={surfaces[pdb]!} pdb={pdb} poses={bodies[pdb]} opacity={opacity} elapsed={elapsed} light={light} inspect={inspect} dismiss={dismiss} sectionCutNm={sectionCutNm} />)}
    {surfaces['6FKF'] && <SurfacePopulation data={surfaces['6FKF']} pdb="6FKF" poses={bodies['6FKF']} opacity={opacity} elapsed={elapsed} light={light} inspect={inspect} dismiss={dismiss} sectionCutNm={sectionCutNm} />}
    <group position={MOLECULAR_ATP_ANCHOR_NM as unknown as Point}>
      {surfaces['6FKF'] && <ATPOverview motor={motor} data={surfaces['6FKF']} opacity={opacity * (1 - atomWeight)} inspect={() => inspect('6FKF', { position: [...MOLECULAR_ATP_ANCHOR_NM] }, surfaces['6FKF']!.metadata)} />}
      {atoms && <AtomicMotor data={atoms} opacity={opacity * atomWeight} motor={motor} light={light} inspect={() => inspect('6FKF', { position: [...MOLECULAR_ATP_ANCHOR_NM] }, surfaces['6FKF']?.metadata)} />}
      <MotorTraffic channelAzimuth={channelAzimuth} motor={motor} opacity={opacity * smooth(-6.95, -7.35, scale)} active={light > 0 && playing} />
    </group>
    <ElectronTraffic opacity={opacity * (1 - atomWeight * 0.8)} light={light} elapsed={elapsed} speed={Math.min(8, Math.max(0, timeScale / 0.001))} />
    {inspection && !capture && <Html position={inspection.position} zIndexRange={[20, 15]} center style={{ pointerEvents: 'none' }}>
      <div className="pc-molecular-label" style={{ width: mobile ? 190 : 225, color: '#e2decf', padding: '10px 12px', borderLeft: '1px solid #b8b39a77', background: '#0b1315ed', backdropFilter: 'blur(8px)', fontFamily: 'var(--font-sans, sans-serif)', fontSize: 11, lineHeight: 1.65, boxShadow: '0 10px 25px #0004' }} data-molecule-label={inspection.pdb}>
        <b style={{ display: 'block', fontSize: 13, fontWeight: 500 }}>{tx(NAMES[inspection.pdb][0])}</b><span style={{ color: '#aab8aa', display: 'block', fontSize: 10 }}>{NAMES[inspection.pdb][1]}</span>
        <span style={{ display: 'block', color: '#929e91', margin: '5px 0' }}>PDB {inspection.pdb} · {inspection.species}<br />{inspection.size} nm</span>
        <span>{tx(NAMES[inspection.pdb][light > 0 ? 2 : 3])}</span>
      </div>
      <div style={{ width: 1, height: 24, margin: '0 auto', background: '#c7d0b35c' }} />
    </Html>}
    {loadError && resourcesVisible && !capture && <Html position={[0, 30, 80]} center><span style={{ color: '#c9c5b5', fontSize: 12 }}>{tx('分子资源加载失败，请刷新重试。')}</span></Html>}
  </group>
}

function geometryFromData(data: SurfaceData) {
  const geometry = new T.BufferGeometry()
  geometry.setAttribute('position', new T.BufferAttribute(data.positions, 3))
  geometry.setAttribute('normal', new T.BufferAttribute(data.normals, 3))
  geometry.setAttribute('color', new T.BufferAttribute(data.colors, 3))
  geometry.setIndex(new T.BufferAttribute(data.indices, 1)); geometry.computeBoundingSphere()
  return geometry
}

function SurfacePopulation({ data, pdb, poses, opacity, elapsed, light, inspect, dismiss, sectionCutNm }: { data: SurfaceData; pdb: PDB; poses: Pose[]; opacity: number; elapsed: React.MutableRefObject<number>; light: number; inspect: (pdb: PDB, pose: Pose, metadata?: SurfaceData['metadata'], pin?: boolean) => void; dismiss: () => void; sectionCutNm: number }) {
  const ref = useRef<T.InstancedMesh>(null)
  const geometry = useMemo(() => geometryFromData(['3JCU', '1RWT', '6RQF', '8RUC', '5L8R'].includes(pdb) ? clusterMoleculeSurface(data) : data), [data, pdb])
  const diffuse = ['1AG6', '1A70'].includes(pdb)
  const cutoff = useMemo(() => ({ value: sectionCutNm }), []); cutoff.value = sectionCutNm
  const update = () => {
    if (!ref.current) return
    const t = elapsed.current
    poses.forEach((pose, i) => {
      _dummy.position.fromArray(pose.position)
      const dimensions = getMolecularReadings(light)
      if (pose.layer !== undefined) _dummy.position.y = pose.layer * dimensions.repeatNm - (pose.lower ? dimensions.lumenNm + dimensions.membraneNm : 0)
      if (pdb === '1AG6') _dummy.position.y = -(dimensions.lumenNm + dimensions.membraneNm) / 2
      if (diffuse) { _dummy.position.x += Math.sin(t * 0.45 + i * 2.7) * 2.2; _dummy.position.z += Math.cos(t * 0.32 + i * 2.3) * 2.2 }
      _dummy.rotation.set(...(pose.rotation ?? [0, 0, 0])); if (diffuse) _dummy.rotation.y += t * 0.27
      _dummy.scale.setScalar(pose.scale ?? 1); _dummy.updateMatrix(); ref.current!.setMatrixAt(i, _dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  }
  useLayoutEffect(update, [poses, data, light])
  useFrame(() => { if (diffuse) update() })
  useEffect(() => () => geometry.dispose(), [geometry])
  const pointer = (event: ThreeEvent<PointerEvent> | ThreeEvent<MouseEvent>) => {
    event.stopPropagation(); inspect(pdb, poses[event.instanceId ?? 0], data.metadata, event.type === 'click')
  }
  return <instancedMesh ref={ref} args={[geometry, undefined, poses.length]} frustumCulled={false} onPointerOver={pointer} onPointerOut={dismiss} onClick={pointer} name={`pdb-${pdb}`}>
    <meshStandardMaterial vertexColors color={light > 0 ? '#b8baa6' : '#62767b'} roughness={0.91} metalness={0} transparent opacity={opacity} depthWrite={opacity > 0.98} onBeforeCompile={(shader) => {
      shader.uniforms.sectionCutNm = cutoff
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 moleculePosition;').replace('#include <begin_vertex>', '#include <begin_vertex>\nmoleculePosition=(instanceMatrix*vec4(position,1.0)).xyz;')
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 moleculePosition;uniform float sectionCutNm;').replace('#include <alphatest_fragment>', 'if(moleculePosition.z>sectionCutNm)discard;\n#include <alphatest_fragment>')
    }} />
  </instancedMesh>
}

function ATPOverview({ data, opacity, motor, inspect }: { data: SurfaceData; opacity: number; motor: React.MutableRefObject<ReturnType<typeof createMotorState>>; inspect: () => void }) {
  const rotor=useRef<T.Mesh>(null)
  const geometries=useMemo(()=>{
    const copper=new T.Color('#c87f4f'),indices:[number[],number[]]=[[],[]]
    for(let i=0;i<data.indices.length;i+=3){let votes=0;for(let j=0;j<3;j++){const k=data.indices[i+j]*3;if(Math.hypot(data.colors[k]-copper.r,data.colors[k+1]-copper.g,data.colors[k+2]-copper.b)<.03)votes++}indices[votes>=2?0:1].push(...data.indices.slice(i,i+3))}
    return indices.map(index=>{const g=geometryFromData(data);g.setIndex(index);return g})
  },[data])
  useEffect(()=>()=>geometries.forEach(g=>g.dispose()),[geometries])
  useFrame(()=>{if(rotor.current)rotor.current.rotation.y=motor.current.angle})
  return <group visible={opacity>.002}>{geometries.map((geometry,i)=><mesh key={i} ref={i===0?rotor:undefined} geometry={geometry} onPointerOver={e=>{e.stopPropagation();inspect()}} onClick={e=>{e.stopPropagation();inspect()}}>
    <meshStandardMaterial vertexColors color="#cec7b6" roughness={.96} transparent opacity={opacity} depthWrite={opacity>.98}/>
  </mesh>)}</group>
}

/** Actual atomic coordinates; no representative or reduced atoms in L5.
 * Shared impostors measure their radius directly in view units. Instance
 * translations remain nm, while ONLY the basis vectors receive the changing
 * parent scale. Thus the shared material works in this floating-origin scene
 * without modifying it or baking the entire 39k-atom model every animation tick.
 */
function AtomicMotor({ data, opacity, motor, inspect, light }: { data: AtomData; opacity: number; light: number; motor: React.MutableRefObject<ReturnType<typeof createMotorState>>; inspect: () => void }) {
  const rotor = useRef<T.Group>(null)
  useFrame(() => { if (rotor.current) rotor.current.rotation.y = motor.current.angle })
  const ids = useMemo(() => {
    const lists = [[], []] as [number[], number[]]
    for (let i = 0; i < data.groups.length; i++) lists[isRotorGroup(data.groups[i]) ? 0 : 1].push(i)
    // Randomized reveal prevents a chain-by-chain flash during the surface handoff.
    const random = chloroplastRandom(609140)
    for (const list of lists) for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]] }
    return lists
  }, [data])
  return <group visible={opacity > 0.002} name="atp-heavy-atoms">
    <group ref={rotor} name="pc-atp-rotor"><AtomCloud data={data} indices={ids[0]} opacity={opacity} light={light} /></group>
    <group name="pc-atp-stator"><AtomCloud data={data} indices={ids[1]} opacity={opacity} light={light} /></group>
    <mesh position={[0, 6, 0]} onPointerOver={(e) => { e.stopPropagation(); inspect() }} onClick={(e) => { e.stopPropagation(); inspect() }}>
      <cylinderGeometry args={[6, 6, 22, 16]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  </group>
}

function AtomCloud({ data, indices, opacity, light }: { data: AtomData; indices: number[]; opacity: number; light: number }) {
  const ref = useRef<T.InstancedMesh>(null), lastScale = useRef(-1)
  const colors = useMemo(() => ['#c87f4f', '#d8cdb0', '#b9a882', '#8f9aa3', '#8f9aa3', '#95917b'].map((hex) => new T.Color(hex)), [])
  useLayoutEffect(() => {
    const mesh = ref.current; if (!mesh) return
    const material = mesh.material as T.ShaderMaterial
    if (!material.userData.plantMatte) {
      material.fragmentShader = material.fragmentShader.replace('gloss*0.65', 'gloss*0.055')
      material.userData.plantMatte = true; material.needsUpdate = true
    }
    indices.forEach((atom, i) => {
      const color = colors[data.groups[atom]]?.clone() ?? colors[5].clone()
      color.multiplyScalar((0.52 + 0.48 * (1 - data.occlusion[atom])) * (0.27 + 0.73 * Math.log1p(Math.max(0, light)) / Math.log1p(2000)))
      mesh.setColorAt(i, color)
    })
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    lastScale.current = -1
  }, [data, indices, colors, light])
  useFrame(() => {
    const mesh = ref.current; if (!mesh) return
    mesh.count = Math.round(indices.length * Math.max(0, Math.min(1, opacity)))
    mesh.updateWorldMatrix(true, false)
    const elements = mesh.matrixWorld.elements, worldScale = Math.hypot(elements[0], elements[1], elements[2])
    if (Math.abs(worldScale - lastScale.current) / Math.max(worldScale, 1e-9) < 0.00005) return
    lastScale.current = worldScale
    const matrix = new T.Matrix4()
    indices.forEach((atom, i) => {
      const radius = atomRadiusNm(data.elements[atom]) * worldScale
      matrix.makeScale(radius, radius, radius).setPosition(data.positions[atom * 3], data.positions[atom * 3 + 1], data.positions[atom * 3 + 2])
      mesh.setMatrixAt(i, matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[undefined, undefined, indices.length]} frustumCulled={false}>
    <planeGeometry args={[2, 2]} /><SphereImpostorMaterial />
  </instancedMesh>
}

function createProteinArrangement(mobile: boolean): Record<PDB, Pose[]> {
  const out = Object.fromEntries(PDB_IDS.map((id) => [id, []])) as unknown as Record<PDB, Pose[]>
  const random = chloroplastRandom(314159)
  // The exact sampled surface silhouettes occupy 69.5% of this patch,
  // with 2.9% projected overlap. See the independent rasterization test.
  const patch = createAppressedPatch()
  for (const layer of mobile ? [-1, 0] : [-1, 0, 1]) for (const lower of [false, true]) {
    for (const pdb of ['3JCU', '1RWT', '6RQF'] as const) for (const pose of patch[pdb]) {
      if (Math.hypot(pose.position[0], pose.position[2] + 136.3) > 225) continue
      out[pdb].push({ ...pose, position: [...pose.position], rotation: [lower ? Math.PI : 0, pose.rotation?.[1] ?? 0, 0], layer, lower })
    }
  }
  // A labelled electron-transfer lane and ATP synthases occupy unappressed
  // membrane around the actual rim; no bulky CF1 or PSI heads in 3.6 nm gaps.
  out['5L8R'].push({ position: [1, 0, 116], zone: 'lamella' }, { position: [-38, 0, 113], rotation: [0, 0.3, 0], zone: 'margin' }, { position: [62, 0, 112], rotation: [0, -0.7, 0], zone: 'margin' })
  out['6RQF'].push({ position: [-8, 0, 80], zone: 'margin' }, { position: [48, 0, 90], zone: 'margin' })
  out['6FKF'].push({ position: [-58, 0, 135], zone: 'lamella' }, { position: [68, 0, 142], rotation: [0, -0.9, 0], zone: 'lamella' })
  for (const layer of [-11, 10]) {
    const lower = layer < 0
    out['6FKF'].push({position: [-18, 0, 30], rotation: [lower ? Math.PI : 0, .4, 0], zone:'outer-face', layer, lower})
    out['5L8R'].push({position: [18, 0, 32], rotation: [lower ? Math.PI : 0, -.2, 0], zone:'outer-face', layer, lower})
  }
  for (let i = 0; i < (mobile ? 16 : 32); i++) out['1AG6'].push({ position: [(random() - 0.5) * 170, -6.4, -8 + random() * 145], rotation: [random() * 3, random() * 3, random() * 3] })
  for (let i = 0; i < 6; i++) out['1A70'].push({ position: [-8 + random() * 22, 12 + random() * 7, 107 + random() * 15], rotation: [0, random() * 3, 0] })
  out['1FNB'].push({ position: [14, 13, 110], rotation: [0.3, 0.5, 0.1] }, { position: [-29, 13, 115], rotation: [0.1, 1.1, 0] })
  for (let i = 0; i < (mobile ? 28 : 65); i++) {
    const x = (random() - 0.5) * 220, y = 25 + random() * 60, z = 105 + random() * 85
    if (Math.hypot(x - 28, y - 12, z - 116) < 34) continue
    out['8RUC'].push({ position: [x, y, z], rotation: [random() * 3, random() * 3, random() * 3] })
  }
  return out
}

/** Disk near its true edge, plus a single bilayer pair continuing into lamella.
 * A damped camera-facing aperture opens only the membrane near the selected
 * motor. Lipid headgroups keep their 0.7 nm diameter at every magnification.
 */
function MembraneArchitecture({ opacity, light, mobile, scale }: { opacity: number; light: number; mobile: boolean; scale: number }) {
  const root = useRef<T.Group>(null)
  const d = getMolecularReadings(light)
  const cut = useMemo(() => ({ plane: new T.Vector4(0, 0, 1, -122), direction: new T.Vector3(0, 0, 1), eye: new T.Vector3(), alpha: { value: opacity }, section: { value: 0 }, opening: { value: 0 }, focus: new T.Vector3(...MOLECULAR_ATP_ANCHOR_NM) }), [])
  cut.alpha.value = opacity; cut.section.value = 220 * smooth(-6.38, -6.88, scale); cut.opening.value = smooth(-7.05, -7.40, scale)
  useFrame(({ camera }, dt) => {
    if (!root.current) return
    root.current.updateWorldMatrix(true, false)
    root.current.worldToLocal(cut.eye.copy(camera.position)).sub(cut.focus)
    cut.eye.y = 0; cut.eye.normalize()
    cut.direction.lerp(cut.eye, 1 - Math.exp(-Math.min(dt, 0.05) * 6)).normalize()
    cut.plane.set(cut.direction.x, 0, cut.direction.z, -cut.direction.dot(cut.focus) - 1.7)
  })
  const materials = useMemo(() => {
    const material = (color: string, alpha: number, heads: boolean) => {
      const m = new T.MeshStandardMaterial({ color, roughness: 0.95, transparent: true, opacity: alpha, side: T.DoubleSide, depthWrite: false, forceSinglePass: true })
      m.onBeforeCompile = (shader) => {
        shader.uniforms.molecularAlpha = cut.alpha; shader.uniforms.sectionCutNm = cut.section; shader.uniforms.molecularCut = { value: cut.plane }; shader.uniforms.molecularOpening = cut.opening
        shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 membranePosition;').replace('#include <begin_vertex>', '#include <begin_vertex>\nmembranePosition=(instanceMatrix*vec4(position,1.0)).xyz;')
        shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 membranePosition;uniform vec4 molecularCut;uniform float molecularOpening;uniform float molecularAlpha;uniform float sectionCutNm;')
          .replace('#include <alphatest_fragment>', `if(membranePosition.z>sectionCutNm)discard;float nearSide=dot(vec4(membranePosition,1.0),molecularCut);float radius=distance(membranePosition.xz,vec2(28.0,116.0));if(nearSide>0.0&&radius<24.0*molecularOpening)discard;diffuseColor.a*=molecularAlpha;${heads ? '' : 'float grain=fract(sin(dot(floor(membranePosition*1.8),vec3(12.9898,78.233,43.21)))*43758.5453);diffuseColor.rgb*=.89+.15*grain;'}\n#include <alphatest_fragment>`)
      }
      return m
    }
    return { core: material('#283a32', 0.8, false), heads: material('#899676', 0.68, true), lumen: material('#996743', 0.015, false) }
  }, [cut])
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials])
  const cylinders = useMemo(() => new T.CylinderGeometry(235, 235, 1, mobile ? 72 : 112), [mobile])
  const lamellaGeometry = useMemo(() => new T.BoxGeometry(1, 1, 1), [])
  const headGeometry = useMemo(() => new T.IcosahedronGeometry(0.36, 0), [])
  const layers = useMemo(() => Array.from({ length: 22 }, (_, i) => i - 11), [])
  const membraneInstances: Pose[] = [], lamellaInstances: Pose[] = []
  for (const layer of layers) for (const side of [0, -1]) membraneInstances.push({ position: [0, layer * d.repeatNm + side * (d.lumenNm + d.membraneNm), -136.3], scale: 1 })
  for (const side of [0, -1]) lamellaInstances.push({ position: [10, side * (d.lumenNm + d.membraneNm), 122], scale: 1 })
  const heads = useMemo(() => {
    const points: Pose[] = [], random = chloroplastRandom(631)
    // Resolve individual headgroups around the motor, a stippled surface farther
    // away. This sampling is a display LOD, not a claim about lipid areal density.
    const step = mobile ? 1.8 : 1.4
    for (let x = -79; x <= 95; x += step) for (let z = 79; z <= 164; z += step) {
      if (Math.abs(x) > 75 && z > 145) continue
      if (Math.hypot(x - 28, z - 116) < 5.5) continue
      for (const lower of [0, 1]) for (const side of [-1, 1]) points.push({ position: [x + random() * .25, -lower*(d.lumenNm+d.membraneNm)+side*d.membraneNm/2, z + random() * .25] })
    }
    return points
  }, [mobile, d.membraneNm, d.lumenNm])
  useEffect(() => () => { cylinders.dispose(); lamellaGeometry.dispose(); headGeometry.dispose() }, [cylinders, lamellaGeometry, headGeometry])
  return <group ref={root} name="paired-lipid-bilayers">
    <StaticInstances geometry={cylinders} material={materials.core} poses={membraneInstances} scaling={[1, d.membraneNm, 1]} />
    <StaticInstances geometry={lamellaGeometry} material={materials.core} poses={lamellaInstances} scaling={[170, d.membraneNm, 88]} />
    <StaticInstances geometry={headGeometry} material={materials.heads} poses={heads} />
  </group>
}

function StaticInstances({ geometry, material, poses, scaling = [1, 1, 1] }: { geometry: T.BufferGeometry; material: T.Material; poses: Pose[]; scaling?: Point }) {
  const ref = useRef<T.InstancedMesh>(null)
  useLayoutEffect(() => {
    if (!ref.current) return
    poses.forEach((pose, i) => { _dummy.position.fromArray(pose.position); _dummy.rotation.set(...(pose.rotation ?? [0, 0, 0])); _dummy.scale.fromArray(scaling).multiplyScalar(pose.scale ?? 1); _dummy.updateMatrix(); ref.current!.setMatrixAt(i, _dummy.matrix) })
    ref.current.instanceMatrix.needsUpdate = true
  }, [poses, scaling])
  return <instancedMesh ref={ref} args={[geometry, material, poses.length]} frustumCulled={false} />
}

function ElectronTraffic({ opacity, light, elapsed, speed }: { opacity: number; light: number; elapsed: React.MutableRefObject<number>; speed: number }) {
  const electrons = useRef<T.InstancedMesh>(null), protons = useRef<T.InstancedMesh>(null), oxygen = useRef<T.InstancedMesh>(null)
  const chain = useMemo(() => [new T.Vector3(-21.5, -5, 26.5), new T.Vector3(-21.5, 0, 26.5), new T.Vector3(-12, 0, 57), new T.Vector3(-8, 0, 80), new T.Vector3(-4, -6, 100), new T.Vector3(1, 0, 116), new T.Vector3(7, 13, 115), new T.Vector3(14, 13, 110), new T.Vector3(19, 18, 109)], [])
  const protonSeeds = useMemo(() => { const r = chloroplastRandom(771); return Array.from({ length: 100 }, () => [(r() - .5) * 160, r(), r() * 140] as Point) }, [])
  const protonGlow = useRef(0)
  useFrame((_, dt) => {
    protonGlow.current = T.MathUtils.damp(protonGlow.current, light > 0 ? 1 : 0, 1.3, Math.min(dt, .1))
    const t = elapsed.current * speed
    if (electrons.current) {
      electrons.current.visible = light > 0 && opacity > .001
      for (let i = 0; i < 5; i++) {
        const step = ((t * 1.1 + i * 1.7) % 8 + 8) % 8, index = Math.floor(step), f = step - index
        _dummy.position.copy(chain[index]).lerp(chain[index + 1], smooth(.25, .8, f)); _dummy.rotation.set(0, 0, 0); _dummy.scale.setScalar(.5); _dummy.updateMatrix(); electrons.current.setMatrixAt(i, _dummy.matrix)
      }
      electrons.current.instanceMatrix.needsUpdate = true
    }
    if (protons.current) {
      protons.current.count = Math.round(100 * protonGlow.current)
      const lumen = getMolecularReadings(light).lumenNm
      protonSeeds.forEach((seed, i) => { _dummy.position.set(seed[0] + Math.sin(t * .4 + i) * 2, -2.4 - seed[1] * Math.max(1, lumen - 1), seed[2] + Math.cos(t * .3 + i) * 2); _dummy.scale.setScalar(.24 + .1 * Math.sin(i)); _dummy.updateMatrix(); protons.current!.setMatrixAt(i, _dummy.matrix) })
      protons.current.instanceMatrix.needsUpdate = true
    }
    if (oxygen.current) {
      oxygen.current.visible = light > 0
      for (let i = 0; i < 4; i++) { const f = (t * .12 + i * .25) % 1; _dummy.position.set(-21.5 + Math.sin(i * 2.4) * f * 6, -5 - f * 3, 26.5 + f * 15); _dummy.scale.set(.7, .45, .45); _dummy.updateMatrix(); oxygen.current.setMatrixAt(i, _dummy.matrix) }
      oxygen.current.instanceMatrix.needsUpdate = true
    }
  })
  return <group>
    <mesh position={[-12,0,57]}><sphereGeometry args={[.65,12,8]}/><meshStandardMaterial color="#a5aa78" roughness={1} transparent opacity={opacity*.8}/></mesh>
    <mesh position={[19,18,109]} visible={light>0}><sphereGeometry args={[.8,12,8]}/><meshStandardMaterial color="#c8be91" roughness={1} transparent opacity={opacity*.7}/></mesh>
    <instancedMesh ref={electrons} args={[undefined, undefined, 5]} frustumCulled={false}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color="#e9dba7" transparent opacity={opacity * .85} /></instancedMesh>
    <instancedMesh ref={protons} args={[undefined, undefined, 100]} frustumCulled={false}><sphereGeometry args={[1, 6, 4]} /><meshBasicMaterial color="#ca8c60" transparent opacity={opacity * .6} depthWrite={false} /></instancedMesh>
    <instancedMesh ref={oxygen} args={[undefined, undefined, 4]} frustumCulled={false}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color="#9dadaf" roughness={1} transparent opacity={opacity * .5} /></instancedMesh>
  </group>
}

/** Proton route: lumen half-channel → c14 circumference → stromal exit.
 * ATP particles leave three catalytic sites in sequence. ATP, ADP and phosphate
 * use CCD ideal coordinates; half-channel routes and binding states are schematic.
 */
function MotorTraffic({ motor, opacity, active, channelAzimuth }: { channelAzimuth: number; motor: React.MutableRefObject<ReturnType<typeof createMotorState>>; opacity: number; active: boolean }) {
  const protons = useRef<T.InstancedMesh>(null), products = useRef<T.Group[]>([]), substrates = useRef<T.Group[]>([])
  useFrame(() => {
    const turns = motor.current.revolutions
    if (protons.current) {
      for (let i = 0; i < 14; i++) {
        const cycle = ((turns + i / 14) % 1 + 1) % 1
        const angle = channelAzimuth + cycle * Math.PI * 2
        const entrance = smooth(0, .1, cycle), exit = smooth(.9, 1, cycle)
        _dummy.position.set(Math.cos(angle) * 4.6, -3.8 * (1 - entrance) + exit * 5, -Math.sin(angle) * 4.6)
        _dummy.scale.setScalar(.2); _dummy.updateMatrix(); protons.current.setMatrixAt(i, _dummy.matrix)
      }
      protons.current.instanceMatrix.needsUpdate = true
    }
    for (let i = 0; i < 3; i++) {
      const group = products.current[i]; if (!group) continue
      const progress = ((turns * 3 - i) % 3 + 3) % 3
      const angle = i * Math.PI * 2 / 3 + .4
      group.visible = active && progress < .85
      group.position.set(Math.cos(angle) * (5 + progress * 7), 12 + progress * 5, -Math.sin(angle) * (5 + progress * 7))
      group.scale.setScalar(.65 * (1 - progress * .25)); group.rotation.set(progress, angle, .4)
    }
    for (let i = 0; i < 6; i++) {
      const group = substrates.current[i]; if (!group) continue
      const a = Math.floor(i / 2) * Math.PI * 2 / 3 + .4, f = ((turns * 3 + i * .33) % 1 + 1) % 1
      group.position.set(Math.cos(a) * (11 - f * 6), 15 - f * 3, -Math.sin(a) * (11 - f * 6))
      group.rotation.set(.3, a, f); group.visible = active
    }
  })
  return <group visible={opacity > .001}>
    <instancedMesh ref={protons} args={[undefined, undefined, 14]} frustumCulled={false}><sphereGeometry args={[1, 12, 8]} /><meshBasicMaterial color="#e2a16a" transparent opacity={opacity * (active ? .95 : .2)} /></instancedMesh>
    {Array.from({length:6},(_,i)=><group key={i} ref={node=>{if(node)substrates.current[i]=node}}><NucleotideMarker id={i%2?'PO4':'ADP'} opacity={opacity}/></group>)}
    {[0, 1, 2].map((site) => <group key={site} ref={(node) => { if (node) products.current[site] = node }}><NucleotideMarker id="ATP" opacity={opacity} /></group>)}
  </group>
}

/** Ball-and-stick geometry from the PDB Chemical Component Dictionary. */
function NucleotideMarker({ id, opacity }: { id: MetaboliteId; opacity: number }) {
  const [data,setData] = useState<MetaboliteData|null>(null)
  useEffect(()=>{let live=true;loadMetabolite(id).then(d=>{if(live)setData(d)}).catch(()=>{});return()=>{live=false}},[id])
  const geometry=useMemo(()=>{
    if(!data)return null
    const parts:T.BufferGeometry[]=[], y=new T.Vector3(0,1,0)
    const colorize=(g:T.BufferGeometry,color:string)=>{const c=new T.Color(color),a=new Float32Array(g.getAttribute('position').count*3);for(let i=0;i<a.length;i+=3)c.toArray(a,i);g.setAttribute('color',new T.BufferAttribute(a,3));parts.push(g)}
    const points=data.elements.map((_,i)=>new T.Vector3(...data.positions.slice(i*3,i*3+3) as Point))
    data.elements.forEach((element,i)=>{const g=new T.SphereGeometry(atomRadiusNm(element)*.55,8,6);g.translate(...points[i].toArray());colorize(g,element===15?'#c4b57b':element===8?'#b48d75':element===7?'#8faaa9':'#c8c5ad')})
    data.bonds.forEach(([a,b])=>{const d=points[b].clone().sub(points[a]),g=new T.CylinderGeometry(.025,.025,d.length(),5);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(y,d.normalize()));g.translate(...points[a].clone().add(points[b]).multiplyScalar(.5).toArray());colorize(g,'#8c9c91')})
    const merged=mergeGeometries(parts);parts.forEach(g=>g.dispose());return merged
  },[data])
  useEffect(()=>()=>geometry?.dispose(),[geometry])
  return geometry?<mesh geometry={geometry}><meshStandardMaterial vertexColors roughness={1} transparent opacity={opacity}/></mesh>:null
}
