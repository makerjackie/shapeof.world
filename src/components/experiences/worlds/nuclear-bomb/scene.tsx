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
import {GTAOPass} from 'three/examples/jsm/postprocessing/GTAOPass.js'
import {PARTS, MATERIALS, type Part} from './parts'
import {sampleTimeline, samplePresentation} from './model'
import {createMicroScene, getMicroFraming} from './micro-scene'
import {createBackdrop, createExhibition} from './exhibition'

export type SceneAnchor = {id: string; x: number; y: number; visible: boolean; occluded?: boolean; side?: 'left' | 'right'; bounds?: {left: number; right: number; top: number; bottom: number}}
type Props = {
  explode: number
  cutAngle: 0 | 90 | 180
  selectedPart: string | null
  onSelectPart: (id: string | null) => void
  time: number
  endingSeconds?: number
  leaders?: Array<{id: string; points: Array<[number, number]>; opacity: number}>
  micro: boolean
  forceMicro?: boolean
  autoCamera?: boolean
  onAnchors: (anchors: SceneAnchor[]) => void
  onInteract?: () => void
  onError?: (message: string) => void
  reducedMotion?: boolean
}

const cutVertex = `varying vec2 sectionUv;
void main(){ sectionUv=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`
const cutFragment = `
uniform vec3 ink; uniform vec3 glow; uniform float heat; uniform float pattern; uniform float alpha; varying vec2 sectionUv;
float line(float v){float d=abs(fract(v)-.5); return 1.-smoothstep(.014,.014+fwidth(v)*.7,d);}
void main(){
  vec2 p=sectionUv*25.; float hatch=0.;
  if(pattern<1.5 && pattern>.5) hatch=line((p.x+p.y)*.7071);
  if(pattern>1.5 && pattern<2.5){vec2 q=fract(p*.7)-.5; float d=length(q); hatch=1.-smoothstep(.07,.07+fwidth(d),d);}
  if(pattern>2.5 && pattern<3.5) hatch=line(p.y);
  if(pattern>3.5) hatch=max(line((p.x+p.y)*.7071),line((p.x-p.y)*.7071));
  float lightFalloff=1./(1.+dot(sectionUv,sectionUv)*.85);
  gl_FragColor=vec4(ink*(1.-hatch*.5)+glow*heat*lightFalloff,alpha);
}`

function sectionMaterial(part: Part) {
  const palette = MATERIALS[part.material]
  return new T.ShaderMaterial({
    uniforms: {ink: {value: new T.Color(palette.cut)}, glow: {value: new T.Color()}, heat: {value: 0}, pattern: {value: palette.hatch}, alpha: {value: 1}},
    vertexShader: cutVertex, fragmentShader: cutFragment, side: T.DoubleSide,
  })
}

type Section = {group: T.Group; part: Part; displacement: T.Vector3; surfaces: T.MeshStandardMaterial[]; cuts: T.ShaderMaterial[]}

