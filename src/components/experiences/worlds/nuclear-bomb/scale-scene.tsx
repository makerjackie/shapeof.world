import {useEffect, useRef} from 'react'
import * as T from 'three'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'

import {sampleEffects} from './effects'

export type ScaleAnchor = {id: string; x: number; y: number; visible: boolean}
export type ScaleOverlay = {
  width: number
  height: number
  rings: ScaleAnchor[]
  references: ScaleAnchor[]
  scaleKm: 0.1 | 1 | 10
  scalePixels: number
}

type Props = {
  yieldKt: number
  active: boolean
  onOverlay: (overlay: ScaleOverlay) => void
  onInteract: () => void
  onError: (message: string) => void
}

const RING_COLORS = {blast20: '#e0a060', blast5: '#c48a5a', blast1: '#8c7c6c', burn: '#d07050'}

function fixedRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

function makeCity() {
  const random = fixedRandom(0x7363616c)
  const geometry = new T.BoxGeometry(1, 1, 1)
  const material = new T.MeshStandardMaterial({color: '#ffffff', roughness: 0.87, metalness: 0.015})
  const mesh = new T.InstancedMesh(geometry, material, 80 * 80)
  mesh.name = 'Abstract 100 metre street blocks'
  mesh.castShadow = true
  mesh.receiveShadow = true
  const object = new T.Object3D()
  const color = new T.Color('#d8d4cc')
  const shade = new T.Color()
  let count = 0
  for (let x = 0; x < 80; x += 1) {
    for (let z = 0; z < 80; z += 1) {
      const px = (x + 0.5) * 0.1 - 4
      const pz = (z + 0.5) * 0.1 - 4
      const edge = T.MathUtils.smoothstep(Math.hypot(px, pz), 2.3, 5.45)
      if (random() > 0.94 * (1 - edge)) continue
      const height = 0.01 + random() * 0.05 * (1 - edge * 0.8)
      const width = 0.043 + random() * 0.034
      const depth = 0.044 + random() * 0.032
      object.position.set(px + (random() - 0.5) * 0.008, height / 2, pz + (random() - 0.5) * 0.008)
      object.rotation.set(0, 0, 0)
      object.scale.set(width, height, depth)
      object.updateMatrix()
      mesh.setMatrixAt(count, object.matrix)
      mesh.setColorAt(count, shade.copy(color).multiplyScalar(0.85 + random() * 0.18))
      count += 1
    }
  }
  mesh.count = count
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  return mesh
}

function makeMountain() {
  const geometry = new T.PlaneGeometry(11, 8, 36, 28)
  geometry.rotateX(-Math.PI / 2)
  const positions = geometry.getAttribute('position')
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i)
    const z = positions.getZ(i)
    const radius = Math.sqrt((x / 5.5) ** 2 + (z / 4) ** 2)
    const folds = 1 + 0.13 * Math.sin(x * 2.2 + z) * Math.sin(z * 1.7) * Math.min(1, radius * 3)
    positions.setY(i, 8.848 * Math.max(0, 1 - radius) ** 1.75 * folds)
  }
  geometry.computeVertexNormals()
  const mountain = new T.Mesh(geometry, new T.MeshStandardMaterial({color: '#59574f', roughness: 1, metalness: 0, side: T.DoubleSide}))
  mountain.position.set(-19, 0, -Math.sqrt(25 ** 2 - 19 ** 2))
  mountain.name = 'Height reference only, not a real mountain model'
  return mountain
}

