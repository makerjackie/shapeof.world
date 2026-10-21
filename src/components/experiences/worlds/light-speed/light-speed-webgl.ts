import * as THREE from 'three'
import { createLightScene } from './light-speed-scene'
import type { LightSceneState } from './light-speed-scene'
import { lightClockLegGeometry, properTimeRate, transformEvent } from './light-speed-model'

type State = LightSceneState & { showGeometry?: boolean; showMeasurements?: boolean }
type Runtime = { draw(state: State): void; resize(width: number, height: number, dpr: number): void; dispose(): void }
type Disposable = { dispose(): void }
type RGB = 'ice' | 'warm' | 'violet' | 'white'
const COLORS = { ice: 0x8ce5ff, warm: 0xffaf7c, violet: 0xb897ef, white: 0xf0fbff }
const TAU = Math.PI * 2
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t) }
const bump = (x: number, at: number, span = 1) => 1 - smooth(0, span, Math.abs(x - at))
const fract = (x: number) => x - Math.floor(x)
const v = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)

const screenVertex = `varying vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`

const membraneVertex = `
uniform float uSphere;uniform float uClock;uniform float uCone;uniform float uMedium;uniform float uRadius;
varying vec3 vWorld;varying vec3 vNormal;varying vec3 vLocal;varying vec2 vUv;
vec3 shape(float u,float a){
 float y=cos(u*3.14159265)*uRadius*uSphere+(0.5-u)*2.4*uClock+(0.5-u)*4.4*uCone;
 float r=sin(u*3.14159265)*uRadius*uSphere+0.54*uClock+abs((0.5-u)*4.4)*uCone;
 return vec3(cos(a)*r+(u-0.5)*6.0*uMedium,y+cos(a)*0.55*uMedium,sin(a)*(r+0.55*uMedium));
}
void main(){
 vUv=uv;float u=clamp(uv.y,0.001,0.999);float a=uv.x*6.2831853;
 vec3 p=shape(u,a);vec3 du=shape(min(u+0.002,0.9999),a)-shape(max(u-0.002,0.0001),a);
 vec3 da=shape(u,a+0.003)-shape(u,a-0.003);
 vec3 crossNormal=cross(da,du);
 // The cone apex has zero angular derivative. Never feed NaN into HDR bloom.
 vec3 n=length(crossNormal)>0.000001?normalize(crossNormal):vec3(0.0,1.0,0.0);vLocal=p;
 vec4 world=modelMatrix*vec4(p,1.0);vWorld=world.xyz;vNormal=normalize(mat3(modelMatrix)*n);
 gl_Position=projectionMatrix*viewMatrix*world;
}`

const membraneFragment = `
uniform float uOpacity;uniform float uTime;uniform float uCone;uniform float uSphere;uniform float uUnknown;
varying vec3 vWorld;varying vec3 vNormal;varying vec3 vLocal;varying vec2 vUv;
void main(){
 vec3 viewDir=normalize(cameraPosition-vWorld);vec3 n=vNormal/max(length(vNormal),0.0001);
 float facing=clamp(abs(dot(n,viewDir)),0.0,1.0);float edge=pow(1.0-facing,mix(3.0,5.3,uSphere));
 float light=pow(max(0.0,abs(dot(n,normalize(vec3(-0.7,1.0,0.8))))),14.0);
 float high=pow(max(0.0,abs(dot(n,normalize(vec3(0.8,0.35,-0.5))))),26.0);
 float angle=atan(n.z,n.x);float iridescence=0.5+0.5*sin(facing*7.0+angle*0.7);
 vec3 ice=vec3(0.36,0.79,1.0);vec3 violet=vec3(0.46,0.27,0.79);
 vec3 hue=mix(violet,ice,smoothstep(-1.0,0.8,vLocal.y));
 hue=mix(hue,vec3(0.95,0.75,0.47),high*0.30*iridescence);
 float contour=pow(0.5+0.5*cos(vLocal.y*18.0),30.0)*uCone;
 float grain=fract(sin(dot(vLocal.xy+vLocal.z,vec2(93.13,47.77)))*15713.7);
 float certainty=mix(1.0,0.78+grain*0.22,uUnknown);
 float apex=mix(1.0,smoothstep(0.008,0.05,abs(vLocal.y)),uCone);
 float sheen=mix(1.0,0.12,uSphere);
 float alpha=(mix(0.014,0.003,uSphere)+edge*0.43+(light+high)*0.045*sheen+contour*0.012)*uOpacity*certainty*apex;
 vec3 radiance=hue*(0.48+edge*2.0+(light*0.8+high)*sheen)+vec3(0.48,0.76,0.89)*contour*0.04;
 gl_FragColor=vec4(radiance,alpha);
}`

/**
 * WebGL 2 is the primary renderer. A context failure uses the original 2D
 * renderer, preserving the React-owned canvas and its pointer handlers.
 * Light geometry is exact in normalized units; materials, glow and camera
 * are illustration, not a claim that vacuum contains a visible membrane.
 */
