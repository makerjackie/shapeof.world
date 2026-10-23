import {useEffect, useRef} from 'react'
import * as T from 'three'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js'
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js'
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js'
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import {SMAAPass} from 'three/examples/jsm/postprocessing/SMAAPass.js'
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js'
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js'
import {PARTS, MATERIALS, type Part} from './parts'
import {sampleTimeline} from './model'
import {createMicroScene} from './micro-scene'

export type SceneAnchor = {id: string; x: number; y: number; visible: boolean}
type Props = {
  explode: number
  cutAngle: 0 | 90 | 180
  selectedPart: string | null
  onSelectPart: (id: string | null) => void
  time: number
  micro: boolean
  autoCamera?: boolean
  onAnchors: (anchors: SceneAnchor[]) => void
  onInteract?: () => void
  onError?: (message: string) => void
  reducedMotion?: boolean
}

const cutVertex = `varying vec2 sectionUv;
void main(){ sectionUv=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`
const cutFragment = `
uniform vec3 ink; uniform float pattern; uniform float alpha; varying vec2 sectionUv;
float line(float v){float d=abs(fract(v)-.5); return 1.-smoothstep(.026,.026+fwidth(v),d);}
void main(){
  vec2 p=sectionUv*32.; float hatch=0.;
  if(pattern<1.5 && pattern>.5) hatch=line((p.x+p.y)*.7071);
  if(pattern>1.5 && pattern<2.5){vec2 q=fract(p*.7)-.5; float d=length(q); hatch=1.-smoothstep(.07,.07+fwidth(d),d);}
  if(pattern>2.5 && pattern<3.5) hatch=line(p.y);
  if(pattern>3.5) hatch=max(line((p.x+p.y)*.7071),line((p.x-p.y)*.7071));
  gl_FragColor=vec4(ink*(1.-hatch*.38),alpha);
}`

function sectionMaterial(part: Part) {
  const palette = MATERIALS[part.material]
  return new T.ShaderMaterial({
    uniforms: {ink: {value: new T.Color(palette.cut)}, pattern: {value: palette.hatch}, alpha: {value: 1}},
    vertexShader: cutVertex, fragmentShader: cutFragment, side: T.DoubleSide,
  })
}

type Section = {group: T.Group; part: Part; displacement: T.Vector3; surfaces: T.MeshStandardMaterial[]; cuts: T.ShaderMaterial[]}

