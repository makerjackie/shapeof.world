import {useEffect, useRef} from 'react'
import * as T from 'three'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js'
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import {SYSTEMS, type Atlas, type SceneState} from './anatomy'
import {createExplosionLayout} from './explosion-layout'
import {decodeModelResponse} from './model-download'
import {PointerTap} from './pointer-tap'

type Props = {
  atlas: Atlas
  state: SceneState
  labelFor: (id: string) => string
  reducedMotion: boolean
  onSelect: (id: string) => void
  onProgress: (value: number) => void
  onError: (code: string) => void
  onInteract: () => void
}

export function AnatomyScene({
  atlas,
  state,
  labelFor,
  reducedMotion,
  onSelect,
  onProgress,
  onError,
  onInteract,
}: Props) {
  const host = useRef<HTMLDivElement>(null)
  const latest = useRef(state)
  const select = useRef(onSelect)
  const label = useRef(labelFor)
  const interact = useRef(onInteract)
  const reduced = useRef(reducedMotion)
  const progress = useRef(onProgress)
  const fail = useRef(onError)
  latest.current = state
  select.current = onSelect
  label.current = labelFor
  interact.current = onInteract
  reduced.current = reducedMotion
  progress.current = onProgress
  fail.current = onError

  useEffect(() => {
    const el = host.current
    if (!el) return
    let disposed = false
    let frame = 0
    let dirty = true
    let ready = false
    let lastView = ''
    let lastReset = -1
    let lastIsolate = ''
    let layoutKey = ''
    let amount = 0
    let lastState: SceneState | null = null
    const abort = new AbortController()

    let renderer: T.WebGLRenderer
    try {
      renderer = new T.WebGLRenderer({antialias: true, alpha: false, powerPreference: 'high-performance'})
    } catch {
      fail.current('webgl-unavailable')
      return
    }

    renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 768 ? 1.5 : 2))
    renderer.setClearColor('#07080c')
    renderer.outputColorSpace = T.SRGBColorSpace
    renderer.toneMapping = T.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    el.appendChild(renderer.domElement)
    renderer.domElement.setAttribute(
      'aria-label',
      'Interactive human anatomy. Drag to orbit, pinch or scroll to zoom, and tap a structure to inspect it.',
    )

    const scene = new T.Scene()
    const camera = new T.PerspectiveCamera(34, 1, 0.005, 100)
    const controls = new OrbitControls(camera, renderer.domElement)
    camera.position.set(1.4, 1.05, 3.6)
    controls.target.set(0, 0.85, 0)
    controls.enableDamping = true
    controls.dampingFactor = 0.085
    controls.minDistance = 0.07
    controls.maxDistance = 40
    controls.maxPolarAngle = Math.PI * 0.96
    controls.addEventListener('change', () => {
      dirty = true
    })

    const pmrem = new T.PMREMGenerator(renderer)
    const room = new RoomEnvironment()
    const env = pmrem.fromScene(room, 0.04)
    scene.environment = env.texture
    room.dispose()
    pmrem.dispose()

    scene.add(new T.HemisphereLight(0xc9d2de, 0x1a1614, 0.42))
    const key = new T.DirectionalLight(0xfff1dc, 2.15)
    key.position.set(-2.1, 4.2, 3.1)
    scene.add(key)
    const rim = new T.DirectionalLight(0x9eb4d4, 1.35)
    rim.position.set(2.2, 1.8, -3.2)
    scene.add(rim)
    const fill = new T.DirectionalLight(0xffe6c8, 0.35)
    fill.position.set(0.2, 1.4, 4)
    scene.add(fill)

    const ground = new T.Mesh(
      new T.CircleGeometry(6, 64),
      new T.MeshBasicMaterial({color: 0x07080c}),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.02
    scene.add(ground)
    const platform = new T.Mesh(
      new T.CylinderGeometry(0.68, 0.7, 0.016, 100),
      new T.MeshStandardMaterial({color: 0x12141c, metalness: 0.18, roughness: 0.7, envMapIntensity: 0.25}),
    )
    platform.position.y = -0.016
    scene.add(platform)
    const ring = new T.Mesh(
      new T.RingGeometry(0.63, 0.634, 128),
      new T.MeshBasicMaterial({color: 0xcbb892, transparent: true, opacity: 0.28, side: T.DoubleSide}),
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.001
    scene.add(ring)

    const width = T.MathUtils.ceilPowerOfTwo(atlas.parts.length)
    const data = new Float32Array(width * 4)
    const partTexture = new T.DataTexture(data, width, 1, T.RGBAFormat, T.FloatType)
    partTexture.needsUpdate = true
    const selectedData = new Uint8Array(width * 4)
    const selectionTexture = new T.DataTexture(selectedData, width, 1)
    selectionTexture.needsUpdate = true

    const materials: T.Material[] = []
    const geometries: T.BufferGeometry[] = []
    const pickers: Array<T.Mesh | undefined> = []
    const centers = atlas.parts.map((part) =>
      new T.Vector3().fromArray(part.bounds[0]).add(new T.Vector3().fromArray(part.bounds[1])).multiplyScalar(0.5),
    )
    const offsets: T.Vector3[] = []
    const bounds = atlas.parts.map((part) =>
      new T.Box3(new T.Vector3().fromArray(part.bounds[0]), new T.Vector3().fromArray(part.bounds[1])),
    )
    let packingWidth = 1
    let packingHeight = 1

    const markerPositions = new Float32Array(atlas.parts.length * 3)
    const markerGeometry = new T.BufferGeometry()
    markerGeometry.setAttribute('position', new T.BufferAttribute(markerPositions, 3))
    const markerMaterial = new T.PointsMaterial({
      color: 0xcbb892,
      size: 4,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.7,
      depthTest: false,
    })
    markerMaterial.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <clipping_planes_fragment>',
        '#include <clipping_planes_fragment>\nif (distance(gl_PointCoord, vec2(0.5)) > 0.5) discard;',
      )
    }
    const markers = new T.Points(markerGeometry, markerMaterial)
    markers.frustumCulled = false
    markers.renderOrder = 10
    markers.visible = false
    scene.add(markers)

    const hover = document.createElement('div')
    hover.className = 'ha-hover'
    hover.setAttribute('role', 'tooltip')
    hover.hidden = true
    el.appendChild(hover)

    type Target = {index: number; x: number; y: number; left: number; right: number; top: number; bottom: number}
    let targets: Target[] = []
    const projected = new T.Vector3()
    const findTarget = (x: number, y: number, radius: number) => {
      let best = -1
      let score = Infinity
      for (const target of targets) {
        const dx = Math.max(target.left - x, 0, x - target.right)
        const dy = Math.max(target.top - y, 0, y - target.bottom)
        const distance = Math.hypot(dx, dy)
        if (distance > radius) continue
        const candidate = distance + Math.hypot(target.x - x, target.y - y) * 0.025
        if (candidate < score) {
          score = candidate
          best = target.index
        }
      }
      return best
    }

    const materialFor = (system: string) => {
      const material = new T.MeshStandardMaterial({
        color: SYSTEMS.find((item) => item.id === system)?.color ?? '#aebbb8',
        metalness: 0.08,
        roughness: 0.5,
        side: T.DoubleSide,
        transparent: system === 'integumentary',
        opacity: system === 'integumentary' ? 0.08 : 1,
        depthWrite: system !== 'integumentary',
      })
      material.onBeforeCompile = (shader) => {
        shader.uniforms.partState = {value: partTexture}
        shader.uniforms.selectionState = {value: selectionTexture}
        shader.uniforms.stateWidth = {value: width}
        shader.vertexShader =
          'attribute float partIndex; uniform sampler2D partState; uniform sampler2D selectionState; uniform float stateWidth; varying float partVisible; varying float partSelected;\n'
          + shader.vertexShader
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\nvec2 stateUv = vec2((partIndex + 0.5) / stateWidth, 0.5); vec4 state = texture2D(partState, stateUv); transformed += state.xyz; partVisible = state.w; partSelected = texture2D(selectionState, stateUv).r;',
        )
        shader.fragmentShader = 'varying float partVisible; varying float partSelected;\n' + shader.fragmentShader
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <clipping_planes_fragment>',
          '#include <clipping_planes_fragment>\nif (partVisible < 0.5) discard;',
        )
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.82, 0.52), partSelected * 0.72);',
        )
      }
      materials.push(material)
      return material
    }
    const mats = new Map(SYSTEMS.map((system) => [system.id, materialFor(system.id)]))

    let loaded = 0
    const loadChunk = async (chunkIndex: number) => {
      const chunk = atlas.chunks[chunkIndex]
      const compressed = Boolean(chunk.gzip) && typeof DecompressionStream !== 'undefined'
      const response = await fetch(compressed ? chunk.gzip! : chunk.url, {signal: abort.signal})
      const buffer = await decodeModelResponse(response, chunk.bytes, compressed)
      if (disposed) return
      const groups = new Map<string, T.BufferGeometry[]>()
      atlas.parts.forEach((part, index) => {
        if (part.chunk !== chunkIndex) return
        const geometry = new T.BufferGeometry()
        geometry.setAttribute('position', new T.BufferAttribute(new Float32Array(buffer, part.positions, part.vertexCount * 3), 3))
        geometry.setAttribute('normal', new T.BufferAttribute(new Int16Array(buffer, part.normals, part.vertexCount * 3), 3, true))
        geometry.setIndex(new T.BufferAttribute(new Uint32Array(buffer, part.indices, part.indexCount), 1))
        geometry.boundingBox = bounds[index].clone()
        geometry.computeBoundingSphere()
        const pick = new T.Mesh(geometry)
        pick.matrixAutoUpdate = false
        pickers[index] = pick
        geometries.push(geometry)
        geometry.setAttribute('partIndex', new T.BufferAttribute(new Float32Array(part.vertexCount).fill(index), 1))
        const list = groups.get(part.system) ?? []
        list.push(geometry)
        groups.set(part.system, list)
      })
      groups.forEach((group, system) => {
        const geometry = mergeGeometries(group, false)
        if (!geometry) throw new Error('anatomy-assemble-failed')
        geometries.push(geometry)
        const mesh = new T.Mesh(geometry, mats.get(system as never))
        mesh.frustumCulled = false
        scene.add(mesh)
      })
      lastState = null
      loaded += 1
      progress.current(Math.round((loaded / atlas.chunks.length) * 100))
      dirty = true
    }

    void (async () => {
      try {
        let cursor = 0
        await Promise.all(Array.from({length: 3}, async () => {
          while (cursor < atlas.chunks.length) {
            const index = cursor
            cursor += 1
            await loadChunk(index)
          }
        }))
        if (!disposed) {
          ready = true
          dirty = true
        }
      } catch (error) {
        if (!disposed && !(error instanceof DOMException && error.name === 'AbortError')) {
          fail.current(error instanceof Error && error.message.startsWith('anatomy-') ? error.message : 'anatomy-load-failed')
        }
      }
    })()

    const overlayBox = (selector: string) => document.querySelector(selector)?.getBoundingClientRect()
    const fit = (view: string, extent = 0) => {
      const hostBox = el.getBoundingClientRect()
      const mobile = hostBox.width < 768
      const systems = overlayBox('.ha-systems')
      const detail = overlayBox('.ha-detail')
      const freebar = overlayBox('.experience-freebar')
      let left = 20
      let right = hostBox.width - 20
      let top = mobile ? 110 : 96
      let bottom = hostBox.height - (freebar ? Math.min(180, hostBox.height - freebar.top + hostBox.top) : 120)
      if (systems && systems.width > 40 && systems.left - hostBox.left < hostBox.width / 2) {
        left = Math.max(left, systems.right - hostBox.left + 12)
      }
      if (detail && detail.width > 40) {
        if (mobile) bottom = Math.min(bottom, detail.top - hostBox.top - 12)
        else right = Math.min(right, detail.left - hostBox.left - 12)
      }
      const availableWidth = Math.max(160, right - left)
      const availableHeight = Math.max(140, bottom - top)
      const availableAspect = availableWidth / availableHeight
      const normalDistance = mobile ? Math.max(4.4, 1.7 * hostBox.height / Math.max(160, availableHeight) / (2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2)))) : 4
      const atlasDistance = Math.max(packingHeight, packingWidth / availableAspect)
        / (2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2)))
        * (hostBox.height / Math.max(160, availableHeight))
        * 1.08
      const distance = T.MathUtils.lerp(normalDistance, Math.max(0.2, atlasDistance), extent)
      if (extent > 0.8) view = 'front'
      const direction = view === 'front'
        ? new T.Vector3(0, 0.02, 1)
        : view === 'back'
          ? new T.Vector3(0, 0.02, -1)
          : view === 'side'
            ? new T.Vector3(1, 0.02, 0)
            : new T.Vector3(0.35, 0.06, 1).normalize()
      controls.target.set(extent > 0.1 && !mobile ? -packingWidth * 0.08 : 0, extent > 0.1 || mobile ? 0.85 : 0.68, 0)
      camera.position.copy(controls.target).addScaledVector(direction, distance)
      controls.update()
      dirty = true
    }

    const resize = () => {
      layoutKey = ''
      lastState = null
      renderer.setPixelRatio(Math.min(devicePixelRatio, el.clientWidth < 768 || el.clientHeight < 600 ? 1.5 : 2))
      camera.aspect = el.clientWidth / Math.max(1, el.clientHeight)
      camera.updateProjectionMatrix()
      renderer.setSize(el.clientWidth, el.clientHeight)
      fit(latest.current.view, amount)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(el)

    const raycaster = new T.Raycaster()
    const pointer = new T.Vector2()
    const tap = new PointerTap()
    const worldBox = new T.Box3()
    const hitPoint = new T.Vector3()
    const down = (event: PointerEvent) => {
      hover.hidden = true
      tap.down(event.pointerId, event.clientX, event.clientY, event.pointerType === 'touch' ? 12 : 5)
    }
    const move = (event: PointerEvent) => {
      tap.move(event.pointerId, event.clientX, event.clientY)
      if (event.buttons || amount < 0.5 || event.pointerType === 'touch') {
        hover.hidden = true
        return
      }
      const rect = el.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const index = findTarget(x, y, 12)
      hover.hidden = index < 0
      renderer.domElement.style.cursor = index < 0 ? 'grab' : 'pointer'
      if (index >= 0) {
        hover.textContent = label.current(atlas.parts[index].id)
        hover.style.left = `${Math.max(8, Math.min(x + 14, el.clientWidth - 260))}px`
        hover.style.top = `${Math.max(8, Math.min(y + 18, el.clientHeight - 55))}px`
      }
    }
    const cancel = (event: PointerEvent) => tap.cancel(event.pointerId)
    const up = (event: PointerEvent) => {
      const validTap = tap.up(event.pointerId, event.clientX, event.clientY)
      if (!validTap || !ready) return
      interact.current()
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1)
      raycaster.setFromCamera(pointer, camera)
      let nearest = Infinity
      let found = -1
      const hasSolid = atlas.parts.some((part, index) => part.system !== 'integumentary' && data[index * 4 + 3] > 0.5)
      pickers.forEach((mesh, index) => {
        if (!mesh || data[index * 4 + 3] < 0.5 || (hasSolid && atlas.parts[index].system === 'integumentary')) return
        worldBox.copy(bounds[index]).translate(mesh.position)
        if (!raycaster.ray.intersectBox(worldBox, hitPoint)) return
        const hits = raycaster.intersectObject(mesh, false)
        if (hits[0] && hits[0].distance < nearest) {
          nearest = hits[0].distance
          found = index
        }
      })
      if (found < 0 && amount > 0.45) {
        found = findTarget(event.clientX - rect.left, event.clientY - rect.top, event.pointerType === 'touch' ? 24 : 16)
      }
      if (found >= 0) {
        hover.hidden = true
        select.current(atlas.parts[found].id)
      }
    }
    renderer.domElement.addEventListener('pointerdown', down)
    renderer.domElement.addEventListener('pointermove', move)
    renderer.domElement.addEventListener('pointerup', up)
    renderer.domElement.addEventListener('pointercancel', cancel)
    controls.addEventListener('start', () => interact.current())

    const clock = new T.Clock()
    let lastExtent = -1
    const animate = () => {
      if (disposed) return
      frame = requestAnimationFrame(animate)
      const dt = Math.min(clock.getDelta(), 0.05)
      const current = latest.current
      const changed = lastState?.visible !== current.visible
        || lastState?.selected !== current.selected
        || lastState?.isolate !== current.isolate
      const moving = Math.abs(amount - current.explode) > 0.0001
      if (moving) {
        amount = reduced.current ? current.explode : T.MathUtils.damp(amount, current.explode, 8, dt)
        dirty = true
      }
      if (changed || moving || lastExtent < 0) {
        const visible = new Set(current.visible)
        const selection = new Set(current.selected)
        const visibleParts = atlas.parts.filter((part) =>
          current.isolate ? selection.has(part.id) : visible.has(part.system) || selection.has(part.id),
        )
        const nextLayoutKey = `${visibleParts.map((part) => part.id).join(',')}:${camera.aspect.toFixed(3)}`
        if (nextLayoutKey !== layoutKey) {
          const layout = createExplosionLayout(visibleParts, camera.aspect)
          packingWidth = layout.width
          packingHeight = layout.height
          atlas.parts.forEach((part, index) => {
            const cell = layout.cells.get(part.id)
            offsets[index] = cell ? new T.Vector3(cell.x, cell.y + 0.85, 0) : centers[index].clone()
          })
          layoutKey = nextLayoutKey
          if (amount > 0.05 && !current.isolate) fit(current.view, Math.max(0, (amount - 0.3) / 0.7))
        }
        atlas.parts.forEach((part, index) => {
          const center = centers[index]
          const destination = offsets[index]
          let dx = 0
          let dy = 0
          let dz = 0
          if (amount <= 0.45) {
            const t = amount / 0.45
            const group = SYSTEMS.findIndex((item) => item.id === part.system)
            const angle = group / SYSTEMS.length * Math.PI * 2
            dx = Math.sin(angle) * t * 0.48
            dy = (center.y - 0.85) * t * 0.28
            dz = Math.cos(angle) * t * 0.48
          } else {
            const t = (amount - 0.45) / 0.55
            const group = SYSTEMS.findIndex((item) => item.id === part.system)
            const angle = group / SYSTEMS.length * Math.PI * 2
            dx = T.MathUtils.lerp(Math.sin(angle) * 0.48, destination.x - center.x, t)
            dy = T.MathUtils.lerp((center.y - 0.85) * 0.28, destination.y - center.y, t)
            dz = T.MathUtils.lerp(Math.cos(angle) * 0.48, -center.z, t)
          }
          const selected = selection.has(part.id)
          data.set([dx, dy, dz, (current.isolate ? selected : visible.has(part.system) || selected) ? 1 : 0], index * 4)
          selectedData[index * 4] = selected ? 255 : 0
          markerPositions.set(data[index * 4 + 3] > 0.5 ? [center.x + dx, center.y + dy, center.z + dz] : [10_000, 10_000, 10_000], index * 3)
          const mesh = pickers[index]
          if (mesh) {
            mesh.position.set(dx, dy, dz)
            mesh.updateMatrix()
            mesh.updateMatrixWorld(true)
          }
        })
        partTexture.needsUpdate = true
        selectionTexture.needsUpdate = true
        markerGeometry.attributes.position.needsUpdate = true
        lastState = current
        lastExtent = amount
        dirty = true
      }
      if (current.view !== lastView || current.reset !== lastReset) {
        fit(current.view, amount)
        lastView = current.view
        lastReset = current.reset
      }
      if (moving && !current.isolate) fit(amount > 0.5 ? 'front' : current.view, Math.max(0, (amount - 0.3) / 0.7))
      const isolateKey = current.isolate ? `${current.selected.join(',')}:${current.reset}:${current.inspectorOpen}:${camera.aspect}` : ''
      if (isolateKey !== lastIsolate || (current.isolate && moving)) {
        if (current.isolate) {
          const box = new T.Box3()
          atlas.parts.forEach((part, index) => {
            if (current.selected.includes(part.id)) {
              box.union(bounds[index].clone().translate(new T.Vector3(data[index * 4], data[index * 4 + 1], data[index * 4 + 2])))
            }
          })
          if (!box.isEmpty()) {
            const center = box.getCenter(new T.Vector3())
            const size = box.getSize(new T.Vector3())
            const w = el.clientWidth
            const h = el.clientHeight
            const mobile = w < 768
            const landscape = w > h && h <= 600
            let left = 20
            let right = w - 20
            let top = mobile ? 110 : 96
            let bottom = h - 150
            if (current.inspectorOpen) {
              if (landscape) {
                right = w - 320
                top = 90
                bottom = h - 120
              } else if (mobile) {
                const sheet = overlayBox('.ha-detail')
                top = 110
                bottom = (sheet?.top ?? h * 0.58) - el.getBoundingClientRect().top - 12
              } else {
                right = w - 360
                left = w > 1100 ? 250 : 24
              }
            }
            const availableWidth = Math.max(150, right - left)
            const availableHeight = Math.max(40, bottom - top)
            camera.setViewOffset(w, h, w / 2 - (left + right) / 2, h / 2 - (top + bottom) / 2, w, h)
            const distance = Math.max(
              0.07,
              Math.max(size.y * h / availableHeight, size.x * w / availableWidth / camera.aspect, size.z)
                / (2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2)))
                * 1.35,
            )
            controls.maxDistance = Math.max(40, distance * 2)
            controls.target.copy(center)
            camera.position.copy(center).add(new T.Vector3(0.2, 0.1, 1).normalize().multiplyScalar(distance))
            controls.update()
            dirty = true
          }
        } else if (lastIsolate) {
          camera.clearViewOffset()
          fit(current.view, amount)
        }
        lastIsolate = isolateKey
      }
      controls.enableRotate = amount < 0.8
      controls.mouseButtons.LEFT = amount < 0.8 ? T.MOUSE.ROTATE : T.MOUSE.PAN
      controls.touches.ONE = amount < 0.8 ? T.TOUCH.ROTATE : T.TOUCH.PAN
      ground.visible = platform.visible = ring.visible = amount < 0.5 && !current.isolate
      markers.visible = amount > 0.75
      controls.autoRotate = current.rotate && !reduced.current && !current.isolate && amount < 0.4
      controls.autoRotateSpeed = 0.45
      controls.update()
      if (controls.autoRotate) dirty = true
      if (dirty) {
        renderer.render(scene, camera)
        targets = []
        if (amount > 0.45) {
          const hasSolid = atlas.parts.some((part, index) => part.system !== 'integumentary' && data[index * 4 + 3] > 0.5)
          atlas.parts.forEach((part, index) => {
            if (data[index * 4 + 3] < 0.5 || (hasSolid && part.system === 'integumentary')) return
            let left = Infinity
            let right = -Infinity
            let top = Infinity
            let bottom = -Infinity
            for (let corner = 0; corner < 8; corner += 1) {
              projected.set(
                part.bounds[(corner & 1) ? 1 : 0][0] + data[index * 4],
                part.bounds[(corner & 2) ? 1 : 0][1] + data[index * 4 + 1],
                part.bounds[(corner & 4) ? 1 : 0][2] + data[index * 4 + 2],
              ).project(camera)
              const x = (projected.x + 1) * el.clientWidth / 2
              const y = (1 - projected.y) * el.clientHeight / 2
              left = Math.min(left, x)
              right = Math.max(right, x)
              top = Math.min(top, y)
              bottom = Math.max(bottom, y)
            }
            projected.copy(centers[index]).add(new T.Vector3(data[index * 4], data[index * 4 + 1], data[index * 4 + 2])).project(camera)
            if (projected.z < -1 || projected.z > 1) return
            targets.push({
              index,
              x: (projected.x + 1) * el.clientWidth / 2,
              y: (1 - projected.y) * el.clientHeight / 2,
              left,
              right,
              top,
              bottom,
            })
          })
        }
        dirty = false
      }
    }
    animate()

    const contextLost = (event: Event) => {
      event.preventDefault()
      fail.current('webgl-lost')
    }
    renderer.domElement.addEventListener('webglcontextlost', contextLost)

    return () => {
      disposed = true
      abort.abort()
      cancelAnimationFrame(frame)
      observer.disconnect()
      controls.dispose()
      geometries.forEach((geometry) => geometry.dispose())
      materials.forEach((material) => material.dispose())
      scene.traverse((object) => {
        if (object instanceof T.Mesh && !geometries.includes(object.geometry)) {
          object.geometry.dispose()
          const list = Array.isArray(object.material) ? object.material : [object.material]
          list.forEach((material) => material.dispose())
        }
      })
      env.dispose()
      partTexture.dispose()
      selectionTexture.dispose()
      markerGeometry.dispose()
      markerMaterial.dispose()
      hover.remove()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [atlas])

  return <div className="ha-scene" ref={host} />
}
