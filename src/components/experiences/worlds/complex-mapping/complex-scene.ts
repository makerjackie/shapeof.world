import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { type ComplexFnId } from './complex-mapping-model'
import { sampleComplexSurface, type SurfaceComponent, type SurfaceSample } from './complex-surface-model'

export type SceneSettings = {
  fn: ComplexFnId
  component: SurfaceComponent
  amount: number
  mapping: boolean
  wireOnly: boolean
  axes: boolean
  rotating: boolean
}

const VERTEX = `
attribute vec3 previous;
attribute vec2 inputZ;
attribute vec2 outputW;
uniform float transition;
varying vec3 point;
varying vec2 domain;
varying vec2 value;
void main() {
  point = mix(previous, position, transition);
  domain = inputZ;
  value = outputW;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(point, 1.0);
}`
const FRAGMENT = `
uniform float zeta;
uniform float wireOnly;
uniform float mapping;
uniform float time;
varying vec3 point;
varying vec2 domain;
varying vec2 value;
vec3 phaseColor(float a) {
  return 0.5 + 0.5 * cos(a + vec3(0.0, -2.094395, 2.094395));
}
float lineAt(vec2 p, float spacing, float width) {
  vec2 q = p / spacing;
  vec2 d = abs(fract(q - 0.5) - 0.5) / max(fwidth(q), vec2(0.0001));
  return 1.0 - smoothstep(width, width + 1.0, min(d.x, d.y));
}
void main() {
  if (abs(point.y) > 4.8 || length(point.xz) > 14.0) discard;
  float phase = atan(value.y, value.x);
  vec3 color = phaseColor(phase);
  color = mix(vec3(0.8), color, smoothstep(0.0, 0.05, length(value)));
  vec3 n = normalize(cross(dFdx(point), dFdy(point)));
  float light = 0.32 + 0.68 * abs(dot(n, normalize(vec3(-0.45, 0.8, 0.4))));
  float rim = pow(1.0 - abs(dot(n, normalize(cameraPosition - point))), 2.5);
  vec2 gridDomain = domain * vec2(1.0, mix(1.0, 1.0 / 3.0, zeta));
  float grid = lineAt(gridDomain, 0.12, 0.25);
  float major = lineAt(gridDomain, 0.8, 0.52);
  float realTrace = 1.0 - smoothstep(0.65, 1.65, abs(domain.y) / max(fwidth(domain.y), 0.00001));
  float criticalTrace = zeta * (1.0 - smoothstep(0.7, 1.7, abs(domain.x - 0.5) / max(fwidth(domain.x), 0.00001)));
  float edge = 1.0 - smoothstep(4.5, 4.8, abs(point.y));
  vec3 film = color * (0.018 + light * 0.035 + rim * 0.08);
  vec3 net = color * (0.65 + light * 0.35);
  vec3 ink = mix(film, net, max(grid * 0.72, major * 0.9));
  ink = mix(ink, vec3(1.0, 0.89, 0.64), realTrace * 0.95);
  ink = mix(ink, vec3(0.87, 0.95, 1.0), criticalTrace * 0.9);
  float alpha = mix(0.74, max(grid * 0.72, major * 0.92), max(wireOnly, mapping));
  alpha = max(alpha, max(realTrace, criticalTrace));
  if(alpha < 0.025) discard;
  gl_FragColor = vec4(ink, alpha * edge);

}`

function bounds(fn: ComplexFnId) {
  if (fn === 'zeta') return { x0: -4, x1: 4, y: 18 }
  return fn === 'exp'
    ? { x0: -2.4, x1: 1.5, y: Math.PI * 2 }
    : { x0: -Math.PI, x1: Math.PI, y: fn === 'sin' ? 2.1 : 2.8 }
}