/** All meridians and their closure faces use exactly the same display profile. */
function createAssembly(angle: number) {
  const group = new T.Group()
  const sections: Section[] = []
  const pickers: T.Mesh[] = []
  const cut = T.MathUtils.degToRad(angle)
  const start = cut / 2
  const length = Math.PI * 2 - cut
  for (const part of PARTS) {
    const palette = MATERIALS[part.material]
    for (const profile of part.profiles) {
      const half = new T.Group()
      half.scale.fromArray(part.scale)
      const points = profile.points.map(([r, z]) => new T.Vector2(r, z))
      const geometry = new T.LatheGeometry(points, 128, start, length)
      const material = new T.MeshStandardMaterial({
        color: palette.surface, metalness: palette.metalness, roughness: palette.roughness,
        side: T.DoubleSide, envMapIntensity: 0.38,
        emissive: part.id === 'source' ? '#f2d48a' : '#000000',
        emissiveIntensity: part.id === 'source' ? 0.32 : 0,
      })
      // A faint procedural finish, with no external model or texture assets.
      if (part.id === 'casing') {
        material.onBeforeCompile = (shader) => {
          shader.vertexShader = 'varying vec3 finishPosition;\n' + shader.vertexShader
          shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nfinishPosition=position;')
          shader.fragmentShader = 'varying vec3 finishPosition;\n' + shader.fragmentShader
          shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\nfloat grain=fract(sin(dot(floor(finishPosition*220.),vec3(12.9898,78.233,37.719)))*43758.5453);diffuseColor.rgb*=.96+.08*grain;')
        }
      }
      const surface = new T.Mesh(geometry, material)
      surface.castShadow = true
      surface.receiveShadow = true
      surface.userData.partId = part.id
      half.add(surface)
      pickers.push(surface)
      const cuts: T.ShaderMaterial[] = []
      if (angle > 0) {
        const shape = new T.Shape(points)
        for (const phi of [start, start + length]) {
          const section = sectionMaterial(part)
          const face = new T.Mesh(new T.ShapeGeometry(shape, 48), section)
          face.rotation.y = phi - Math.PI / 2
          face.userData.partId = part.id
          half.add(face)
          pickers.push(face)
          cuts.push(section)
          // Delicate material boundary: no measurements, ticks or construction marks.
          const outline = new T.LineLoop(
            new T.BufferGeometry().setFromPoints(points.map((p) => new T.Vector3(p.x, p.y, 0))),
            new T.LineBasicMaterial({color: palette.cut, transparent: true, opacity: 0.35}),
          )
          outline.rotation.y = face.rotation.y
          half.add(outline)
        }
      }
      group.add(half)
      sections.push({group: half, part, displacement: new T.Vector3().fromArray(profile.displacement), surfaces: [material], cuts})
    }
  }

  // Simplified box tail, away from the cutaway. Its proportions are only a silhouette.
  const tail = new T.Group()
  const tailMat = new T.MeshStandardMaterial({color: '#565a50', metalness: 0.5, roughness: 0.55, envMapIntensity: 0.32})
  const tailParts: T.Mesh[] = []
  const box = (x: number, y: number, z: number, w: number, h: number, d: number) => {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), tailMat)
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.userData.partId = 'casing'
    tail.add(mesh)
    tailParts.push(mesh)
    pickers.push(mesh)
  }
  for (const side of [-1, 1]) {
    box(side * 0.83, 0, -4.1, 0.055, 1.7, 1.55)
    box(0, side * 0.83, -4.1, 1.7, 0.055, 1.55)
  }
  box(0, 0, -3.5, 0.045, 1.65, 1.9)
  box(0, 0, -3.5, 1.65, 0.045, 1.9)
  group.add(tail)
  return {group, sections, pickers, tail, tailMat, tailParts}
}

function disposeGroup(group: T.Group | T.Scene) {
  const geometries = new Set<T.BufferGeometry>()
  const materials = new Set<T.Material>()
  group.traverse((item) => {
    if (item instanceof T.Mesh || item instanceof T.Line || item instanceof T.Points) {
      geometries.add(item.geometry)
      for (const material of Array.isArray(item.material) ? item.material : [item.material]) materials.add(material)
    }
  })
  geometries.forEach((item) => item.dispose())
  materials.forEach((item) => item.dispose())
}

function createWave(angle: number) {
  const group = new T.Group()
  const material = new T.MeshBasicMaterial({
    color: new T.Color('#ffd9a0').multiplyScalar(2.7),
    transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false,
  })
  const points: T.Vector2[] = []
  for (let i = 0; i <= 96; i++) {
    const a = -Math.PI / 2 + i / 96 * Math.PI
    points.push(new T.Vector2(Math.cos(a) * 1.009, Math.sin(a) * 1.009))
  }
  for (let i = 96; i >= 0; i--) {
    const a = -Math.PI / 2 + i / 96 * Math.PI
    points.push(new T.Vector2(Math.cos(a) * 0.991, Math.sin(a) * 0.991))
  }
  const halfCut = T.MathUtils.degToRad(angle / 2)
  const geometry = new T.ShapeGeometry(new T.Shape(points))
  // The light lives on the exposed section, never across the empty removed wedge.
  for (const phi of [halfCut, -halfCut]) {
    const face = new T.Mesh(geometry, material)
    face.rotation.y = phi - Math.PI / 2
    face.position.set(-Math.cos(phi) * Math.sign(phi) * 0.003, 0, Math.sin(phi) * Math.sign(phi) * 0.003)
    group.add(face)
  }
  return {group, material}
}

