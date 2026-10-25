import {useEffect, useRef} from 'react'
import * as T from 'three'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
import {Line2} from 'three/examples/jsm/lines/Line2.js'
import {LineGeometry} from 'three/examples/jsm/lines/LineGeometry.js'
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js'

import {sampleEffects} from './effects'
import {makeCity, makeMountain, makeReferences} from './scale-geometry'

export type ScaleAnchor = {id: string; x: number; y: number; visible: boolean; value?: number}
export type ScaleOverlay = {width: number; height: number; rings: ScaleAnchor[]; references: ScaleAnchor[]; ticks: ScaleAnchor[]; scaleKm: number; scalePixels: number}
type Props = {yieldKt: number; active: boolean; onOverlay: (overlay: ScaleOverlay) => void; onInteract: () => void; onError: (message: string) => void}
const RING_COLORS = {blast20: '#e0a060', blast5: '#c48a5a', blast1: '#8c7c6c', burn: '#d07050'}

function makeGround() {
  const material = new T.ShaderMaterial({
    uniforms: {closeView: {value: 0}},
    vertexShader: 'varying vec3 worldPoint;void main(){vec4 p=modelMatrix*vec4(position,1.);worldPoint=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',
    fragmentShader: `
      varying vec3 worldPoint; uniform float closeView;
      float grid(vec2 p,float s){vec2 c=p/s;vec2 w=max(fwidth(c),vec2(.000001));vec2 d=abs(fract(c-.5)-.5)/w;return (1.-min(min(d.x,d.y),1.))*(1.-smoothstep(.3,.65,max(w.x,w.y)));}
      void main(){vec2 p=worldPoint.xz;float radial=length(p);float city=1.-smoothstep(3.9,4.8,max(abs(p.x),abs(p.y)));float fade=1.-smoothstep(80.,130.,radial);
      float street=grid(p,.1)*city*.035;float km=grid(p,1.)*.028;float ten=grid(p,10.)*.055;
      float detail=grid(p,.001)*.015*closeView;float pool=exp(-dot(p,p)/30.);
      vec3 c=vec3(.0075,.0075,.008)+vec3(.008,.007,.005)*pool;
      c+=vec3(.65,.6,.5)*max(max(street,max(km,ten))*fade,detail);gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  })
  const ground = new T.Mesh(new T.PlaneGeometry(1000, 1000), material)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -.00002
  return ground
}

export function ScaleScene({yieldKt, active, onOverlay, onInteract, onError}: Props) {
  const host = useRef<HTMLDivElement>(null)
  const latest = useRef({yieldKt, active, onOverlay, onInteract, onError})
  latest.current = {yieldKt, active, onOverlay, onInteract, onError}
  const bridge = useRef<{apply: (value: number, visible: boolean) => void} | null>(null)

  useEffect(() => {
    let disposed = false, nextSlice = 0
    let release = () => {}
    function* initialize() {
      const element = host.current
      if (!element) return
      let renderer: T.WebGLRenderer
      try {renderer = new T.WebGLRenderer({antialias: true, powerPreference: 'high-performance'})} catch {latest.current.onError('WebGL unavailable'); return}
      renderer.debug.checkShaderErrors = import.meta.env.DEV
      renderer.setClearColor('#0a0a0b')
      renderer.outputColorSpace = T.SRGBColorSpace
      renderer.toneMapping = T.ACESFilmicToneMapping
      renderer.toneMappingExposure = .95
      renderer.shadowMap.enabled = true
      renderer.shadowMap.autoUpdate = false
      renderer.shadowMap.needsUpdate = true
      renderer.shadowMap.type = T.PCFShadowMap
      element.appendChild(renderer.domElement)
      renderer.domElement.setAttribute('aria-hidden', 'true')
      const scene = new T.Scene()
      const effectsScene = new T.Scene()
      const camera = new T.PerspectiveCamera(36, 1, .00002, 2000)
      const controls = new OrbitControls(camera, renderer.domElement)
      const releaseGraphics = () => {
        const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>()
        for (const root of [scene, effectsScene]) root.traverse((object) => {
          if (object instanceof T.Mesh || object instanceof T.Line) {geometries.add(object.geometry); for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material)}
          if (object instanceof T.InstancedMesh) object.dispose()
          if (object instanceof T.DirectionalLight) object.shadow.dispose()
        })
        geometries.forEach((geometry) => geometry.dispose()); materials.forEach((material) => material.dispose())
        renderer.dispose(); renderer.domElement.remove()
      }
      release = () => {controls.dispose(); releaseGraphics()}

      controls.enableDamping = true
      controls.dampingFactor = .12
      controls.enablePan = false
      controls.minPolarAngle = .2
      controls.maxPolarAngle = Math.PI / 2 - .12
      controls.minDistance = .006
      controls.maxDistance = 1500
      const direction = new T.Vector3(.19, Math.sin(35 * Math.PI / 180), Math.cos(35 * Math.PI / 180)).normalize()
      camera.position.copy(direction).multiplyScalar(20)
      controls.update()
      scene.add(new T.HemisphereLight('#c7cdd5', '#28221b', 1.1))
      const key = new T.DirectionalLight('#ffe4bb', 2.1)
      key.position.set(-8, 10, 6)
      key.castShadow = true
      key.shadow.mapSize.set(2048, 2048)
      key.shadow.camera.left = key.shadow.camera.bottom = -5
      key.shadow.camera.right = key.shadow.camera.top = 5
      key.shadow.camera.near = .01
      key.shadow.camera.far = 35
      key.shadow.bias = -.00003
      key.shadow.normalBias = .0007
      key.shadow.radius = 3
      scene.add(key, key.target)
      const fill = new T.DirectionalLight('#cad9ed', .45)
      fill.position.set(6, 8, -8)
      scene.add(fill)
      const ground = makeGround()
      scene.add(ground)
      yield
      const city = makeCity()
      scene.add(city.blocks, city.mesh, city.compactMesh)
      const contact = new T.Mesh(new T.PlaneGeometry(11, 11), new T.ShadowMaterial({opacity: .48, depthWrite: false}))
      contact.rotation.x = -Math.PI / 2
      contact.position.y = -.00001
      contact.receiveShadow = true
      scene.add(contact)
      const mountain = makeMountain()
      scene.add(mountain)
      const reference = makeReferences()
      scene.add(reference.group)
      yield

      const effectGroup = new T.Group()
      effectsScene.add(effectGroup)
      const ringMaterials: LineMaterial[] = []
      const rings = Object.entries(RING_COLORS).map(([id, color]) => {
        const positions = Array.from({length: 361}, (_, i) => [Math.cos(i / 360 * Math.PI * 2), 0, Math.sin(i / 360 * Math.PI * 2)]).flat()
        const geometry = new LineGeometry().setPositions(positions)
        const lines = [6, 1.5].map((linewidth, index) => {
          const material = new LineMaterial({color: new T.Color(color).getHex(), linewidth, transparent: true, opacity: index ? .88 : .075, depthWrite: false, depthTest: false, dashed: id === 'burn', dashSize: .04, gapSize: .025, toneMapped: false})
          ringMaterials.push(material)
          const line = new Line2(geometry, material)
          line.computeLineDistances()
          line.renderOrder = 12 + index
          effectGroup.add(line)
          return line
        })
        const fillMesh = new T.Mesh(new T.CircleGeometry(1, 160), new T.MeshBasicMaterial({color, opacity: .012, transparent: true, depthWrite: false, depthTest: false, side: T.DoubleSide}))
        fillMesh.rotation.x = -Math.PI / 2
        fillMesh.renderOrder = 2
        effectGroup.add(fillMesh)
        return {id, lines, fill: fillMesh, radius: 1}
      })
      const fireball = new T.Mesh(new T.SphereGeometry(1, 64, 40), new T.ShaderMaterial({
        transparent: true, depthWrite: false,
        vertexShader: 'varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
        fragmentShader: `varying vec3 n;varying vec3 v;void main(){float f=pow(1.-abs(dot(normalize(n),normalize(v))),2.);gl_FragColor=vec4(mix(vec3(2.5,1.25,.42),vec3(3.,2.15,1.3),f),.16+f*.22);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>}`,
      }))
      const rim = new T.Line(new T.BufferGeometry().setFromPoints(Array.from({length: 161}, (_, i) => new T.Vector3(Math.cos(i / 160 * Math.PI * 2), Math.sin(i / 160 * Math.PI * 2), 0))), new T.LineBasicMaterial({color: '#ffe0ad', transparent: true, opacity: .75, depthTest: false}))
      const halo = new T.Mesh(new T.PlaneGeometry(3.6, 3.6), new T.ShaderMaterial({transparent: true, depthWrite: false, depthTest: false, blending: T.AdditiveBlending,
        vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader: 'varying vec2 vUv;void main(){float r=length((vUv-.5)*2.);float a=exp(-r*r*4.)*.12*(1.-smoothstep(.65,1.,r));gl_FragColor=vec4(1.,.59,.22,a);}',
      }))
      const altitude = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3(0, 1, 0)]), new T.LineDashedMaterial({color: '#dacaa8', opacity: .7, transparent: true, dashSize: .028, gapSize: .02, depthTest: false}))
      altitude.computeLineDistances()
      effectGroup.add(fireball, rim, halo, altitude)
      const ruler = new T.LineSegments(new T.BufferGeometry(), new T.LineBasicMaterial({color: '#bbaa86', opacity: .6, transparent: true, depthTest: false, toneMapped: false}))
      ruler.renderOrder = 11
      effectGroup.add(ruler)
      yield

      let width = element.clientWidth || 1, height = element.clientHeight || 1, targetYield = latest.current.yieldKt, isActive = latest.current.active
      let effects = sampleEffects(targetYield)
      let targetDistance = 20, fitting = true, raf = 0, previous = 0, settleUntil = 0
      let dragging = false, drawing = false, ready = false, renderCount = 0
      let rulerStep = 1, rulerCount = 1, lastOverlay = ''
      const targetPoint = new T.Vector3()
      const point = new T.Vector3(), right = new T.Vector3(), projected = new T.Vector3(), cameraDirection = new T.Vector3()
      const anchor = (id: string, p: T.Vector3, value?: number): ScaleAnchor => {
        projected.copy(p).project(camera)
        return {id, x: (projected.x * .5 + .5) * width, y: (-projected.y * .5 + .5) * height, visible: projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 1.05 && Math.abs(projected.y) < 1.05, value}
      }
      const reportOverlay = () => {
        right.setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize()
        const ringAnchors = effects.showEffects ? rings.map((ring) => anchor(ring.id, point.copy(right).multiplyScalar(ring.radius).setY(.003))) : []
        const origin = anchor('origin', controls.target)
        const candidates = (effects.showEffects ? [.1, 1, 10] : [.001, .01, .1]).map((km) => {
          const end = anchor('end', point.copy(right).multiplyScalar(km).add(controls.target))
          return {km, pixels: Math.hypot(end.x - origin.x, end.y - origin.y)}
        })
        const choices = candidates.filter((item) => item.pixels <= (width < 720 ? 105 : 220))
        const scale = (choices.length ? choices : candidates.slice(0, 1)).reduce((best, item) => Math.abs(Math.log(item.pixels / 105)) < Math.abs(Math.log(best.pixels / 105)) ? item : best)
        const references = [anchor('tower', point.copy(reference.base).add(new T.Vector3(-.035, .3, -.035)))]
        if (effects.showEffects) references.push(anchor('height', new T.Vector3(0, effects.heightKm * .52, 0)))
        else references.push(anchor('cube', point.copy(reference.base).add(new T.Vector3(0, effects.tntCubeSideM / 1000, 0))), anchor('person', point.copy(reference.base).add(new T.Vector3(-.0021, .0017, .0015))), anchor('truck', point.copy(reference.base).add(new T.Vector3(.006, .0025, -.001))))
        if (mountain.visible) references.push(anchor('mountain', mountain.position.clone().setY(8.848)))
        const ticks = effects.showEffects ? Array.from({length: rulerCount + 1}, (_, i) => anchor(`tick-${i}`, new T.Vector3(i * rulerStep, 0, .045 * (effects.outerRadiusKm || 1)), i * rulerStep)) : []
        const overlay = {width, height, rings: ringAnchors, references, ticks, scaleKm: scale.km, scalePixels: scale.pixels}
        const serialized = JSON.stringify(overlay)
        if (serialized !== lastOverlay) {lastOverlay = serialized; latest.current.onOverlay(overlay)}
      }
      const framing = () => {
        const horizontal = Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * camera.aspect
        if (!effects.showEffects) {
          targetPoint.copy(reference.base).add(new T.Vector3(.0015, Math.max(.0012, effects.tntCubeSideM / 2000), 0))
          return Math.max(.010, effects.tntCubeSideM / 1000 * 5) / (horizontal * (width < 720 ? .82 : .7))
        }
        targetPoint.set(0, 0, 0)
        return effects.outerRadiusKm / (horizontal * (width < 720 ? .76 : .64))
      }
      const setEffects = () => {
        effects = sampleEffects(targetYield)
        effectGroup.visible = effects.showEffects
        ground.material.uniforms.closeView.value = effects.showEffects ? 0 : 1
        if (effects.showEffects) {
          key.position.set(-8, 10, 6)
          key.target.position.set(0, 0, 0)
          key.shadow.camera.left = key.shadow.camera.bottom = -5
          key.shadow.camera.right = key.shadow.camera.top = 5
          key.shadow.camera.near = .01; key.shadow.camera.far = 35
          key.shadow.normalBias = .0007
        } else {
          key.position.copy(reference.base).add(new T.Vector3(-.02, .035, .018))
          key.target.position.copy(reference.base)
          const span = Math.max(.018, effects.tntCubeSideM / 1000 * 3)
          key.shadow.camera.left = key.shadow.camera.bottom = -span
          key.shadow.camera.right = key.shadow.camera.top = span
          key.shadow.camera.near = .0001; key.shadow.camera.far = .2
          key.shadow.normalBias = .000015
        }
        key.shadow.camera.updateProjectionMatrix()
        renderer.shadowMap.needsUpdate = true
        const side = effects.tntCubeSideM / 1000
        reference.cube.scale.setScalar(side)
        reference.cube.position.y = side / 2
        reference.person.visible = reference.truck.visible = !effects.showEffects
        city.recolor(effects.showEffects ? [effects.blast20Km, effects.blast5Km, effects.blast1Km] : null, width < 720)
        if (effects.showEffects) {
          const radii = {blast20: effects.blast20Km, blast5: effects.blast5Km, blast1: effects.blast1Km, burn: effects.burnKm}
          for (const ring of rings) {
            ring.radius = radii[ring.id as keyof typeof radii]
            ring.lines.forEach((line) => line.scale.setScalar(ring.radius))
            ring.fill.scale.setScalar(ring.radius)
          }
          for (const object of [fireball, rim, halo]) {object.position.set(0, effects.heightKm, 0); object.scale.setScalar(effects.fireballKm)}
          altitude.scale.y = effects.heightKm
          rulerStep = effects.outerRadiusKm < 8 ? 1 : effects.outerRadiusKm < 30 ? 5 : 10
          rulerCount = Math.ceil(effects.outerRadiusKm / rulerStep)
          const points = [0, .001, 0, rulerCount * rulerStep, .001, 0]
          for (let i = 0; i <= rulerCount; i++) points.push(i * rulerStep, .001, -.013 * effects.outerRadiusKm, i * rulerStep, .001, .013 * effects.outerRadiusKm)
          ruler.geometry.dispose()
          ruler.geometry = new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(points, 3))
        }
        targetDistance = framing()
        fitting = true
      }
      const draw = (now: number) => {
        raf = 0
        if (disposed || !ready || !isActive || document.hidden) return
        drawing = true
        const delta = previous ? Math.min(.06, (now - previous) / 1000) : 1 / 60
        previous = now
        if (fitting && !dragging) {
          const fraction = 1 - Math.exp(-delta * 6)
          cameraDirection.copy(camera.position).sub(controls.target)
          const distance = Math.exp(T.MathUtils.lerp(Math.log(cameraDirection.length()), Math.log(targetDistance), fraction))
          controls.target.lerp(targetPoint, fraction)
          camera.position.copy(controls.target).add(cameraDirection.normalize().multiplyScalar(distance))
          if (Math.abs(Math.log(distance / targetDistance)) < .0003 && controls.target.distanceTo(targetPoint) < Math.min(.001, targetDistance / 1000)) fitting = false
        }
        controls.update()
        camera.near = Math.max(.00001, camera.position.distanceTo(controls.target) / 5000)
        camera.updateProjectionMatrix()
        camera.updateMatrixWorld()
        mountain.visible = effects.showEffects && effects.outerRadiusKm > 14
        rim.quaternion.copy(camera.quaternion)
        halo.quaternion.copy(camera.quaternion)
        renderer.render(scene, camera)
        renderer.autoClear = false
        renderer.clearDepth()
        renderer.render(effectsScene, camera)
        renderer.autoClear = true
        renderCount++
        element.dataset.renderCount = renderer.domElement.dataset.renderCount = String(renderCount)
        reportOverlay()
        drawing = false
        if (fitting || dragging || now < settleUntil) raf = requestAnimationFrame(draw)
      }
      const wake = (duration = 240) => {if (disposed) return; settleUntil = Math.max(settleUntil, performance.now() + duration); if (isActive && !document.hidden && !raf && !drawing) raf = requestAnimationFrame(draw)}
      const onStart = () => {dragging = true; fitting = false; latest.current.onInteract(); wake(700)}
      const onEnd = () => {dragging = false; wake(700)}
      const onChange = () => wake(180)
      controls.addEventListener('start', onStart)
      controls.addEventListener('end', onEnd)
      controls.addEventListener('change', onChange)
      const resize = () => {
        const rect = element.getBoundingClientRect()
        if (rect.width < 2 || rect.height < 2) return
        width = rect.width; height = rect.height
        city.recolor(effects.showEffects ? [effects.blast20Km, effects.blast5Km, effects.blast1Km] : null, width < 720)
        renderer.shadowMap.needsUpdate = true
        renderer.setPixelRatio(Math.min(devicePixelRatio, width < 720 ? 1.25 : 1.5))
        renderer.setSize(width, height)
        ringMaterials.forEach((material) => material.resolution.set(width, height))
        camera.aspect = width / height
        camera.setViewOffset(width, height, width < 720 ? 0 : width * .13, width < 720 ? -height * .055 : 45, width, height)
        camera.updateProjectionMatrix()
        targetDistance = framing()
        fitting = true
        wake(900)
      }
      const observer = new ResizeObserver(resize)
      observer.observe(element)
      const onVisibility = () => {if (document.hidden) {if (raf) cancelAnimationFrame(raf); raf = 0} else wake(300)}
      document.addEventListener('visibilitychange', onVisibility)
      bridge.current = {apply: (value, visible) => {
        const changed = value !== targetYield
        targetYield = value; isActive = visible; controls.enabled = visible
        if (changed) setEffects()
        if (visible) wake(500)
        else {if (raf) cancelAnimationFrame(raf); raf = 0; previous = 0}
      }}
      setEffects()
      resize()
      controls.target.copy(targetPoint)
      camera.position.copy(targetPoint).addScaledVector(direction, targetDistance)
      fitting = false
      // Let the driver finish new programs before the first city frame requests their uniforms.
      const compilation = Promise.all([renderer.compileAsync(scene, camera), renderer.compileAsync(effectsScene, camera)])
      void compilation.then(() => {if (!disposed) {ready = true; wake(300)}}, () => {
        if (!disposed) latest.current.onError('WebGL shader compilation failed')
      })
      release = () => {
        if (raf) cancelAnimationFrame(raf)
        bridge.current = null
        observer.disconnect()
        document.removeEventListener('visibilitychange', onVisibility)
        controls.dispose()
        // compileAsync polls program objects; keep them alive until its final readiness check.
        void compilation.then(releaseGraphics, releaseGraphics)
        renderer.domElement.remove()
      }
    }
    const initialization = initialize()
    const advance = () => {
      if (disposed) return
      if (!initialization.next().done) nextSlice = window.setTimeout(advance, 0)
    }
    advance()
    return () => {
      disposed = true
      window.clearTimeout(nextSlice)
      initialization.return()
      release()
    }
  }, [])
  useEffect(() => bridge.current?.apply(yieldKt, active), [yieldKt, active])
  return <div ref={host} className="nb-scale-scene" data-scale-renderer="true" />
}