/** All meridians and their closure faces use exactly the same display profile. */
function createAssembly(angle: number) {
  const group = new T.Group()
  const sections: Section[] = []
  const pickers: T.Mesh[] = []
  const occluders: T.Mesh[] = []
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
          shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\nfloat grain=fract(sin(dot(floor(finishPosition*220.),vec3(12.9898,78.233,37.719)))*43758.5453);float wear=1.-smoothstep(.008,.045,abs(finishPosition.y));diffuseColor.rgb*=.94+.10*grain;diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.29,.30,.27),wear*.22);')
          shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor*=.9+.2*grain;')
        }
      }
      const surface = new T.Mesh(geometry, material)
      surface.castShadow = true
      surface.receiveShadow = true
      surface.userData.partId = part.id
      half.add(surface)
      pickers.push(surface)
      const proxyPoints = points.filter((_, index) => index % 6 === 0 || index === 48 || index === 49 || index >= points.length - 2)
      const proxy = new T.Mesh(new T.LatheGeometry(proxyPoints, 20, start, length), new T.MeshBasicMaterial({side: T.DoubleSide}))
      proxy.visible = false
      half.add(proxy)
      occluders.push(proxy)
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
            new T.LineBasicMaterial({color: '#171611', transparent: true, opacity: 0.68}),
          )
          outline.rotation.y = face.rotation.y
          half.add(outline)
        }
      }
      group.add(half)
      sections.push({group: half, part, displacement: new T.Vector3().fromArray(profile.displacement), surfaces: [material], cuts})
    }
  }

  // Open, thin plate silhouette inspired by exterior museum replicas.
  const tail = new T.Group()
  const tailMat = new T.MeshStandardMaterial({color: '#62665a', metalness: 0.58, roughness: 0.48, envMapIntensity: 0.32})
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
    occluders.push(mesh)
  }
  for (const side of [-1, 1]) {
    box(-5.05, side * 1.05, 0, 1.15, .065, 2.16)
    box(-5.05, 0, side * 1.05, 1.15, 2.16, .065)
  }
  box(-4.05, 0, 0, 3.55, .055, 2.1)
  box(-4.05, 0, 0, 3.55, 2.1, .055)
  const flangePath = new T.CatmullRomCurve3(Array.from({length: 145}, (_, i) => {
    const phi = start + length * i / 144
    return new T.Vector3(Math.sin(phi) * 2.25 * 1.5, 0, Math.cos(phi) * 2.25)
  }))
  const flange = new T.Mesh(new T.TubeGeometry(flangePath, 144, .036, 8, angle === 0), tailMat)
  flange.userData.partId = 'casing'
  tail.add(flange)
  pickers.push(flange)
  const bolts = new T.InstancedMesh(new T.CylinderGeometry(.037, .037, .048, 6), tailMat, 48)
  const dummy = new T.Object3D()
  for (let i = 0; i < 48; i++) {
    const phi = start + length * (i + .5) / 48
    dummy.position.set(Math.sin(phi) * 2.25 * 1.5, .025, Math.cos(phi) * 2.25)
    dummy.updateMatrix()
    bolts.setMatrixAt(i, dummy.matrix)
  }
  bolts.castShadow = true
  tail.add(bolts)
  group.add(tail)
  return {group, sections, pickers, occluders, tail, tailMat, tailParts}
}