export function NuclearScene(props: Props) {
  const host = useRef<HTMLDivElement>(null)
  const latest = useRef(props)
  latest.current = props

  useEffect(() => {
    const element = host.current
    if (!element) return
    let renderer: T.WebGLRenderer
    try {
      renderer = new T.WebGLRenderer({antialias: false, alpha: false, powerPreference: 'high-performance'})
    } catch {
      latest.current.onError?.('webgl-unavailable')
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 700 ? 1.5 : 2))
    renderer.setClearColor('#0a0a0b')
    renderer.outputColorSpace = T.SRGBColorSpace
    renderer.toneMapping = T.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.95
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = T.PCFSoftShadowMap
    element.appendChild(renderer.domElement)
    renderer.domElement.setAttribute('aria-hidden', 'true')
    const scene = new T.Scene()
    scene.fog = new T.Fog('#0a0a0b', 20, 46)
    const camera = new T.PerspectiveCamera(36, 1, 0.05, 120)
    const macroPosition = new T.Vector3(10, 5.3, 13.6)
    const macroTarget = new T.Vector3(0, -1.05, 0)
    camera.position.copy(macroPosition)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.copy(macroTarget)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enablePan = false
    controls.minDistance = 5
    controls.maxDistance = 27
    controls.maxPolarAngle = Math.PI * 0.8
    controls.autoRotateSpeed = 2 / 3
    controls.update()

    const pmrem = new T.PMREMGenerator(renderer)
    const room = new RoomEnvironment()
    const env = pmrem.fromScene(room, 0.04)
    scene.environment = env.texture
    scene.environmentIntensity = 0.28
    room.dispose()
    pmrem.dispose()
    scene.add(new T.HemisphereLight('#b9c4d5', '#23190f', 0.42))
    const key = new T.SpotLight('#ffe2c0', 180, 38, Math.PI / 5.3, 0.7, 2)
    key.position.set(-5, 9, 6)
    key.target.position.set(0, -2, 0)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.bias = -0.00035
    key.shadow.normalBias = 0.035
    key.shadow.radius = 4
    scene.add(key, key.target)
    const rim = new T.DirectionalLight('#9db4d6', 2.1)
    rim.position.set(4, 2, -5)
    scene.add(rim)
    const fill = new T.DirectionalLight('#ffe2c0', 0.7)
    fill.position.set(-2, 2, 6)
    scene.add(fill)

    const exhibition = new T.Group()
    const floor = new T.Mesh(new T.PlaneGeometry(1000, 1000), new T.MeshStandardMaterial({color: '#0a0a0b', metalness: 0.02, roughness: 0.96}))
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -4.23
    floor.receiveShadow = true
    exhibition.add(floor)
    const platform = new T.Mesh(new T.CylinderGeometry(3.45, 3.5, 0.22, 160), new T.MeshStandardMaterial({color: '#111214', metalness: 0.25, roughness: 0.6}))
    platform.position.y = -4.1
    platform.receiveShadow = true
    exhibition.add(platform)
    const ring = new T.Mesh(new T.RingGeometry(3.27, 3.286, 160), new T.MeshBasicMaterial({color: '#b49a6a', transparent: true, opacity: 0.3, side: T.DoubleSide}))
    ring.rotation.x = -Math.PI / 2
    ring.position.y = -3.984
    exhibition.add(ring)
    // A soft contact patch grounds the floating, separated display pieces.
    const contact = new T.Mesh(new T.PlaneGeometry(6, 6), new T.ShaderMaterial({
      transparent: true, depthWrite: false,
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying vec2 vUv;void main(){float a=exp(-dot((vUv-.5)*4.,(vUv-.5)*4.));gl_FragColor=vec4(0.,0.,0.,a*.6);}',
    }))
    contact.rotation.x = -Math.PI / 2
    contact.position.y = -3.98
    exhibition.add(contact)
    scene.add(exhibition)
    let angle = latest.current.cutAngle
    let assembly = createAssembly(angle)
    scene.add(assembly.group)
    let wave = createWave(angle)
    scene.add(wave.group)

    const micro = createMicroScene()
    scene.add(micro.group)
    micro.group.visible = false
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const bloom = new UnrealBloomPass(new T.Vector2(1, 1), 0.22, 0.45, 1.8)
    composer.addPass(bloom)
    const vignette = new ShaderPass({
      uniforms: {tDiffuse: {value: null}, strength: {value: 0.18}},
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform sampler2D tDiffuse;uniform float strength;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);vec2 p=(vUv-.5)*1.4;c.rgb*=1.-strength*dot(p,p);gl_FragColor=c;}',
    })
    composer.addPass(vignette)
    const smaa = new SMAAPass()
    composer.addPass(smaa)
    composer.addPass(new OutputPass())

    let width = 1
    let height = 1
    let userOrbit = false
    let lastInteraction = performance.now() - 3000
    let wasMicro = false
    const savedPosition = new T.Vector3()
    const savedTarget = new T.Vector3()
    const approachPosition = new T.Vector3()
    const approachTarget = new T.Vector3()
    let approaching = false
    const resize = () => {
      width = element.clientWidth
      height = element.clientHeight
      renderer.setSize(width, height)
      composer.setSize(width, height)
      camera.aspect = width / height
      camera.fov = width < 700 ? 48 : 36
      // Preserve room for controls and the schematic caption on narrow displays.
      if (!userOrbit && !latest.current.micro) {
        camera.position.copy(macroPosition).multiplyScalar(width < 700 ? 1.1 : 1)
        controls.target.copy(macroTarget)
      }
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    resize()
    const interacted = () => {
      userOrbit = true
      lastInteraction = performance.now()
      latest.current.onInteract?.()
    }
    controls.addEventListener('start', interacted)
    controls.addEventListener('end', () => {lastInteraction = performance.now()})
    const raycaster = new T.Raycaster()
    const pointer = new T.Vector2()
    let down = {x: 0, y: 0}
    const pointerDown = (event: PointerEvent) => {down = {x: event.clientX, y: event.clientY}}
    const pointerUp = (event: PointerEvent) => {
      if (latest.current.micro || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5) return
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.set((event.clientX - rect.left) / width * 2 - 1, 1 - (event.clientY - rect.top) / height * 2)
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(assembly.pickers)[0]
      if (hit) latest.current.onSelectPart(hit.object.userData.partId)
    }
    const lost = (event: Event) => {event.preventDefault(); latest.current.onError?.('webgl-lost')}
    renderer.domElement.addEventListener('pointerdown', pointerDown)
    renderer.domElement.addEventListener('pointerup', pointerUp)
    renderer.domElement.addEventListener('webglcontextlost', lost)
    let raf = 0
    let previous = performance.now()
    let lastLabels = 0
    const projected = new T.Vector3()
    const animate = (now: number) => {
      const state = latest.current
      const dt = Math.min((now - previous) / 1000, 0.1)
      previous = now
      if (angle !== state.cutAngle) {
        scene.remove(assembly.group)
        disposeGroup(assembly.group)
        angle = state.cutAngle
        assembly = createAssembly(angle)
        scene.add(assembly.group)
        scene.remove(wave.group)
        disposeGroup(wave.group)
        wave = createWave(angle)
        scene.add(wave.group)
      }
      const frame = sampleTimeline(state.time)
      const displayExplode = state.explode * (1 - T.MathUtils.smoothstep(state.time, -3, -2))
      const isMicro = state.micro
      if (isMicro !== wasMicro) {
        if (isMicro) {
          savedPosition.copy(approaching ? approachPosition : camera.position)
          savedTarget.copy(approaching ? approachTarget : controls.target)
        } else {
          camera.position.copy(savedPosition)
          controls.target.copy(savedTarget)
        }
        wasMicro = isMicro
      }
      controls.enabled = !isMicro
      controls.autoRotate = !isMicro && !state.reducedMotion && state.time <= -3 && now - lastInteraction > 6000
      const approach = !isMicro && state.autoCamera && state.time > -0.5 && state.time < 0
      if (approach) {
        if (!approaching) {
          approachPosition.copy(camera.position)
          approachTarget.copy(controls.target)
        }
        const amount = T.MathUtils.smoothstep(state.time, -0.5, 0)
        camera.position.copy(approachPosition).lerp(new T.Vector3(0, 0, 0.7), amount)
        controls.target.copy(approachTarget).lerp(new T.Vector3(), amount)
        camera.lookAt(controls.target)
        approaching = true
      } else if (!isMicro) {
        if (approaching) {
          camera.position.copy(approachPosition)
          controls.target.copy(approachTarget)
        }
        approaching = false
        controls.update(dt)
      }
      else {
        // The transition is part of the timeline, so scrubbing reverses the camera too.
        const transition = T.MathUtils.smoothstep(state.time, 0, 10)
        camera.position.set(0, 0, 10.6 + (1 - transition) * 3)
        camera.lookAt(0, 0, 0)
      }
      assembly.group.visible = !isMicro
      exhibition.visible = !isMicro
      micro.group.visible = isMicro
      scene.background = isMicro ? new T.Color('#080609') : null
      vignette.uniforms.strength.value = isMicro ? 0.1 : 0.18
      if (isMicro) micro.update(state.time)
      for (const section of assembly.sections) {
        const {part, group} = section
        group.position.copy(section.displacement).multiplyScalar(displayExplode)
        const compression = ['pusher', 'reflector', 'core'].includes(part.id) ? 1 - frame.compression * 0.16 : 1
        group.scale.set(part.scale[0] * compression, part.scale[1] * compression, part.scale[2] * compression)
        const faded = Boolean(state.selectedPart && state.selectedPart !== part.id)
        const opacity = faded ? 0.15 : 1
        for (const material of section.surfaces) {
          material.transparent = faded
          material.opacity = opacity
          material.depthWrite = !faded
          if (part.id === 'source') material.emissiveIntensity = 0.32 + frame.sourceFlash * 5
        }
        for (const material of section.cuts) {
          material.uniforms.alpha.value = opacity
          material.transparent = faded
          material.depthWrite = !faded
        }
        group.children.forEach((child) => {
          if (child instanceof T.Line) (child.material as T.LineBasicMaterial).opacity = faded ? 0.05 : 0.35
        })
      }
      assembly.tail.position.y = displayExplode * 1.6
      assembly.tailMat.opacity = state.selectedPart && state.selectedPart !== 'casing' ? 0.15 : 1
      assembly.tailMat.transparent = assembly.tailMat.opacity < 1
      assembly.tailMat.depthWrite = assembly.tailMat.opacity === 1
      wave.group.visible = !isMicro && angle > 0 && frame.waveProgress > 0 && frame.waveProgress < 1
      wave.group.scale.setScalar(T.MathUtils.lerp(1.95, 1.65, frame.waveProgress))
      wave.material.opacity = wave.group.visible ? Math.sin(frame.waveProgress * Math.PI) * 0.85 : 0
      if (!isMicro && now - lastLabels > 65) {
        lastLabels = now
        camera.updateMatrixWorld()
        latest.current.onAnchors(PARTS.map((part) => {
          projected.fromArray(part.anchor)
          const radius = Math.hypot(projected.x, projected.z / part.scale[2])
          const phi = (part.anchor[0] < 0 ? -1 : 1) * T.MathUtils.degToRad(state.cutAngle / 2)
          projected.x = Math.sin(phi) * radius
          projected.z = Math.cos(phi) * radius * part.scale[2]
          if (['pusher', 'reflector', 'core'].includes(part.id)) projected.multiplyScalar(1 - frame.compression * 0.16)
          const half = part.anchor[1] >= 0 ? 0 : 1
          projected.y += part.profiles[half].displacement[1] * displayExplode
          projected.project(camera)
          return {id: part.id, x: (projected.x + 1) / 2 * width, y: (1 - projected.y) / 2 * height, visible: projected.z < 1}
        }))
      }
      composer.render()
      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      controls.dispose()
      renderer.domElement.removeEventListener('pointerdown', pointerDown)
      renderer.domElement.removeEventListener('pointerup', pointerUp)
      renderer.domElement.removeEventListener('webglcontextlost', lost)
      scene.remove(micro.group)
      micro.dispose()
      disposeGroup(scene)
      env.dispose()
      composer.passes.forEach((pass) => pass.dispose())
      composer.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div className="nb-scene" ref={host} style={{position: 'absolute', inset: 0}} />
}