function makeGround() {
  const material = new T.ShaderMaterial({
    uniforms: {span: {value: 10}},
    vertexShader: `
      varying vec3 worldPoint;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        worldPoint = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      varying vec3 worldPoint;
      uniform float span;
      float grid(vec2 p, float spacing) {
        vec2 cell = p / spacing;
        vec2 width = max(fwidth(cell), vec2(0.00001));
        vec2 distance = abs(fract(cell - 0.5) - 0.5) / width;
        float line = 1.0 - min(min(distance.x, distance.y), 1.0);
        float clarity = 1.0 - smoothstep(0.25, 0.65, max(width.x, width.y));
        return line * clarity;
      }
      void main() {
        vec2 p = worldPoint.xz;
        float cityEdge = 1.0 - smoothstep(4.1, 7.8, max(abs(p.x), abs(p.y)));
        float streets = grid(p, 0.1) * 0.045;
        float blocks = grid(p, 1.0) * 0.028;
        float pool = exp(-dot(p, p) / 34.0);
        vec3 floorColor = vec3(0.0055, 0.0058, 0.0067) + vec3(0.008, 0.0075, 0.0065) * pool;
        floorColor += vec3(0.62, 0.60, 0.55) * max(streets, blocks) * cityEdge;
        float farFade = exp(-length(p) / 240.0);
        gl_FragColor = vec4(floorColor * farFade, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
  const ground = new T.Mesh(new T.PlaneGeometry(900, 900), material)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.001
  return ground
}

function circleGeometry() {
  const points = Array.from({length: 361}, (_, i) => {
    const angle = (i / 360) * Math.PI * 2
    return new T.Vector3(Math.cos(angle), 0, Math.sin(angle))
  })
  return new T.BufferGeometry().setFromPoints(points)
}

export function ScaleScene({yieldKt, active, onOverlay, onInteract, onError}: Props) {
  const host = useRef<HTMLDivElement>(null)
  const latest = useRef({yieldKt, active, onOverlay, onInteract, onError})
  latest.current = {yieldKt, active, onOverlay, onInteract, onError}
  const bridge = useRef<{apply: (value: number, visible: boolean) => void} | null>(null)

  useEffect(() => {
    const element = host.current
    if (!element) return
    let renderer: T.WebGLRenderer
    try {
      renderer = new T.WebGLRenderer({antialias: true, alpha: false, powerPreference: 'high-performance'})
    } catch {
      latest.current.onError('WebGL unavailable')
      return
    }
    renderer.setClearColor('#0a0a0b')
    renderer.outputColorSpace = T.SRGBColorSpace
    renderer.toneMapping = T.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = T.PCFSoftShadowMap
    element.appendChild(renderer.domElement)
    renderer.domElement.setAttribute('aria-hidden', 'true')
    const scene = new T.Scene()
    const camera = new T.PerspectiveCamera(36, 1, 0.002, 3000)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.11
    controls.enablePan = false
    controls.minPolarAngle = 0.18
    controls.maxPolarAngle = Math.PI / 2 - 0.15
    controls.minDistance = 0.25
    controls.maxDistance = 2000
    const direction = new T.Vector3(0.35, Math.sin(35 * Math.PI / 180), Math.cos(35 * Math.PI / 180)).normalize()
    camera.position.copy(direction).multiplyScalar(28)
    controls.target.set(0, 0, 0)
    controls.update()

    scene.add(new T.HemisphereLight('#d4d8dc', '#272018', 0.65))
    const key = new T.DirectionalLight('#ffe8cb', 2.3)
    key.position.set(-12, 24, 9)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.left = key.shadow.camera.bottom = -5.5
    key.shadow.camera.right = key.shadow.camera.top = 5.5
    key.shadow.camera.near = 0.1
    key.shadow.camera.far = 70
    key.shadow.bias = -0.00005
    key.shadow.normalBias = 0.004
    key.shadow.radius = 3
    scene.add(key)
    const fill = new T.DirectionalLight('#b9c9db', 0.35)
    fill.position.set(7, 8, -12)
    scene.add(fill)
    const ground = makeGround()
    scene.add(ground, makeCity())
    const shadows = new T.Mesh(new T.PlaneGeometry(12, 12), new T.ShadowMaterial({color: '#000000', opacity: 0.32, depthWrite: false}))
    shadows.rotation.x = -Math.PI / 2
    shadows.position.y = -0.0005
    shadows.receiveShadow = true
    scene.add(shadows)
    const mountain = makeMountain()
    scene.add(mountain)
    const mountainBounds = new T.Box3().setFromObject(mountain)
    const mountainCorners = [mountainBounds.min.x, mountainBounds.max.x].flatMap((x) =>
      [mountainBounds.min.y, mountainBounds.max.y].flatMap((y) =>
        [mountainBounds.min.z, mountainBounds.max.z].map((z) => new T.Vector3(x, y, z))))
    const tower = new T.Mesh(new T.BoxGeometry(0.027, 0.3, 0.027), new T.MeshStandardMaterial({color: '#e5dfd2', roughness: 0.6, metalness: 0.15}))
    tower.position.set(3.65, 0.15, 2.5)
    tower.castShadow = true
    scene.add(tower)

    const effectGroup = new T.Group()
    const rings = Object.entries(RING_COLORS).map(([id, color], index) => {
      const material = id === 'burn'
        ? new T.LineDashedMaterial({color, transparent: true, opacity: 0.95, dashSize: 0.028, gapSize: 0.019, depthWrite: false, depthTest: false, toneMapped: false})
        : new T.LineBasicMaterial({color, transparent: true, opacity: 0.95, depthWrite: false, depthTest: false, toneMapped: false})
      const line = new T.Line(circleGeometry(), material)
      line.renderOrder = 5
      line.computeLineDistances()
      line.position.y = 0.004 + index * 0.0005
      effectGroup.add(line)
      const fillMesh = new T.Mesh(new T.CircleGeometry(1, 160), new T.MeshBasicMaterial({color, transparent: true, opacity: id === 'burn' ? 0.008 : 0.025, depthWrite: false, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2}))
      fillMesh.rotation.x = -Math.PI / 2
      fillMesh.position.y = 0.001 + index * 0.0004
      effectGroup.add(fillMesh)
      return {id, line, fill: fillMesh, radius: 1}
    })
    const fireballMaterial = new T.ShaderMaterial({
      transparent: true, depthWrite: false,
      vertexShader: `varying vec3 vNormal;varying vec3 vView;void main(){vec4 p=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vView=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
      fragmentShader: `varying vec3 vNormal;varying vec3 vView;void main(){float f=pow(1.-abs(dot(normalize(vNormal),normalize(vView))),2.);vec3 c=mix(vec3(2.4,1.32,.52),vec3(2.8,2.1,1.35),f);gl_FragColor=vec4(c,.14+f*.23);#include <tonemapping_fragment>\n#include <colorspace_fragment>}`.replace(';#include', ';\n#include'),
    })
    const fireball = new T.Mesh(new T.SphereGeometry(1, 64, 40), fireballMaterial)
    const rimPoints = Array.from({length: 161}, (_, i) => new T.Vector3(Math.cos(i / 160 * Math.PI * 2), Math.sin(i / 160 * Math.PI * 2), 0))
    const fireballRim = new T.Line(new T.BufferGeometry().setFromPoints(rimPoints), new T.LineBasicMaterial({color: '#ffe1b5', transparent: true, opacity: 0.7, depthWrite: false}))
    const haloMaterial = new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying vec2 vUv;void main(){float r=length((vUv-.5)*2.);float a=exp(-r*r*4.)*.075*(1.-smoothstep(.65,1.,r));gl_FragColor=vec4(1.,.62,.27,a);}',
    })
    const halo = new T.Mesh(new T.PlaneGeometry(3.4, 3.4), haloMaterial)
    effectGroup.add(fireball, fireballRim, halo)
    scene.add(effectGroup)

    let width = 1
    let height = 1
    let isActive = latest.current.active
    let targetYield = latest.current.yieldKt
    let effects = sampleEffects(targetYield)
    let targetDistance = 28
    let fitting = true
    let raf = 0
    let previous = 0
    let settleUntil = 0
    let dragging = false
    let drawing = false
    let disposed = false
    let renderCount = 0
    const worldRight = new T.Vector3()
    const point = new T.Vector3()
    const projected = new T.Vector3()
    const cameraDirection = new T.Vector3()

    const anchor = (id: string, position: T.Vector3): ScaleAnchor => {
      projected.copy(position).project(camera)
      return {id, x: (projected.x * 0.5 + 0.5) * width, y: (-projected.y * 0.5 + 0.5) * height, visible: projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 1.1 && Math.abs(projected.y) < 1.1}
    }
    const reportOverlay = () => {
      camera.updateMatrixWorld()
      worldRight.setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize()
      const ringAnchors = effects.showEffects ? rings.map((ring) => anchor(ring.id, point.copy(worldRight).multiplyScalar(ring.radius).setY(0.01))) : []
      const origin = anchor('origin', new T.Vector3())
      const choices = ([0.1, 1, 10] as const).map((km) => {
        const endpoint = anchor('end', point.copy(worldRight).multiplyScalar(km))
        return {km, pixels: Math.hypot(endpoint.x - origin.x, endpoint.y - origin.y)}
      })
      const scaleLimit = width < 720 ? 120 : 220
      const fittingChoices = choices.filter((choice) => choice.pixels <= scaleLimit)
      const scale = (fittingChoices.length ? fittingChoices : choices.slice(0, 1)).reduce((best, next) => Math.abs(Math.log(next.pixels / 105)) < Math.abs(Math.log(best.pixels / 105)) ? next : best)
      const references = [anchor('tower', new T.Vector3(3.65, 0.3, 2.5))]
      if (mountain.visible) references.push(anchor('mountain', mountain.position.clone().setY(8.848)))
      latest.current.onOverlay({width, height, rings: ringAnchors, references, scaleKm: scale.km, scalePixels: scale.pixels})
    }
    const fitDistance = () => {
      const radius = effects.showEffects ? effects.outerRadiusKm : 0.34 * Math.pow(targetYield / 0.001, 0.12)
      const horizontal = Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * camera.aspect
      return radius / (Math.max(0.1, horizontal) * (width < 720 ? 0.7 : 0.62))
    }
    const setEffects = () => {
      effects = sampleEffects(targetYield)
      effectGroup.visible = effects.showEffects
      if (effects.showEffects) {
        const radii = {blast20: effects.blast20Km, blast5: effects.blast5Km, blast1: effects.blast1Km, burn: effects.burnKm}
        for (const ring of rings) {
          ring.radius = radii[ring.id as keyof typeof radii]
          ring.line.scale.setScalar(ring.radius)
          ring.fill.scale.setScalar(ring.radius)
        }
        for (const object of [fireball, fireballRim, halo]) {
          object.position.set(0, effects.heightKm, 0)
          object.scale.setScalar(effects.fireballKm)
        }
      }
      targetDistance = fitDistance()
      fitting = true
    }
    const draw = (now: number) => {
      raf = 0
      if (disposed || !isActive || document.hidden) return
      drawing = true
      const delta = previous ? Math.min(0.06, (now - previous) / 1000) : 1 / 60
      previous = now
      if (fitting && !dragging) {
        cameraDirection.copy(camera.position).sub(controls.target)
        const distance = cameraDirection.length()
        const next = Math.exp(T.MathUtils.lerp(Math.log(distance), Math.log(targetDistance), 1 - Math.exp(-delta * 7)))
        camera.position.copy(controls.target).add(cameraDirection.normalize().multiplyScalar(next))
        if (Math.abs(Math.log(next / targetDistance)) < 0.001) fitting = false
      }
      controls.update()
      camera.near = Math.max(0.002, camera.position.distanceTo(controls.target) / 2000)
      camera.updateProjectionMatrix()
      camera.updateMatrixWorld()
      mountain.visible = mountainCorners.every((corner) => {
        const projectedCorner = anchor('mountain-bound', corner)
        return projectedCorner.visible && projectedCorner.x > 16 && projectedCorner.x < width - (width < 720 ? 16 : 320)
          && projectedCorner.y > (width < 720 ? 230 : 200) && projectedCorner.y < height - (width < 720 ? 450 : 230)
      })
      fireballRim.quaternion.copy(camera.quaternion)
      halo.quaternion.copy(camera.quaternion)
      renderer.render(scene, camera)
      renderCount += 1
      element.dataset.renderCount = String(renderCount)
      renderer.domElement.dataset.renderCount = String(renderCount)
      reportOverlay()
      drawing = false
      if (fitting || dragging || now < settleUntil) raf = requestAnimationFrame(draw)
    }
    const wake = (duration = 240) => {
      if (disposed) return
      settleUntil = Math.max(settleUntil, performance.now() + duration)
      if (isActive && !document.hidden && !raf && !drawing) raf = requestAnimationFrame(draw)
    }
    const onStart = () => {dragging = true; fitting = false; latest.current.onInteract(); wake(700)}
    const onEnd = () => {dragging = false; wake(900)}
    const onChange = () => wake(180)
    controls.addEventListener('start', onStart)
    controls.addEventListener('end', onEnd)
    controls.addEventListener('change', onChange)
    const resize = () => {
      const rect = element.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) return
      width = rect.width
      height = rect.height
      renderer.setPixelRatio(Math.min(devicePixelRatio, width < 720 ? 1.25 : 1.75))
      renderer.setSize(width, height)
      camera.aspect = width / height
      controls.minDistance = Math.max(0.5, 0.1 * height / (2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * (width < 720 ? 110 : 190)))
      camera.setViewOffset(width, height, width < 720 ? 0 : 70, width < 720 ? 105 : 20, width, height)
      camera.updateProjectionMatrix()
      targetDistance = fitDistance()
      fitting = true
      wake(900)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    const onVisibility = () => {
      if (document.hidden) {if (raf) cancelAnimationFrame(raf); raf = 0}
      else wake(300)
    }
    document.addEventListener('visibilitychange', onVisibility)
    bridge.current = {apply: (value, visible) => {
      const changed = value !== targetYield
      targetYield = value
      isActive = visible
      controls.enabled = visible
      if (changed) setEffects()
      if (visible) wake(600)
      else {if (raf) cancelAnimationFrame(raf); raf = 0; previous = 0}
    }}
    setEffects()
    resize()
    if (isActive) {
      camera.position.copy(direction).multiplyScalar(targetDistance)
      fitting = false
      wake(250)
    }
    return () => {
      disposed = true
      if (raf) cancelAnimationFrame(raf)
      bridge.current = null
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      controls.dispose()
      const geometries = new Set<T.BufferGeometry>()
      const materials = new Set<T.Material>()
      scene.traverse((object) => {
        if (object instanceof T.Mesh || object instanceof T.Line) {
          geometries.add(object.geometry)
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material)
        }
        if (object instanceof T.InstancedMesh) object.dispose()
      })
      geometries.forEach((geometry) => geometry.dispose())
      materials.forEach((material) => material.dispose())
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  useEffect(() => bridge.current?.apply(yieldKt, active), [yieldKt, active])
  return <div ref={host} className="nb-scale-scene" data-scale-renderer="true" />
}