export function createComplexScene(canvas: HTMLCanvasElement, onFailure: () => void) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x030508, 0)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100)
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.13, 0.25, 0.65)
  composer.addPass(bloom)
  const outputPass = new OutputPass()
  composer.addPass(outputPass)
  const orbit = new OrbitControls(camera, canvas)
  orbit.enableDamping = true
  orbit.dampingFactor = 0.065
  orbit.enablePan = false
  orbit.minDistance = 9
  orbit.maxDistance = 55
  orbit.minPolarAngle = 0.12
  orbit.maxPolarAngle = Math.PI - 0.12
  orbit.autoRotateSpeed = 0.36
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  let reduced = media.matches
  const updateMotion = () => { reduced = media.matches; orbit.enableDamping = !reduced }
  media.addEventListener('change', updateMotion)
  updateMotion()
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX, fragmentShader: FRAGMENT,
    uniforms: { zeta: { value: 0 }, transition: { value: 1 }, wireOnly: { value: 0 }, mapping: { value: 0 }, time: { value: 0 } },
    side: THREE.DoubleSide, transparent: true, depthWrite: true,
  })
  const geometry = new THREE.BufferGeometry()
  const mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  scene.add(mesh)
  const axes = new THREE.Group()
  const axisMaterials: THREE.LineBasicMaterial[] = []
  const axisGeometries: THREE.BufferGeometry[] = []
  for (const [end, color] of [
    [[5, 0, 0], 0xefac97], [[0, 5.2, 0], 0xc4b7f7], [[0, 0, 7.2], 0x91c4e4],
  ] as const) {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...end).multiplyScalar(-1), new THREE.Vector3(...end)])
    const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.28 })
    axes.add(new THREE.Line(g, m)); axisMaterials.push(m); axisGeometries.push(g)
  }
  scene.add(axes)
  const axisLabels: { node: HTMLSpanElement; point: THREE.Vector3 }[] = []
  for (const [label, point] of [['Re z', [5.2, 0, 0]], ['Im z', [0, 0, 7.4]], ['Re f(z)', [0, 5.4, 0]]] as const) {
    const node = document.createElement('span')
    node.className = 'cm-axis-label'
    node.dataset.experienceOverlay = 'true'
    node.textContent = label
    canvas.parentElement?.appendChild(node)
    axisLabels.push({ node, point: new THREE.Vector3(...point) })
  }
  let settings: SceneSettings = { fn: 'exp', component: 're', amount: 1, mapping: false, wireOnly: false, axes: true, rotating: true }
  let previousPositions: Float32Array | null = null
  let nextPositions: Float32Array | null = null
  let transitionStart = 0
  let lastSize = ''
  let isMobile = false
  let lastFrame = 0
  let raf = 0
  let disposed = false
  let zetaCache: { extent: number; points: SurfaceSample[] } | null = null
  const NX = 160, NY = 192

  function resetCamera() {
    camera.position.set(isMobile ? 22 : 15, isMobile ? 18 : 10.8, isMobile ? 23 : 17)
    if (settings.fn !== 'exp' && settings.fn !== 'zeta') camera.position.multiplyScalar(0.8)
    if (settings.fn === 'zeta' && isMobile) camera.position.multiplyScalar(1.12)
    orbit.target.set(0, 0, 0)
    orbit.update()
  }
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight
    if (!w || !h) return
    const key = `${w}:${h}`
    if (key === lastSize) return
    const wasMobile = isMobile
    isMobile = w < 720
    renderer.setSize(w, h, false)
    composer.setSize(w, h)
    camera.aspect = w / h
    camera.fov = isMobile ? 43 : 36
    camera.updateProjectionMatrix()
    if (!lastSize || wasMobile !== isMobile) resetCamera()
    lastSize = key
  }
  function rebuild() {
    const b = bounds(settings.fn)
    const count = (NX + 1) * (NY + 1)
    const position = new Float32Array(count * 3)
    const domain = new Float32Array(count * 2)
    const values = new Float32Array(count * 2)
    const valid = new Uint8Array(count)
    const indices: number[] = []
    const extent = settings.mapping ? 1 : Math.max(0.003, settings.amount)
    // Height and mapping switches reuse the expensive analytic continuation samples.
    const cached = settings.fn === 'zeta' && zetaCache?.extent === extent ? zetaCache.points : null
    const zetaPoints: SurfaceSample[] = []
    for (let j = 0; j <= NY; j++) {
      for (let i = 0; i <= NX; i++) {
        const k = j * (NX + 1) + i
        const x = b.x0 + (b.x1 - b.x0) * i / NX, y = (-b.y + 2 * b.y * j / NY) * extent
        const p = cached?.[k] ?? sampleComplexSurface(settings.fn, { re: x, im: y }, { component: settings.component, heightClip: 14, poleRadius: 0.045 })
        if (settings.fn === 'zeta') zetaPoints.push(p)
        const height = settings.component === 'abs' ? p.magnitude : p.value[settings.component]
        const finite = Number.isFinite(height) && Number.isFinite(p.value.re) && Number.isFinite(p.value.im)
        valid[k] = finite && p.reason !== 'pole' && (settings.mapping || Math.abs(height) < 14) ? 1 : 0
        const h = finite ? Math.max(-14, Math.min(14, height)) : 0
        position[k * 3] = settings.mapping ? x + ((finite ? p.value.re : x) - x) * settings.amount : x
        position[k * 3 + 1] = settings.mapping ? 0 : h
        position[k * 3 + 2] = settings.mapping ? y + ((finite ? p.value.im : y) - y) * settings.amount : y
        if (settings.fn === 'zeta') position[k * 3 + 2] /= 3
        domain[k * 2] = x; domain[k * 2 + 1] = y
        values[k * 2] = finite ? p.value.re : 0; values[k * 2 + 1] = finite ? p.value.im : 0
      }
    }
    zetaCache = settings.fn === 'zeta' ? { extent, points: zetaPoints } : null
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1
      for (const tri of [[a, c, b], [b, c, d]]) {
        if (!tri.every(k => valid[k])) continue
        // Do not connect the two sides of a sampled pole into a false wall.
        if (tri.some((k, n) => Math.abs(position[k * 3 + 1] - position[tri[(n + 1) % 3] * 3 + 1]) > 3)) continue
        indices.push(...tri)
      }
    }
    const t = material.uniforms.transition.value as number
    const old = nextPositions && previousPositions
      ? nextPositions.map((v, i) => previousPositions![i] + (v - previousPositions![i]) * t)
      : position.slice()
    previousPositions = old; nextPositions = position
    geometry.dispose()
    geometry.setAttribute('position', new THREE.BufferAttribute(position, 3))
    geometry.setAttribute('previous', new THREE.BufferAttribute(old, 3))
    geometry.setAttribute('inputZ', new THREE.BufferAttribute(domain, 2))
    geometry.setAttribute('outputW', new THREE.BufferAttribute(values, 2))
    geometry.setIndex(indices)
    transitionStart = performance.now()
    material.uniforms.transition.value = reduced ? 1 : 0
  }
  function set(next: SceneSettings) {
    const rebuildNeeded = ['fn', 'component', 'amount', 'mapping'].some(k => settings[k as keyof SceneSettings] !== next[k as keyof SceneSettings])
    const viewChanged = next.mapping !== settings.mapping
    const functionChanged = next.fn !== settings.fn
    settings = { ...next }
    material.uniforms.zeta.value = Number(next.fn === 'zeta')
    axisLabels[1].node.textContent = next.fn === 'zeta' ? 'Im z / 3' : 'Im z'
    material.uniforms.wireOnly.value = Number(next.wireOnly)
    material.uniforms.mapping.value = Number(next.mapping)
    axes.visible = next.axes
    axisLabels[2].node.textContent = next.component === 'abs' ? '|f(z)|' : `${next.component === 're' ? 'Re' : 'Im'} f(z)`
    if (rebuildNeeded) rebuild()
    if (viewChanged || functionChanged) {
      if (next.mapping) { camera.position.set(0.001, isMobile ? 26 : 21, 0.001); orbit.target.set(0, 0, 0); orbit.update() }
      else resetCamera()
    }
  }
  const onContextLost = (event: Event) => { event.preventDefault(); cancelAnimationFrame(raf); onFailure() }
  canvas.addEventListener('webglcontextlost', onContextLost)
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  resize(); rebuild()
  function frame(now: number) {
    if (disposed) return
    raf = requestAnimationFrame(frame)
    if (document.hidden) { lastFrame = now; return }
    const dt = Math.min((now - lastFrame) / 1000, 0.05)
    lastFrame = now
    material.uniforms.transition.value = reduced ? 1 : THREE.MathUtils.smoothstep((now - transitionStart) / 850, 0, 1)
    orbit.autoRotate = settings.rotating && !settings.mapping && !reduced
    orbit.update(dt)
    try { composer.render(dt) } catch (error) {
      cancelAnimationFrame(raf)
      console.error('Complex surface render failed', error)
      onFailure()
      return
    }
    for (const item of axisLabels) {
      const p = item.point.clone().project(camera)
      item.node.style.display = settings.axes && !settings.mapping && p.z < 1 ? '' : 'none'
      item.node.style.transform = `translate(${(p.x * 0.5 + 0.5) * canvas.clientWidth}px, ${(-p.y * 0.5 + 0.5) * canvas.clientHeight}px)`
    }
  }
  raf = requestAnimationFrame(frame)
  return {
    set,
    resetCamera,
    rotate(dx: number, dy: number) {
      const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(orbit.target))
      spherical.theta += dx; spherical.phi = Math.max(0.15, Math.min(Math.PI - 0.15, spherical.phi + dy))
      camera.position.setFromSpherical(spherical).add(orbit.target); orbit.update()
    },
    dispose() {
      disposed = true; cancelAnimationFrame(raf); observer.disconnect(); orbit.dispose()
      media.removeEventListener('change', updateMotion); canvas.removeEventListener('webglcontextlost', onContextLost)
      axisLabels.forEach(x => x.node.remove()); geometry.dispose(); material.dispose()
      axisMaterials.forEach(x => x.dispose()); axisGeometries.forEach(x => x.dispose()); bloom.dispose(); outputPass.dispose(); composer.dispose(); renderer.dispose()
    },
  }
}