function disposeGroup(group: T.Group | T.Scene) {
  const geometries = new Set<T.BufferGeometry>()
  const materials = new Set<T.Material>()
  group.traverse((item) => {
    if (item instanceof T.InstancedMesh) item.dispose()
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
    scene.fog = new T.Fog('#0a0a0b', 28, 65)
    const backdrop = createBackdrop()
    scene.background = backdrop
    const camera = new T.PerspectiveCamera(36, 1, 0.05, 120)
    const macroPosition = new T.Vector3(-7.4, 5.7, 17.8)
    const macroTarget = new T.Vector3(-.6, -.4, 0)
    camera.position.copy(macroPosition)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.copy(macroTarget)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enablePan = false
    controls.minDistance = 12
    controls.maxDistance = 33
    controls.minPolarAngle = Math.PI / 7
    controls.maxPolarAngle = Math.PI / 2 - T.MathUtils.degToRad(5)
    controls.autoRotate = false
    controls.update()

    const pmrem = new T.PMREMGenerator(renderer)
    const room = new RoomEnvironment()
    const env = pmrem.fromScene(room, 0.04)
    scene.environment = env.texture
    scene.environmentIntensity = 0.22
    room.dispose()
    pmrem.dispose()
    scene.add(new T.HemisphereLight('#b9c4d5', '#23190f', 0.3))
    const key = new T.SpotLight('#ffe2c0', 330, 42, Math.PI / 4.3, 0.8, 2)
    key.position.set(-4, 8, 6)
    key.target.position.set(0, -2, 0)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.bias = -0.00035
    key.shadow.normalBias = 0.035
    key.shadow.radius = 4
    scene.add(key, key.target)
    const rim = new T.DirectionalLight('#9db4d6', 3.0)
    rim.position.set(4, 1.3, -5)
    scene.add(rim)
    const fill = new T.DirectionalLight('#ffe2c0', 0.35)
    fill.position.set(-2, 2, 6)
    scene.add(fill)

    const exhibit = createExhibition()
    const exhibition = exhibit.group
    scene.add(exhibition)
    const coreLight = new T.PointLight('#ffa24d', 0, 12, 2)
    coreLight.position.set(0, 0, .3)
    scene.add(coreLight)
    let angle = latest.current.cutAngle
    let assembly = createAssembly(angle)
    scene.add(assembly.group)
    let wave = createWave(angle)
    scene.add(wave.group)

    const micro = createMicroScene()
    scene.add(micro.group)
    micro.group.visible = false
    const microTarget = new T.WebGLRenderTarget(1, 1, {type: T.HalfFloatType})
    const microCamera = new T.PerspectiveCamera(36, 1, .05, 120)
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const ao = new GTAOPass(scene, camera, 1, 1)
    ao.blendIntensity = .35
    ao.updateGtaoMaterial({radius: .3, distanceExponent: 1.2, thickness: .6, scale: .65})
    composer.addPass(ao)
    const microscopeBlend = new ShaderPass({
      uniforms: {tDiffuse: {value: null}, tMicro: {value: microTarget.texture}, blend: {value: 0}},
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying vec2 vUv;uniform sampler2D tDiffuse;uniform sampler2D tMicro;uniform float blend;void main(){gl_FragColor=mix(texture2D(tDiffuse,vUv),texture2D(tMicro,vUv),blend);}',
    })
    microscopeBlend.uniforms.tMicro.value = microTarget.texture
    composer.addPass(microscopeBlend)
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
    const ending = new ShaderPass({
      uniforms: {tDiffuse: {value: null}, white: {value: 0}, dark: {value: 0}},
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying vec2 vUv;uniform sampler2D tDiffuse;uniform float white;uniform float dark;void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;c=c*max(0.,1.-white-dark)+vec3(4.)*white+vec3(.003,.003,.0034)*dark;gl_FragColor=vec4(c,1.);}',
    })
    composer.addPass(ending)
    composer.addPass(new OutputPass())

    let width = 1
    let height = 1
    let userOrbit = false
    let lastInteraction = performance.now()
    const homePosition = new T.Vector3()
    const oscillationStart = performance.now() + 6000
    const resize = () => {
      width = element.clientWidth
      height = element.clientHeight
      renderer.setSize(width, height)
      composer.setSize(width, height)
      camera.aspect = width / height
      camera.fov = width < 700 ? 44 : 36
      microCamera.aspect = width / height
      microCamera.fov = width < 700 ? 50 : 36
      microCamera.updateProjectionMatrix()
      microTarget.setSize(width * renderer.getPixelRatio(), height * renderer.getPixelRatio())
      // Preserve room for controls and the schematic caption on narrow displays.
      if (!userOrbit && !latest.current.micro) {
        camera.position.copy(macroPosition).multiplyScalar(width < 700 ? 1.6 : 1)
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
    const anchorDepths = new Map<string, number>()
    const leaders = new T.Group()
    const leaderLines = new Map<string, T.Line>()
    for (const part of PARTS) {
      const line = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3(), new T.Vector3()]), new T.LineBasicMaterial({color: '#c7bca6', transparent: true, opacity: .3, depthTest: true, depthWrite: false}))
      leaders.add(line)
      leaderLines.set(part.id, line)
    }
    scene.add(leaders)
    const animate = (now: number) => {
      const state = latest.current
      const dt = Math.min((now - previous) / 1000, 0.1)
      previous = now
      const requestedAngle = state.time >= 120 && state.micro ? 90 : state.cutAngle
      if (angle !== requestedAngle) {
        scene.remove(assembly.group)
        disposeGroup(assembly.group)
        angle = requestedAngle
        assembly = createAssembly(angle)
        scene.add(assembly.group)
        scene.remove(wave.group)
        disposeGroup(wave.group)
        wave = createWave(angle)
        scene.add(wave.group)
      }
      const frame = sampleTimeline(state.time)
      const presentation = samplePresentation(state.time, state.endingSeconds ?? 0)
      const displayExplode = state.explode * (1 - T.MathUtils.smoothstep(state.time, -3, -2))
      const microBlend = state.forceMicro ? 1 : state.micro ? presentation.microBlend : 0
      const isMicro = microBlend > 0
      controls.enabled = !state.micro || state.time < 0
      controls.autoRotate = false
      homePosition.copy(macroPosition).multiplyScalar(width < 700 ? 1.6 : 1)
      if (state.time > -3 && state.autoCamera) {
        // Reaction framing is sampled, never inherited from the playback direction.
        camera.position.copy(homePosition)
        if (state.micro && !state.forceMicro && state.time >= 120 && state.time <= 140) camera.position.multiplyScalar(.6 + .4 * presentation.macroBlend)
        controls.target.copy(macroTarget)
        camera.lookAt(controls.target)
      } else {
        controls.update(dt)
        if (!state.reducedMotion && state.time <= -3 && now - lastInteraction > 6000) {
          const azimuth = T.MathUtils.degToRad(-12)
          const swing = Math.sin((now - oscillationStart) / 40000 * Math.PI * 2) * Math.PI / 6
          const desired = homePosition.clone().sub(macroTarget)
          const horizontal = Math.hypot(desired.x, desired.z)
          desired.x = Math.sin(azimuth + swing) * horizontal
          desired.z = Math.cos(azimuth + swing) * horizontal
          desired.add(macroTarget)
          camera.position.lerp(desired, 1 - Math.exp(-dt * .7))
          controls.target.lerp(macroTarget, 1 - Math.exp(-dt * .7))
          camera.lookAt(controls.target)
        }
      }
      assembly.group.visible = true
      exhibition.visible = true
      exhibit.axis.visible = displayExplode > .04
      micro.group.visible = false
      scene.background = backdrop
      vignette.uniforms.strength.value = isMicro ? .1 : .16
      ao.enabled = !isMicro
      microscopeBlend.uniforms.blend.value = microBlend
      ending.uniforms.white.value = state.time >= 0 && !state.forceMicro ? presentation.whiteOpacity : 0
      ending.uniforms.dark.value = state.time >= 0 && !state.forceMicro ? presentation.darkOpacity : 0
      const glowAmount = frame.energyFraction
      const heatColor = new T.Color('#3a0a00')
      if (glowAmount < .18) heatColor.lerp(new T.Color('#ff5a1f'), glowAmount / .18)
      else if (glowAmount < .6) heatColor.set('#ff5a1f').lerp(new T.Color('#ffd08a'), (glowAmount - .18) / .42)
      else heatColor.set('#ffd08a').lerp(new T.Color('#ffffff'), (glowAmount - .6) / .4)
      coreLight.color.copy(heatColor)
      coreLight.intensity = glowAmount * 110
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
          if (part.id === 'core') {material.emissive.copy(heatColor); material.emissiveIntensity = glowAmount * 24}
        }
        for (const material of section.cuts) {
          material.uniforms.alpha.value = opacity
          material.uniforms.glow.value.copy(heatColor)
          material.uniforms.heat.value = glowAmount * (part.id === 'core' ? 28 : 5)
          material.transparent = faded
          material.depthWrite = !faded
        }
        group.children.forEach((child) => {
          if (child instanceof T.Line) (child.material as T.LineBasicMaterial).opacity = faded ? 0.05 : 0.68
        })
      }
      assembly.tail.position.y = 0
      assembly.tailMat.opacity = state.selectedPart && state.selectedPart !== 'casing' ? 0.15 : 1
      assembly.tailMat.transparent = assembly.tailMat.opacity < 1
      assembly.tailMat.depthWrite = assembly.tailMat.opacity === 1
      wave.group.visible = !isMicro && angle > 0 && frame.waveProgress > 0 && frame.waveProgress < 1
      wave.group.scale.setScalar(T.MathUtils.lerp(1.95, 1.65, frame.waveProgress))
      wave.material.opacity = wave.group.visible ? Math.sin(frame.waveProgress * Math.PI) * 0.85 : 0
      if (!isMicro && state.time < 0 && now - lastLabels > 100) {
        lastLabels = now
        camera.updateMatrixWorld()
        assembly.group.updateMatrixWorld(true)
        const bounds = {left: width, right: 0, top: height, bottom: 0}
        assembly.group.traverse((object) => {
          if (!(object instanceof T.Mesh) || object instanceof T.InstancedMesh || !object.visible) return
          const vertices = object.geometry.getAttribute('position')
          for (let index = 0; index < vertices.count; index += Math.max(1, Math.floor(vertices.count / 500))) {
            projected.fromBufferAttribute(vertices, index).applyMatrix4(object.matrixWorld).project(camera)
            const px = (projected.x + 1) * width / 2
            const py = (1 - projected.y) * height / 2
            bounds.left = Math.min(bounds.left, px)
            bounds.right = Math.max(bounds.right, px)
            bounds.top = Math.min(bounds.top, py)
            bounds.bottom = Math.max(bounds.bottom, py)
          }
        })
        latest.current.onAnchors(PARTS.map((part) => {
          const side = part.order <= 3 ? 'left' as const : 'right' as const
          const candidates: {point: T.Vector3; screen: T.Vector3; occluded: boolean; score: number}[] = []
          for (const section of assembly.sections.filter((item) => item.part.id === part.id)) {
            const partSections = assembly.sections.filter((item) => item.part.id === part.id)
            const profile = part.profiles[partSections.indexOf(section)]
            const outer = profile.points[0][0]
            const inner = profile.points[profile.points.length - 2][0]
            const middle = (outer + inner) / 2
            const sign = profile.id.endsWith('upper') ? 1 : -1
            for (const phi of [T.MathUtils.degToRad(angle / 2), -T.MathUtils.degToRad(angle / 2)]) {
              for (const arc of [.16, .48, .82, 1.08]) {
                const point = new T.Vector3(Math.sin(phi) * Math.cos(arc) * middle, Math.sin(arc) * middle * sign, Math.cos(phi) * Math.cos(arc) * middle)
                section.group.localToWorld(point)
                const direction = point.clone().sub(camera.position)
                const distance = direction.length()
                raycaster.set(camera.position, direction.normalize())
                const hit = raycaster.intersectObjects(assembly.occluders)[0]
                const occluded = angle === 0 || Boolean(hit && hit.distance < distance - .035)
                const screen = point.clone().project(camera)
                const x = (screen.x + 1) * width / 2
                const score = (occluded ? 10000 : 0) + (part.order <= 3 && sign < 0 ? 800 : 0) + (side === 'left' ? x : width - x) + Math.abs(screen.y) * 25
                candidates.push({point, screen, occluded, score})
              }
            }
          }
          const anchor = candidates.sort((a, b) => a.score - b.score)[0]
          anchorDepths.set(part.id, anchor.screen.z)
          return {id: part.id, x: (anchor.screen.x + 1) / 2 * width, y: (1 - anchor.screen.y) / 2 * height, visible: anchor.screen.z < 1, occluded: anchor.occluded, side, bounds}
        }))
      }
      leaders.visible = state.time <= -3 && !isMicro && width >= 700
      for (const leader of state.leaders ?? []) {
        const line = leaderLines.get(leader.id)!
        const positions = line.geometry.getAttribute('position')
        const depth = anchorDepths.get(leader.id) ?? .99
        leader.points.forEach(([x, y], index) => {
          projected.set(x / width * 2 - 1, 1 - y / height * 2, index === leader.points.length - 1 ? depth - .00001 : Math.min(.999, depth + .002)).unproject(camera)
          positions.setXYZ(index, projected.x, projected.y, projected.z)
        })
        positions.needsUpdate = true
        line.geometry.computeBoundingSphere()
        ;(line.material as T.LineBasicMaterial).opacity = leader.opacity * .5
      }
      if (isMicro) {
        assembly.group.visible = false
        exhibition.visible = false
        wave.group.visible = false
        micro.group.visible = true
        coreLight.intensity = 0
        scene.background = new T.Color('#08090a')
        const microTime = state.forceMicro ? T.MathUtils.clamp(state.time, 0, 115) : state.time
        micro.update(microTime)
        const framing = getMicroFraming(microTime)
        microCamera.position.fromArray(framing.position)
        // The slight forward drift is also sampled from the timeline.
        if (!state.forceMicro) microCamera.position.z += presentation.macroBlend * 9
        microCamera.position.z -= Math.sin(Math.min(12, microTime / 10) * .24) * .12
        microCamera.lookAt(...framing.target)
        renderer.setRenderTarget(microTarget)
        renderer.render(scene, microCamera)
        renderer.setRenderTarget(null)
        micro.group.visible = false
        assembly.group.visible = true
        exhibition.visible = true
        scene.background = backdrop
        coreLight.intensity = glowAmount * 110
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
      backdrop.dispose()
      microTarget.dispose()
      composer.passes.forEach((pass) => pass.dispose())
      composer.dispose()
      key.shadow.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div className="nb-scene" ref={host} style={{position: 'absolute', inset: 0}} />
}