export function createLightWebGLScene(canvas: HTMLCanvasElement): Runtime {
  let fallback: Runtime | null = null
  let fallbackCanvas: HTMLCanvasElement | null = null
  const oldOpacity = canvas.style.opacity
  let disposed = false
  let width = 1, height = 1, dpr = 1
  let renderer: THREE.WebGLRenderer | null = null
  const resources = new Set<Disposable>()
  const own = <T extends Disposable>(item: T): T => { resources.add(item); return item }

  function activateFallback(error?: unknown) {
    if (fallback) return fallback
    if (error) console.warn('light-speed: using the Canvas fallback after a WebGL failure.', error)
    // A canvas cannot switch context types after WebGL was bound. The sibling
    // stays pointer-transparent; React still receives input on its own canvas.
    fallbackCanvas = document.createElement('canvas')
    fallbackCanvas.dataset.lightSpeedFallback = 'true'
    fallbackCanvas.setAttribute('aria-hidden', 'true')
    Object.assign(fallbackCanvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' })
    canvas.insertAdjacentElement('afterend', fallbackCanvas)
    canvas.style.opacity = '0'
    fallback = createLightScene(fallbackCanvas)
    fallback.resize(width, height, dpr)
    return fallback
  }

  try {
    const context = canvas.getContext('webgl2', { alpha: false, antialias: true, powerPreference: 'high-performance' })
    if (!context) {
      canvas.dataset.lightSpeedFallback = 'true'
      const direct = createLightScene(canvas)
      return { ...direct, dispose() { direct.dispose(); delete canvas.dataset.lightSpeedFallback } }
    }
    renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true, alpha: false })
  } catch (error) {
    const failed = activateFallback(error)
    return {
      draw: state => failed.draw(state),
      resize(w, h, ratio) { width = w; height = h; dpr = ratio; failed.resize(w, h, ratio) },
      dispose() { failed.dispose(); fallbackCanvas?.remove(); canvas.style.opacity = oldOpacity },
    }
  }
  let labels: HTMLCanvasElement | null = null
  try {
  const gl = renderer
  gl.setClearColor(0x070b13, 1)
  gl.outputColorSpace = THREE.SRGBColorSpace
  gl.toneMapping = THREE.ACESFilmicToneMapping
  gl.toneMappingExposure = 1.08
  gl.debug.onShaderError = (context, _program, vertex, fragment) => {
    throw new Error(`Light-speed shader: ${context.getShaderInfoLog(vertex)} ${context.getShaderInfoLog(fragment)}`)
  }

  labels = document.createElement('canvas')
  const labelCanvas = labels
  labels.dataset.lightSpeedLabels = 'true'
  labels.setAttribute('aria-hidden', 'true')
  Object.assign(labels.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' })
  canvas.insertAdjacentElement('afterend', labels)
  const ink = labels.getContext('2d')!
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100)
  const world = new THREE.Group()
  scene.add(world)
  const key = new THREE.DirectionalLight(0xc8edff, 4.5)
  key.position.set(-3, 6, 6)
  const fill = new THREE.DirectionalLight(0xffbc91, 2.1)
  fill.position.set(5, 1, -2)
  const rimLight = new THREE.DirectionalLight(0x7c91ff, 3)
  rimLight.position.set(-4, -2, -4)
  scene.add(key, fill, rimLight, new THREE.HemisphereLight(0xbfdfff, 0x201221, 1.5))

  // Original softbox environment: no downloaded HDR, texture or outside asset.
  const environment = new THREE.Scene()
  environment.background = new THREE.Color(0x202c3e)
  const envGeometry = own(new THREE.PlaneGeometry(1, 1))
  const boxes = [
    { at: v(-4, 3, 4), size: [2.2, 5.2], color: 0xc8eaff, power: 5.0 },
    { at: v(4, 2, 2), size: [1.3, 4.5], color: 0xffd2af, power: 3.1 },
    { at: v(0, 5, -2), size: [5, 1.2], color: 0xadc4ff, power: 4.5 },
  ]
  for (const box of boxes) {
    const material = own(new THREE.MeshBasicMaterial({ color: new THREE.Color(box.color).multiplyScalar(box.power), side: THREE.DoubleSide }))
    const panel = new THREE.Mesh(envGeometry, material)
    panel.position.copy(box.at); panel.scale.set(box.size[0], box.size[1], 1); panel.lookAt(0, 0, 0)
    environment.add(panel)
  }
  const pmrem = own(new THREE.PMREMGenerator(gl))
  const environmentTarget = own(pmrem.fromScene(environment, 0.06, 0.1, 30, { size: 128 }))
  scene.environment = environmentTarget.texture
  pmrem.dispose()
  resources.delete(pmrem)

  const glowCanvas = document.createElement('canvas')
  glowCanvas.width = glowCanvas.height = 128
  const glowContext = glowCanvas.getContext('2d')!
  const radial = glowContext.createRadialGradient(64, 64, 0, 64, 64, 64)
  radial.addColorStop(0, 'rgba(255,255,255,1)')
  radial.addColorStop(0.08, 'rgba(255,255,255,.52)')
  radial.addColorStop(0.25, 'rgba(255,255,255,.09)')
  radial.addColorStop(1, 'rgba(255,255,255,0)')
  glowContext.fillStyle = radial; glowContext.fillRect(0, 0, 128, 128)
  const glowTexture = own(new THREE.CanvasTexture(glowCanvas))
  const sphereGeometry = own(new THREE.SphereGeometry(1, 32, 20))
  const ringGeometry = own(new THREE.TorusGeometry(1, 0.012, 10, 112))

  function material(color: RGB, emissive = 0, opacity = 1) {
    return own(new THREE.MeshPhysicalMaterial({
      color: COLORS[color], metalness: 0.63, roughness: 0.21, clearcoat: 1, clearcoatRoughness: 0.13,
      emissive: COLORS[color], emissiveIntensity: emissive, transparent: opacity < 1, opacity,
    }))
  }
  function luminous(color: RGB, opacity = 1) {
    return own(new THREE.MeshBasicMaterial({ color: new THREE.Color(COLORS[color]).multiplyScalar(2.4), transparent: true, opacity, depthWrite: false, toneMapped: false }))
  }
  function halo(color: RGB, size = 0.7) {
    const m = own(new THREE.SpriteMaterial({ color: COLORS[color], map: glowTexture, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.48, toneMapped: false }))
    const mesh = new THREE.Sprite(m); mesh.scale.setScalar(size)
    return mesh
  }
  function beacon(color: RGB, radius = 0.045) {
    const group = new THREE.Group()
    const core = new THREE.Mesh(sphereGeometry, luminous(color)); core.scale.setScalar(radius)
    const bloom = halo(color, radius * 13)
    group.add(core, bloom)
    return group
  }
  function ring(color: RGB, y: number, radius: number, alpha = 1) {
    const mesh = new THREE.Mesh(ringGeometry, luminous(color, alpha))
    mesh.rotation.x = Math.PI / 2; mesh.position.y = y; mesh.scale.setScalar(radius)
    return mesh
  }
  function fade(group: THREE.Object3D, alpha: number) {
    group.visible = alpha > 0.001
    if (!group.visible) return
    group.traverse(object => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.Sprite || object instanceof THREE.Line)) return
      for (const mat of Array.isArray(object.material) ? object.material : [object.material]) {
        if (mat.userData.originalOpacity === undefined) mat.userData.originalOpacity = mat.opacity
        mat.opacity = mat.userData.originalOpacity * alpha
        mat.transparent = true
      }
    })
  }

  /** Reusable volumetric stroke. Buffer allocation stays outside the draw loop. */
  function tube(color: RGB, count = 96, radius = 0.012, opacity = 1) {
    const radial = 6
    const geometry = own(new THREE.BufferGeometry())
    const positions = new Float32Array((count + 1) * radial * 3)
    const normals = new Float32Array(positions.length)
    const indices: number[] = []
    for (let i = 0; i < count; i++) for (let j = 0; j < radial; j++) {
      const a = i * radial + j, b = i * radial + (j + 1) % radial, c = a + radial, d = b + radial
      indices.push(a, b, c, b, d, c)
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage))
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3).setUsage(THREE.DynamicDrawUsage))
    geometry.setIndex(indices)
    const mesh = new THREE.Mesh(geometry, luminous(color, opacity))
    mesh.frustumCulled = false
    const points = Array.from({ length: count + 1 }, () => v())
    const tangent = v(), side = v(), normal = v(), offset = v()
    return {
      mesh,
      update(sample: (t: number, point: THREE.Vector3) => void, thickness = radius) {
        for (let i = 0; i <= count; i++) sample(i / count, points[i])
        for (let i = 0; i <= count; i++) {
          tangent.subVectors(points[Math.min(count, i + 1)], points[Math.max(0, i - 1)]).normalize()
          side.set(0, 0, 1).cross(tangent)
          if (side.lengthSq() < 0.001) side.set(1, 0, 0).cross(tangent)
          side.normalize(); normal.crossVectors(tangent, side).normalize()
          for (let j = 0; j < radial; j++) {
            offset.copy(side).multiplyScalar(Math.cos(j / radial * TAU)).addScaledVector(normal, Math.sin(j / radial * TAU))
            const index = (i * radial + j) * 3
            positions[index] = points[i].x + offset.x * thickness
            positions[index + 1] = points[i].y + offset.y * thickness
            positions[index + 2] = points[i].z + offset.z * thickness
            normals[index] = offset.x; normals[index + 1] = offset.y; normals[index + 2] = offset.z
          }
        }
        geometry.attributes.position.needsUpdate = true
        geometry.attributes.normal.needsUpdate = true
      },
    }
  }

  const membraneMaterial = own(new THREE.ShaderMaterial({
    uniforms: {
      uSphere: { value: 1 }, uClock: { value: 0 }, uCone: { value: 0 }, uMedium: { value: 0 }, uRadius: { value: 1.7 },
      uOpacity: { value: 1 }, uTime: { value: 0 }, uUnknown: { value: 0 },
    },
    vertexShader: membraneVertex, fragmentShader: membraneFragment, transparent: true, side: THREE.DoubleSide,
    depthWrite: false, blending: THREE.NormalBlending,
  }))
  const membrane = new THREE.Mesh(own(new THREE.PlaneGeometry(1, 1, 96, 64)), membraneMaterial)
  membrane.frustumCulled = false
  world.add(membrane)
  const pulseLayers = [0.955, 1.032].map((factor, i) => {
    const m = own(membraneMaterial.clone()); m.uniforms.uOpacity.value = i ? 0.28 : 0.15
    const mesh = new THREE.Mesh(membrane.geometry, m); mesh.frustumCulled = false
    world.add(mesh)
    return { mesh, material: m, factor }
  })
  const source = beacon('ice', 0.065)
  const sourceIris = new THREE.Mesh(own(new THREE.TorusGeometry(0.18, 0.032, 12, 64)), material('white', 0.07))
  sourceIris.rotation.y = Math.PI / 2; source.add(sourceIris)
  world.add(source)
  const pulseTip = beacon('white', 0.04)
  world.add(pulseTip)
  const ship = new THREE.Group()
  const hull = new THREE.Mesh(own(new THREE.CapsuleGeometry(0.105, 0.27, 8, 20)), material('white', 0.015))
  hull.rotation.z = -Math.PI / 2
  const nose = new THREE.Mesh(own(new THREE.ConeGeometry(0.108, 0.19, 24)), material('warm', 0.05))
  nose.rotation.z = -Math.PI / 2; nose.position.x = 0.24
  const windowBand = new THREE.Mesh(own(new THREE.TorusGeometry(0.108, 0.011, 8, 48)), luminous('warm', 0.8))
  windowBand.rotation.y = Math.PI / 2; windowBand.position.x = 0.08
  const tailLight = halo('warm', 0.65); tailLight.position.x = -0.23
  ship.add(hull, nose, windowBand, tailLight)
  for (const z of [-0.12, 0.12]) {
    const fin = new THREE.Mesh(own(new THREE.BoxGeometry(0.24, 0.018, 0.16)), material('white'))
    fin.position.set(-0.1, -0.025, z); fin.rotation.z = 0.25; ship.add(fin)
  }
  // The observation point is the nose. Keep the illustrative hull behind it,
  // so its deliberately enlarged body never protrudes ahead of the light ray.
  for (const part of ship.children) part.position.x -= 0.335
  ship.add(beacon('warm', 0.026))
  world.add(ship)
  const chaseRay = tube('ice', 32, 0.006, 0.42)
  world.add(chaseRay.mesh)

  // A physical measuring bench lives in the same scene as the pulse. Its
  // subdivisions, travelled segment and elapsed time share one analytic
  // sample, so pausing and seeking never detach the readout from the object.
  const measurement = new THREE.Group()
  world.add(measurement)
  const rulerGeometry = own(new THREE.CylinderGeometry(0.013, 0.013, 1, 12))
  rulerGeometry.rotateZ(Math.PI / 2)
  const markGeometry = own(new THREE.BoxGeometry(0.012, 0.085, 0.025))
  function makeRuler(color: RGB) {
    const group = new THREE.Group()
    const railMaterial = material(color, 0.07, 0.8)
    railMaterial.roughness = 0.28
    const rail = new THREE.Mesh(rulerGeometry, railMaterial)
    const marks = own(new THREE.InstancedMesh(markGeometry, luminous(color, 0.6), 13))
    marks.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    marks.frustumCulled = false
    const start = beacon(color, 0.026), finish = beacon(color, 0.026)
    const travelled = tube(color, 36, 0.024, 0.88)
    group.add(rail, marks, start, finish, travelled.mesh)
    measurement.add(group)
    const transform = new THREE.Object3D()
    return {
      group, travelled,
      set(x: number, y: number, span: number, divisions: number, progress: number) {
        rail.position.set(x + span / 2, y, 0); rail.scale.set(span, 1, 1)
        marks.count = divisions + 1
        for (let i = 0; i <= divisions; i++) {
          transform.position.set(x + span * i / divisions, y - 0.027, 0)
          transform.scale.set(1, i === 0 || i === divisions ? 1.65 : 1, 1)
          transform.updateMatrix(); marks.setMatrixAt(i, transform.matrix)
        }
        marks.instanceMatrix.needsUpdate = true
        start.position.set(x, y, 0); finish.position.set(x + span, y, 0)
        travelled.update((t, point) => point.set(x + span * progress * t, y + 0.025, 0))
      },
    }
  }
  const firstRuler = makeRuler('ice'), secondRuler = makeRuler('warm')
  const distanceBracket = tube('white', 20, 0.009, 0.72)
  const ballProjection = tube('ice', 16, 0.004, 0.25), followerProjection = tube('warm', 16, 0.004, 0.25)
  measurement.add(distanceBracket.mesh, ballProjection.mesh, followerProjection.mesh)
  const measuredBall = new THREE.Mesh(sphereGeometry, material('ice', 0.08))
  measuredBall.scale.setScalar(0.105)
  const follower = new THREE.Mesh(sphereGeometry, material('warm', 0.11))
  follower.scale.setScalar(0.085)
  const measuredLight = beacon('white', 0.05), transformedLight = beacon('white', 0.041)
  measurement.add(measuredBall, follower, measuredLight, transformedLight)
  const rulerClock = new THREE.Group()
  const dial = new THREE.Mesh(own(new THREE.TorusGeometry(0.16, 0.012, 10, 64)), material('white', 0.08))
  const hand = new THREE.Mesh(own(new THREE.BoxGeometry(0.012, 0.135, 0.018)), luminous('white', 0.85))
  hand.geometry.translate(0, 0.055, 0)
  rulerClock.add(dial, hand); measurement.add(rulerClock)

  // Each optical gap is H in the transverse direction in every selected frame.
  const H = 2.4
  function makeClock(color: RGB) {
    const group = new THREE.Group()
    const alloy = material(color, 0.025)
    alloy.color.lerp(new THREE.Color(0xe6edf0), 0.63); alloy.metalness = 0.92; alloy.roughness = 0.16
    const reflective = material('white', 0.025)
    reflective.metalness = 1; reflective.roughness = 0.075
    const edge = luminous(color, 0.7)
    const mirrorGeometry = own(new THREE.CylinderGeometry(0.57, 0.53, 0.18, 80))
    const diskGeometry = own(new THREE.CylinderGeometry(0.49, 0.49, 0.009, 80))
    for (const side of [-1, 1]) {
      const body = new THREE.Mesh(mirrorGeometry, alloy); body.position.y = side * (H / 2 + 0.09)
      const disk = new THREE.Mesh(diskGeometry, reflective); disk.position.y = side * (H / 2 + 0.002)
      const seal = new THREE.Mesh(own(new THREE.TorusGeometry(0.535, 0.016, 10, 80)), edge)
      seal.rotation.x = Math.PI / 2; seal.position.y = side * H / 2
      const rear = new THREE.Mesh(own(new THREE.TorusGeometry(0.51, 0.038, 12, 80)), alloy)
      rear.rotation.x = Math.PI / 2; rear.position.y = side * (H / 2 + 0.18)
      group.add(body, disk, seal, rear)
    }
    const rodMaterial = own(new THREE.MeshPhysicalMaterial({ color: 0x5c7183, metalness: 0.85, roughness: 0.22, transparent: true, opacity: 0.35 }))
    for (const angle of [Math.PI * 0.22, Math.PI * 0.86, Math.PI * 1.46]) {
      const rod = new THREE.Mesh(own(new THREE.CylinderGeometry(0.021, 0.021, H, 12)), rodMaterial)
      rod.position.set(Math.cos(angle) * 0.49, 0, Math.sin(angle) * 0.49); group.add(rod)
    }
    const pulse = beacon(color, 0.052); group.add(pulse)
    const light = new THREE.PointLight(COLORS[color], 0.8, 2, 2); group.add(light)
    world.add(group)
    const trace = tube(color, 100, 0.018, 0.86); world.add(trace.mesh)
    const ghost = new THREE.Group()
    for (const side of [-1, 1]) {
      const m = own(new THREE.MeshBasicMaterial({ color: COLORS[color], transparent: true, opacity: 0.18, wireframe: false, depthWrite: false }))
      const torus = new THREE.Mesh(own(new THREE.TorusGeometry(0.54, 0.009, 6, 64, Math.PI * 1.88)), m)
      torus.rotation.x = Math.PI / 2; torus.position.y = side * H / 2; ghost.add(torus)
    }
    world.add(ghost)
    return { group, pulse, light, trace, ghost, alloy, edge, color }
  }
  const clocks = [makeClock('ice'), makeClock('warm')]
  const triangle = new THREE.Group()
  const legVertical = tube('ice', 24, 0.012, 0.72)
  const legHorizontal = tube('warm', 24, 0.012, 0.72)
  const legDiagonal = tube('white', 48, 0.018, 0.86)
  const geometryPulse = beacon('white', 0.055)
  triangle.add(legVertical.mesh, legHorizontal.mesh, legDiagonal.mesh, geometryPulse)
  world.add(triangle)

  const cone = new THREE.Group()
  const rimTop = ring('ice', 2.2, 2.2, 0.49)
  const rimBottom = ring('violet', -2.2, 2.2, 0.25)
  cone.add(rimTop, rimBottom)
  const histories = Array.from({ length: 9 }, (_, i) => {
    const t = (i + 1) / 10 * 2.2
    const mesh = ring('ice', t, t, 0.075); cone.add(mesh); return mesh
  })
  const liveRing = ring('white', 1, 1, 0.7); cone.add(liveRing)
  const eventOrigin = beacon('white', 0.07), reception = beacon('white', 0.05), exterior = beacon('violet', 0.045)
  const xTick = beacon('ice', 0.016), tTick = beacon('warm', 0.016)
  const eventA = beacon('ice', 0.05), eventB = beacon('ice', 0.05)
  eventA.position.set(-0.75, 0.35, 0); eventB.position.set(0.75, 0.35, 0)
  const observer = new THREE.Mesh(sphereGeometry, material('warm', 0.18)); observer.scale.setScalar(0.065)
  cone.add(eventOrigin, reception, exterior, eventA, eventB, observer, xTick, tTick)
  world.add(cone)
  const massLine = tube('warm', 48, 0.014, 0.84)
  const nullLine = tube('white', 40, 0.013, 0.8)
  const xProjection = tube('ice', 24, 0.006, 0.45)
  const tProjection = tube('warm', 24, 0.006, 0.45)
  const flashes = tube('ice', 24, 0.006, 0.4)
  cone.add(massLine.mesh, nullLine.mesh, xProjection.mesh, tProjection.mesh, flashes.mesh)
  const axes = new THREE.Group()
  for (const [to, color] of [[v(2.4, 0, 0), 'ice'], [v(0, 2.5, 0), 'violet']] as const) {
    const axis = tube(color, 24, 0.006, 0.2); axis.update((t, point) => point.copy(to).multiplyScalar(t)); axes.add(axis.mesh)
  }
  cone.add(axes)
  const nowMaterial = own(new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0.14 }, uColor: { value: new THREE.Color(COLORS.warm) } }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform float uOpacity;uniform vec3 uColor;varying vec2 vUv;void main(){vec2 g=abs(fract(vUv*8.0-0.5)-0.5)/fwidth(vUv*8.0);float grid=1.0-min(min(g.x,g.y),1.0);float edge=1.0-smoothstep(0.0,0.04,min(min(vUv.x,vUv.y),min(1.0-vUv.x,1.0-vUv.y)));gl_FragColor=vec4(uColor*(0.9+edge),uOpacity*(0.16+grid*0.13+edge*0.5));}`,
  }))
  const nowGeometry = own(new THREE.PlaneGeometry(3.8, 3.8, 1, 1)); nowGeometry.rotateX(-Math.PI / 2)
  const nowPlane = new THREE.Mesh(nowGeometry, nowMaterial); nowPlane.frustumCulled = false; cone.add(nowPlane)
  const nowPositions = new Float32Array(nowGeometry.attributes.position.array)

  const medium = new THREE.Group()
  const glass = own(new THREE.MeshPhysicalMaterial({
    color: 0xb5dbf2, roughness: 0.18, metalness: 0.1, transmission: 0,
    ior: 1.5, clearcoat: 0.7, clearcoatRoughness: 0.18,
    transparent: true, opacity: 0.085, depthWrite: false, side: THREE.DoubleSide,
  }))
  // The continuous field crosses the crystal's two plane faces at x=±0.65.
  // A translucent surface is deliberate: Three's transmission capture omits
  // transparent ribbons, which would hide the very mechanism being explained.
  const crystal = new THREE.Mesh(own(new THREE.BoxGeometry(1.3, 1.95, 1.55)), glass)
  const crystalEdges = new THREE.LineSegments(own(new THREE.EdgesGeometry(crystal.geometry)), own(new THREE.LineBasicMaterial({ color: 0xc4e8ff, transparent: true, opacity: 0.45 })))
  medium.add(crystal, crystalEdges)
  const waveE = tube('ice', 180, 0.019, 0.95), waveB = tube('violet', 180, 0.014, 0.65)
  medium.add(waveE.mesh, waveB.mesh)
  function fieldRibbon(color: RGB) {
    const segments = 180
    const geometry = own(new THREE.BufferGeometry())
    const vertices = new Float32Array((segments + 1) * 6)
    const indices: number[] = []
    for (let i = 0; i < segments; i++) indices.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2)
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3).setUsage(THREE.DynamicDrawUsage)); geometry.setIndex(indices)
    const mesh = new THREE.Mesh(geometry, own(new THREE.MeshBasicMaterial({ color: COLORS[color], transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })))
    mesh.frustumCulled = false; medium.add(mesh)
    return { mesh, geometry, vertices, segments }
  }
  const ribbons = [fieldRibbon('ice'), fieldRibbon('violet')]
  const oscillatorMaterial = material('warm', 0.8, 0.58)
  const oscillators = own(new THREE.InstancedMesh(own(new THREE.SphereGeometry(0.032, 8, 6)), oscillatorMaterial, 28))
  medium.add(oscillators)
  world.add(medium)
  const oscillatorTransform = new THREE.Object3D()

  // A small original HDR bloom pass. The blur runs at one quarter resolution,
  // and all render targets are owned/disposed with this scene.
  const targetType = gl.extensions.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType
  const frameTarget = own(new THREE.WebGLRenderTarget(1, 1, { type: targetType, depthBuffer: true, samples: 2 }))
  const bloomA = own(new THREE.WebGLRenderTarget(1, 1, { type: targetType, depthBuffer: false }))
  const bloomB = own(new THREE.WebGLRenderTarget(1, 1, { type: targetType, depthBuffer: false }))
  const quadScene = new THREE.Scene(), quadCamera = new THREE.Camera()
  const quad = new THREE.Mesh<THREE.PlaneGeometry, THREE.Material>(own(new THREE.PlaneGeometry(2, 2)), own(new THREE.MeshBasicMaterial()))
  quadScene.add(quad)
  const blur = own(new THREE.ShaderMaterial({
    uniforms: { uMap: { value: frameTarget.texture }, uStep: { value: new THREE.Vector2() }, uThreshold: { value: 0.9 } },
    vertexShader: screenVertex,
    fragmentShader: `uniform sampler2D uMap;uniform vec2 uStep;uniform float uThreshold;varying vec2 vUv;
vec3 sampleLight(vec2 p){vec3 c=texture2D(uMap,p).rgb;return c*max(0.0,max(max(c.r,c.g),c.b)-uThreshold)/max(0.001,max(max(c.r,c.g),c.b));}
void main(){vec3 c=sampleLight(vUv)*0.227027;c+=(sampleLight(vUv+uStep*1.384615)+sampleLight(vUv-uStep*1.384615))*0.316216;c+=(sampleLight(vUv+uStep*3.230769)+sampleLight(vUv-uStep*3.230769))*0.070270;gl_FragColor=vec4(c,1.0);}`,
    depthTest: false, depthWrite: false, toneMapped: false,
  }))
  const composite = own(new THREE.ShaderMaterial({
    uniforms: { uFrame: { value: frameTarget.texture }, uBloom: { value: bloomB.texture }, uCenter: { value: new THREE.Vector2(0.68, 0.5) } },
    vertexShader: screenVertex,
    fragmentShader: `uniform sampler2D uFrame;uniform sampler2D uBloom;uniform vec2 uCenter;varying vec2 vUv;
void main(){vec3 c=texture2D(uFrame,vUv).rgb+texture2D(uBloom,vUv).rgb*0.46;float halo=exp(-dot((vUv-uCenter)*vec2(1.1,0.9),(vUv-uCenter)*vec2(1.1,0.9))*7.0);c+=vec3(0.007,0.010,0.018)*halo;gl_FragColor=vec4(c,1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`,
    depthTest: false, depthWrite: false,
  }))

  const projected = v()
  const queuedLabels: { text: string; at: THREE.Vector3; color: RGB; alpha: number; dx: number; dy: number; align: 'center' | 'right' | 'left'; emphasis: boolean }[] = []
  function annotate(text: string, at: THREE.Vector3, color: RGB, alpha: number, dx = 0, dy = 0, align: 'center' | 'right' | 'left' = 'center', emphasis = false) {
    if (alpha > 0.04) queuedLabels.push({ text, at: at.clone(), color, alpha, dx, dy, align, emphasis })
  }
  function drawLabels(state: State) {
    ink.setTransform(dpr, 0, 0, dpr, 0, 0); ink.clearRect(0, 0, width, height)
    if (state.immersive) return
    const mobile = width < 760
    const top = mobile ? (state.contentBottom ?? height * 0.32) + 12 : 70
    ink.font = `400 ${mobile ? 10 : 12}px "Inter","PingFang SC",sans-serif`
    ink.textAlign = 'center'; ink.textBaseline = 'middle'
    for (const item of queuedLabels) {
      projected.copy(item.at).applyMatrix4(world.matrixWorld).project(camera)
      const y = (1 - projected.y) * height / 2 + item.dy
      if (y < top || y > height - (mobile ? 163 : 92) || projected.z > 1) continue
      const text = state.tx(item.text)
      ink.font = `${item.emphasis ? 500 : 400} ${item.emphasis ? mobile ? 12 : 16 : mobile ? 10 : 12}px "Inter","PingFang SC",sans-serif`
      const half = ink.measureText(text).width / 2
      const alignment = item.align === 'right' ? -half : item.align === 'left' ? half : 0
      const x = clamp((projected.x + 1) * width / 2 + item.dx + alignment, half + 12, width - half - 12)
      ink.globalAlpha = clamp(item.alpha * 0.86)
      ink.fillStyle = `#${COLORS[item.color].toString(16).padStart(6, '0')}`
      ink.fillText(text, x, y)
    }
    ink.globalAlpha = 1
  }

  function drawScene(state: State) {
    const time = Math.max(0, state.time), chapter = clamp(state.chapter, 0, 6), beta = clamp(state.beta, -0.98, 0.98)
    const mobile = width < 760
    const clockWeight = bump(chapter, 1), mediumWeight = bump(chapter, 5)
    const coneWeight = smooth(1, 2, chapter) * (1 - smooth(4, 5, chapter)) + smooth(5, 6, chapter)
    const sphereWeight = 1 - smooth(0, 1, chapter)
    const lesson = sphereWeight > 0.01 && !state.experiment ? state.lesson : undefined
    const lessonSeconds = Math.max(0, state.lessonTime ?? (state.lessonProgress ?? 0) * (lesson === 'speed' ? 3 : 1))
    const lessonDuration = lesson === 'speed' ? 3 : 1
    const measuredSeconds = Math.min(lessonDuration, lessonSeconds % (lessonDuration + 1.2))
    const lessonPhase = measuredSeconds / lessonDuration
    const geometry = Boolean(state.showGeometry) && clockWeight > 0.01
    const geometryAmount = geometry ? state.experiment ? 1 : smooth(47, 61, time) : 0
    const leg = lightClockLegGeometry(beta, H)
    const direction = state.frame === 'ship' ? -1 : 1
    const signedHorizontal = leg.reflectionLab.x * direction
    const absHorizontal = Math.abs(signedHorizontal)
    // One unfolded half-trip, sampled at one common coordinate time. In the
    // film it finishes at reflection; free exploration replays the experiment.
    const geometryProgress = state.experiment ? fract(time / leg.tLab) : smooth(47, 61, time)
    const clockTime = geometry ? geometryProgress * leg.tLab : time
    queuedLabels.length = 0

    // Fit a genuine 3D volume into the copy's remaining rectangle. The
    // perspective camera moves continuously; x, y and ct are never stretched.
    const safeTop = state.immersive ? 48 : mobile ? (state.contentBottom ?? height * 0.34) + 20 : 90
    const safeBottom = height - (state.immersive ? 45 : mobile ? 166 : lerp(115, 145, coneWeight))
    const centerX = state.immersive ? width * 0.5 : mobile ? width * (geometry ? 0.55 : 0.5) : width * 0.697
    const centerY = (safeTop + safeBottom) / 2
    const targetWidth = width * (mobile ? 0.92 : state.immersive ? 0.88 : 0.55)
    const targetHeight = Math.max(110, safeBottom - safeTop)
    const stacked = mobile && state.immersive && !geometry
    const sceneWidth = lerp(lerp(lerp(lesson ? 5.5 : 4.65, 5.5, coneWeight), 6.65, mediumWeight), geometry ? absHorizontal + 4.2 : stacked ? 4.0 : 5.7, clockWeight)
    const sceneHeight = lerp(lerp(5.0, 6.3, coneWeight), stacked ? 7.6 : 4.2, clockWeight)
    const unitsPerPixel = Math.max(sceneWidth / targetWidth, sceneHeight / targetHeight)
    const verticalFov = THREE.MathUtils.degToRad(camera.fov)
    const distance = unitsPerPixel * height / (2 * Math.tan(verticalFov / 2))
    const yaw = -0.23 + state.orbit * 0.46 + (state.reducedMotion || state.experiment ? 0 : Math.sin(time * 0.035) * 0.045)
    const elevation = lerp(0.18, 0.16, coneWeight) - clockWeight * 0.055
    camera.position.set(Math.sin(yaw) * distance, Math.sin(elevation) * distance, Math.cos(yaw) * Math.cos(elevation) * distance)
    camera.lookAt(0, -0.06 * clockWeight, 0)
    camera.aspect = width / height
    camera.setViewOffset(width, height, width / 2 - centerX, height / 2 - centerY, width, height)
    camera.updateProjectionMatrix(); camera.updateMatrixWorld()
    world.rotation.set(0, 0, 0)
    composite.uniforms.uCenter.value.set(centerX / width, 1 - centerY / height)

    const pulseAge = fract(time * 0.07 + 0.66)
    const radius = lesson === 'light' || lesson === 'unit' ? Math.max(0.002, 2.1 * lessonPhase) : 0.18 + pulseAge * 2.03
    const pulseFade = smooth(0, 0.13, pulseAge) * (1 - smooth(0.89, 1, pulseAge))
    const opticalOpacity = lerp(0.95 * pulseFade, 0.055, clockWeight) * (1 - mediumWeight * 0.93)
    const lessonWaveOpacity = lesson === 'speed' || lesson === 'ball' ? 0 : lesson ? 0.48 : 1
    const membraneOpacity = opticalOpacity * sphereWeight * lessonWaveOpacity + coneWeight * 0.61 + clockWeight * 0.025 + mediumWeight * 0.025
    Object.assign(membraneMaterial.uniforms.uSphere, { value: sphereWeight })
    membraneMaterial.uniforms.uClock.value = clockWeight
    membraneMaterial.uniforms.uCone.value = coneWeight
    membraneMaterial.uniforms.uMedium.value = mediumWeight
    membraneMaterial.uniforms.uRadius.value = radius
    membraneMaterial.uniforms.uOpacity.value = membraneOpacity
    membraneMaterial.uniforms.uTime.value = time
    membraneMaterial.uniforms.uUnknown.value = smooth(5, 6, chapter)
    membrane.visible = membraneOpacity > 0.001
    for (const layer of pulseLayers) {
      layer.mesh.visible = sphereWeight > 0.001 && !lesson
      layer.material.uniforms.uSphere.value = 1; layer.material.uniforms.uClock.value = 0; layer.material.uniforms.uCone.value = 0; layer.material.uniforms.uMedium.value = 0
      layer.material.uniforms.uRadius.value = radius * layer.factor
      layer.material.uniforms.uOpacity.value = sphereWeight * pulseFade * 0.13
    }
    const sourceX = state.frame === 'lab' ? 0 : -beta * radius
    const shipX = state.frame === 'lab' ? beta * radius : 0
    source.position.set(sourceX, 0, 0); ship.position.set(shipX, 0, 0)
    pulseTip.position.set(radius, 0, 0)
    fade(source, sphereWeight * pulseFade * (lesson ? 0 : 1)); fade(ship, sphereWeight * pulseFade * (lesson ? 0 : 1)); fade(pulseTip, sphereWeight * pulseFade * (lesson ? 0 : 1))
    fade(chaseRay.mesh, sphereWeight * 0.65 * (lesson ? 0 : 1))
    chaseRay.update((t, point) => point.set(radius * t, 0, 0))
    if (!lesson) {
      annotate('实验室', source.position, 'ice', sphereWeight, 0, 26)
      annotate('飞船', ship.position, 'warm', sphereWeight, 0, -31)
      annotate('光', pulseTip.position, 'white', sphereWeight, 16, -7)
    }
    fade(measurement, lesson ? sphereWeight : 0)
    if (lesson) {
      const number = (value: number) => Number(value.toFixed(2)).toString()
      const label = (text: string, at: THREE.Vector3, color: RGB = 'white', dy = 0, emphasis = true) => annotate(text, at, color, sphereWeight, 0, dy, 'center', emphasis)
      const everyday = lesson === 'speed' || lesson === 'ball'
      const start = everyday ? -2.1 : 0
      const span = everyday ? 4.2 : 2.1
      const trackY = lesson === 'ball' ? 0.48 : -0.25
      firstRuler.set(start, trackY, span, lesson === 'speed' ? 6 : lesson === 'ball' ? 10 : 4, lessonPhase)
      secondRuler.group.visible = lesson === 'ball' || lesson === 'light'
      distanceBracket.mesh.visible = lesson === 'ball'
      ballProjection.mesh.visible = followerProjection.mesh.visible = lesson === 'ball'
      measuredBall.visible = everyday
      follower.visible = lesson === 'ball'
      measuredLight.visible = !everyday
      transformedLight.visible = lesson === 'light'
      rulerClock.visible = lesson !== 'light'
      measuredBall.position.set(start + span * lessonPhase, trackY + 0.15, 0)
      measuredLight.position.set(span * lessonPhase, 0, 0)
      // One turn is the demonstrated trip. The dial remains coupled to the
      // labelled time and holds at arrival before a fresh experiment starts.
      rulerClock.position.set(lesson === 'unit' ? -0.72 : 0, -0.75, 0)
      hand.rotation.z = -TAU * lessonPhase
      if (lesson === 'speed') {
        label('0 m', v(start, trackY - 0.25, 0), 'ice', 0, false)
        label('6 m', v(start + span, trackY - 0.25, 0), 'ice', 0, false)
        label(`${number(measuredSeconds * 2)} m`, v(measuredBall.position.x, trackY + 0.5, 0), 'ice')
        label(`${number(measuredSeconds)} s`, v(0, -1.16, 0))
        label('6 m / 3 s = 2 m/s', v(0, 1.02, 0))
      } else if (lesson === 'ball') {
        secondRuler.set(start, -0.62, span, 10, lessonPhase * 0.6)
        follower.position.set(start + span * lessonPhase * 0.6, -0.47, 0)
        const ballX = measuredBall.position.x, followingX = follower.position.x
        distanceBracket.update((t, point) => point.set(lerp(followingX, ballX, t), -1.13, 0))
        ballProjection.update((t, point) => point.set(ballX, lerp(trackY, -1.13, t), 0))
        followerProjection.update((t, point) => point.set(followingX, lerp(-0.62, -1.13, t), 0))
        label(`${state.tx('小球')} · 10 m/s`, v(0, 1.08, 0), 'ice')
        label(`${state.tx('追逐者')} · 6 m/s`, v(0, -0.23, 0), 'warm')
        label(`${number(measuredSeconds * 4)} m`, v((followingX + ballX) / 2, -1.42, 0))
        rulerClock.position.set(-1.67, -1.22, 0)
        label(`${number(measuredSeconds)} s`, v(-1.67, -1.66, 0), 'white', 0, false)
        label('10 − 6 = 4 m/s', v(0, 1.7, 0))
      } else if (lesson === 'light') {
        // These are coordinates of the same null event, transformed at beta
        // 0.8. The second ruler is one third as long and its elapsed time is
        // one third as large. A lab-frame gap rate is never a ship reading.
        const doppler = transformEvent({ x: 1, ct: 1 }, 0.8).x
        secondRuler.set(0, -1.15, span * doppler, 4, lessonPhase)
        transformedLight.position.set(span * doppler * lessonPhase, -0.9, 0)
        source.position.set(0, 0, 0); fade(source, sphereWeight)
        ship.position.set(0, -0.9, 0); fade(ship, sphereWeight)
        label(state.tx('实验室测量'), v(-0.87, 0.51, 0), 'ice', 0, false)
        label('c', v(1.07, 0.6, 0), 'ice')
        label(state.tx('飞船测量'), v(-0.87, -1.52, 0), 'warm', 0, false)
        label('c', v(1.05, -1.54, 0), 'warm')
        label(state.tx('两次测量，都是 c'), v(0.38, 1.25, 0))
      } else {
        source.position.set(0, 0, 0); fade(source, sphereWeight)
        label('0', v(0, -0.58, 0), 'ice', 0, false)
        label(`1 ${state.tx('光秒')}`, v(span, -0.58, 0), 'ice', 0, false)
        label(state.tx('约 300,000 km'), v(span / 2, 0.73, 0))
        label(`${number(measuredSeconds)} s`, v(-0.72, -1.18, 0))
        label(`${number(lessonPhase)} ${state.tx('光秒')}`, v(span / 2, -1.05, 0), 'ice')
      }
    }

    const stationaryX = geometry ? -(absHorizontal / 2 + 1.55) : stacked ? -0.6 : -1.72
    const movingX = geometry ? signedHorizontal / 2 + 0.55 : stacked ? 1.0 : 1.8
    const emissionX = movingX - signedHorizontal
    const elapsedAlpha = state.experiment ? 1 : 1 - smooth(42, 43, time) + smooth(61, 63, time)
    for (let i = 0; i < clocks.length; i++) {
      const clock = clocks[i], rate = i ? properTimeRate(beta) : 1
      const clockColor: RGB = (i === 0) === (state.frame === 'lab') ? 'ice' : 'warm'
      if (clock.color !== clockColor) {
        clock.color = clockColor
        clock.alloy.color.set(COLORS[clockColor]).lerp(new THREE.Color(0xe6edf0), 0.63)
        clock.alloy.emissive.set(COLORS[clockColor])
        clock.edge.color.set(COLORS[clockColor]).multiplyScalar(2.4)
        clock.trace.mesh.material.color.set(COLORS[clockColor]).multiplyScalar(2.4)
        clock.light.color.set(COLORS[clockColor])
        for (const group of [clock.pulse, clock.ghost]) group.traverse(object => {
          if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshBasicMaterial) {
            object.material.color.set(COLORS[clockColor]).multiplyScalar(group === clock.pulse ? 2.4 : 1)
          } else if (object instanceof THREE.Sprite) object.material.color.set(COLORS[clockColor])
        })
      }
      const yCenter = stacked ? i ? -1.93 : 1.62 : 0
      const x = i ? geometry ? lerp(emissionX, movingX, geometryProgress) : movingX : stationaryX
      const actualBeta = i ? beta * direction : 0
      const phase = fract(clockTime * rate / (2 * H))
      const photonY = -H / 2 + H * (1 - Math.abs(2 * phase - 1))
      clock.group.position.set(x, yCenter, 0)
      clock.pulse.position.set(0, photonY, 0); clock.light.position.copy(clock.pulse.position)
      const reflectionDistance = Math.min(phase, Math.abs(phase - 0.5), 1 - phase)
      clock.light.intensity = clockWeight * (0.75 + 1.2 * (1 - smooth(0, 0.15, reflectionDistance)))
      fade(clock.group, clockWeight)
      clock.pulse.visible = !(geometry && i === 1)
      const lookback = Math.min(H / rate * 1.6, 3.65 / Math.max(0.15, Math.abs(actualBeta)))
      clock.trace.update((u, point) => {
        const lag = (1 - u) * lookback
        const p = fract((clockTime - lag) * rate / (2 * H))
        point.set(x - actualBeta * lag, yCenter - H / 2 + H * (1 - Math.abs(2 * p - 1)), 0)
      })
      fade(clock.trace.mesh, clockWeight * (1 - geometryAmount * (i ? 0.83 : 0)))
      clock.ghost.position.set(geometry ? emissionX : x - actualBeta * lookback, yCenter, 0)
      fade(clock.ghost, i ? clockWeight * (geometry ? 0.5 : 0.6) : 0)
      annotate(i ? '运动钟' : '本参考系静止钟', v(x, yCenter + H / 2 + 0.28, 0), clock.color, clockWeight, 0, -20)
      // The unfolded demonstration uses the narrative's three-light-second
      // mirror gap; all displayed lengths and times share this uniform scale.
      const elapsedSeconds = clockTime * rate * (geometry ? 3 / H : 1)
      if (elapsedAlpha > 0.01) annotate(`${elapsedSeconds.toFixed(1)} s`, v(x, yCenter - H / 2 - 0.3, 0), clock.color, clockWeight * elapsedAlpha, 0, 13)
    }
    fade(triangle, clockWeight * geometryAmount)
    if (geometry) {
      const endX = movingX, startX = endX - signedHorizontal
      const bottom = -H / 2, top = H / 2
      legVertical.update((t, point) => point.set(startX, lerp(bottom, top, t * geometryAmount), 0))
      legHorizontal.update((t, point) => point.set(lerp(startX, endX, t * geometryAmount), top, 0))
      legDiagonal.update((t, point) => point.set(lerp(startX, endX, t * geometryAmount), lerp(bottom, top, t * geometryAmount), 0))
      const q = geometryProgress
      geometryPulse.position.set(lerp(startX, endX, q), lerp(bottom, top, q), 0)
      const formatLength = (value: number) => Number((value * 3 / H).toFixed(2)).toString()
      const sideLabel = (name: string, value: number) => `${mobile ? '' : `${state.tx(name)} `}${formatLength(value)} ${state.tx('光秒')}`
      annotate(sideLabel('镜距', H), v(startX, 0, 0), 'ice', clockWeight * geometryAmount, -14, 0, 'right')
      annotate(sideLabel('镜子位移', absHorizontal), v((startX + endX) / 2, top, 0), 'warm', clockWeight * geometryAmount, 0, -22)
      annotate(sideLabel('光路', leg.hypotenuse), v((startX + endX) / 2, 0, 0), 'white', clockWeight * geometryAmount, mobile ? 10 : 0, mobile ? -20 : -30)
    }

    const coneAlpha = smooth(1.1, 2, chapter) * (1 - smooth(4.15, 5, chapter)) + smooth(5.15, 6, chapter)
    fade(cone, coneAlpha)
    const energy = bump(chapter, 4)
    const tilted = beta * direction
    const observerColor = state.frame === 'lab' ? COLORS.warm : COLORS.ice
    observer.material.color.set(observerColor); observer.material.emissive.set(observerColor)
    massLine.mesh.material.color.set(observerColor).multiplyScalar(2.4)
    nowMaterial.uniforms.uColor.value.set(observerColor)
    const eventAge = fract(time * 0.095 + 0.35)
    liveRing.position.y = eventAge * 2.2; liveRing.scale.setScalar(Math.max(0.001, eventAge * 2.2))
    for (const history of histories) history.visible = coneAlpha > 0.001
    massLine.update((t, point) => { const ct = lerp(-1.9, 2.1, t); point.set(tilted * ct, ct, 0) }, 0.013 + energy * 0.008)
    const massiveT = lerp(0.5, 1.9, fract(time * 0.045 + 0.3))
    observer.position.set(tilted * massiveT, massiveT, 0)
    observer.material.emissiveIntensity = 0.2 + energy * leg.gamma * 0.12
    const nowArray = nowGeometry.attributes.position.array as Float32Array
    const simultaneity = bump(chapter, 2)
    for (let i = 0; i < nowArray.length; i += 3) {
      nowArray[i] = nowPositions[i]; nowArray[i + 1] = tilted * nowPositions[i] + 0.35 * simultaneity; nowArray[i + 2] = nowPositions[i + 2]
    }
    nowGeometry.attributes.position.needsUpdate = true
    nowMaterial.uniforms.uOpacity.value = coneAlpha * (state.experiment ? 0.28 : 0.13) * (1 - energy * 0.6)
    const showMeasurement = state.showMeasurements || state.experiment || chapter >= 2.75 && chapter <= 4
    const receive = state.frame === 'ship' ? transformEvent({ x: 1, ct: 1 }, beta) : { x: 1, ct: 1 }
    reception.position.set(receive.x, receive.ct, 0)
    reception.visible = coneAlpha > 0.01 && Boolean(showMeasurement)
    nullLine.update((t, point) => point.set(receive.x * t, receive.ct * t, 0))
    nullLine.mesh.visible = reception.visible
    xProjection.update((t, point) => point.set(receive.x, receive.ct * t, 0))
    tProjection.update((t, point) => point.set(receive.x * t, receive.ct, 0))
    xProjection.mesh.visible = Boolean(showMeasurement) && coneAlpha > 0.01
    tProjection.mesh.visible = xProjection.mesh.visible
    xTick.position.set(receive.x, 0, 0); tTick.position.set(0, receive.ct, 0)
    xTick.visible = tTick.visible = xProjection.mesh.visible
    const exteriorVisible = !state.experiment && chapter > 2.7 && chapter < 4.1
    exterior.position.set(1.7, 0.6, 0); exterior.visible = exteriorVisible
    eventA.visible = eventB.visible = simultaneity > 0.1 && !state.showMeasurements
    flashes.mesh.visible = eventA.visible
    flashes.update((t, point) => point.set(lerp(-0.75, 0.75, t), 0.35, 0))
    if (eventA.visible) {
      const a = transformEvent({ x: -0.75, ct: 0.35 }, beta)
      const b = transformEvent({ x: 0.75, ct: 0.35 }, beta)
      annotate(`A · t′=${a.ct.toFixed(2)}`, eventA.position, 'warm', coneAlpha, -16, -20)
      annotate(`B · t′=${b.ct.toFixed(2)}`, eventB.position, 'warm', coneAlpha, 16, -20)
    }
    if (showMeasurement) {
      annotate('接收事件', reception.position, 'white', coneAlpha, 33, -15)
      annotate('此时此地', v(), 'white', coneAlpha, -23, 22)
    }
    if (exteriorVisible) annotate('来不及到达的事件', exterior.position, 'violet', coneAlpha, 0, 19)
    annotate('时间 ct', v(0, 2.5, 0), 'violet', coneAlpha * (1 - energy), 0, -7)
    annotate('空间 x', v(2.4, 0, 0), 'ice', coneAlpha * (1 - energy), 7, 12)

    fade(medium, mediumWeight)
    const n = clamp(state.refractiveIndex, 1, 2.5)
    glass.ior = n
    const wavelength = state.wavelength > 10 ? lerp(0.68, 1.1, clamp((state.wavelength - 380) / 400)) : clamp(state.wavelength, 0.4, 1.2)
    const k = TAU / wavelength, omega = k * 0.7
    const waveAt = (x: number) => Math.sin(k * (x + (n - 1) * clamp(x + 0.65, 0, 1.3)) - omega * time) * 0.46 * smooth(-3, -2.65, x) * (1 - smooth(2.65, 3, x))
    waveE.update((t, point) => { const x = lerp(-3, 3, t); point.set(x, waveAt(x), 0) })
    waveB.update((t, point) => { const x = lerp(-3, 3, t); point.set(x, 0, waveAt(x)) })
    for (let field = 0; field < ribbons.length; field++) {
      const ribbon = ribbons[field]
      for (let i = 0; i <= ribbon.segments; i++) {
        const x = lerp(-3, 3, i / ribbon.segments), displacement = waveAt(x), at = i * 6
        ribbon.vertices[at] = x; ribbon.vertices[at + 1] = 0; ribbon.vertices[at + 2] = 0
        ribbon.vertices[at + 3] = x; ribbon.vertices[at + 4] = field === 0 ? displacement : 0; ribbon.vertices[at + 5] = field === 1 ? displacement : 0
      }
      ribbon.geometry.attributes.position.needsUpdate = true
    }
    for (let i = 0; i < 28; i++) {
      const x = lerp(-0.52, 0.52, (i % 7) / 6), row = Math.floor(i / 7)
      oscillatorTransform.position.set(x, (row % 2 ? 1 : -1) * 0.62 + waveAt(x) * 0.2 * (n - 1), row < 2 ? -0.43 : 0.43)
      oscillatorTransform.updateMatrix(); oscillators.setMatrixAt(i, oscillatorTransform.matrix)
    }
    oscillators.instanceMatrix.needsUpdate = true
    annotate('真空', v(-2.0, -0.7, 0), 'ice', mediumWeight)
    annotate('介质', v(0, 1.12, 0), 'white', mediumWeight, 0, -10)
    annotate('真空', v(2, -0.7, 0), 'ice', mediumWeight)
    if (time >= 202 && time < 212 && !state.experiment) annotate(time < 207 ? 'c = 299,792,458 m/s' : '1 光秒 / 秒', v(2.05, 0.85, 0), 'white', mediumWeight)
    world.updateMatrixWorld(true)

    gl.setRenderTarget(frameTarget); gl.render(scene, camera)
    quad.material = blur
    blur.uniforms.uMap.value = frameTarget.texture; blur.uniforms.uThreshold.value = 0.8
    blur.uniforms.uStep.value.set(2 / Math.max(1, width * dpr), 0)
    gl.setRenderTarget(bloomA); gl.render(quadScene, quadCamera)
    blur.uniforms.uMap.value = bloomA.texture; blur.uniforms.uThreshold.value = 0
    blur.uniforms.uStep.value.set(0, 1 / Math.max(1, bloomA.height))
    gl.setRenderTarget(bloomB); gl.render(quadScene, quadCamera)
    quad.material = composite
    gl.setRenderTarget(null); gl.render(quadScene, quadCamera)
    drawLabels(state)
  }

  const contextLost = (event: Event) => { event.preventDefault(); if (!disposed) { activateFallback(); labelCanvas.style.display = 'none' } }
  canvas.addEventListener('webglcontextlost', contextLost)
  return {
    draw(state) {
      if (disposed || width <= 1 || height <= 1) return
      if (fallback) { fallback.draw(state); return }
      try { drawScene(state) } catch (error) { labelCanvas.style.display = 'none'; activateFallback(error).draw(state) }
    },
    resize(w, h, ratio) {
      if (disposed) return
      width = Math.max(1, w); height = Math.max(1, h); dpr = clamp(ratio, 1, width < 760 ? 1.6 : 1.75)
      gl.setPixelRatio(dpr); gl.setSize(width, height, false)
      frameTarget.samples = Math.min(gl.capabilities.maxSamples, width < 760 ? 2 : 4)
      canvas.dataset.lightSpeedSamples = String(frameTarget.samples)
      frameTarget.setSize(Math.round(width * dpr), Math.round(height * dpr))
      bloomA.setSize(Math.max(1, Math.round(width * dpr / 4)), Math.max(1, Math.round(height * dpr / 4)))
      bloomB.setSize(bloomA.width, bloomA.height)
      labelCanvas.width = Math.round(width * dpr); labelCanvas.height = Math.round(height * dpr)
      fallback?.resize(width, height, dpr)
    },
    dispose() {
      if (disposed) return
      disposed = true
      canvas.removeEventListener('webglcontextlost', contextLost)
      fallback?.dispose(); fallbackCanvas?.remove(); labelCanvas.remove(); canvas.style.opacity = oldOpacity
      delete canvas.dataset.lightSpeedSamples
      scene.environment = null
      for (const resource of resources) resource.dispose()
      // React may reconnect this effect with the same canvas. Dispose our
      // renderer resources without permanently invalidating its GL context.
      resources.clear(); gl.dispose()
      glowCanvas.width = glowCanvas.height = 1
    },
  }
  } catch (error) {
    // Shader compilation or environment setup can fail after obtaining a
    // context. Release partial resources before attaching the 2D sibling.
    labels?.remove()
    for (const resource of resources) resource.dispose()
    resources.clear()
    renderer.dispose()
    const failed = activateFallback(error)
    return {
      draw: state => failed.draw(state),
      resize(w, h, ratio) { width = w; height = h; dpr = ratio; failed.resize(w, h, ratio) },
      dispose() { failed.dispose(); fallbackCanvas?.remove(); canvas.style.opacity = oldOpacity },
    }
  }
}
