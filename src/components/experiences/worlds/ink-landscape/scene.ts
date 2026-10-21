import * as T from 'three'
import { ownsExperienceStageInput } from '~/components/experiences/experience-input'
import { FLIGHT_SECONDS, sampleFlight } from './flight'
import { createInkWater } from './ink-material'
import { buildSongxi } from './songxi-landscape'

export type InkState = { mode: 'landing' | 'flight' | 'free'; playing: boolean; time: number; fog: number; moving: boolean }
export type InkEngine = ReturnType<typeof createInkScene>

export function createInkScene(canvas: HTMLCanvasElement, update: (state: InkState) => void, interact: () => void, finish: () => void) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = T.SRGBColorSpace
  const scene = new T.Scene(), paper = new T.Color('#eee4ce')
  scene.background = paper
  const camera = new T.PerspectiveCamera(65, 1, .075, 2300)
  const fog = new T.FogExp2(paper, .0012); scene.fog = fog
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  let state: InkState = { mode: 'landing', playing: false, time: 0, fog: .5, moving: false }
  let raf = 0, disposed = false, elapsed = 0, last = performance.now(), lastNotify = 0
  const landscape = buildSongxi(scene, renderer, paper)
  const { ready, materials } = landscape
  const water = createInkWater(paper, window.innerWidth < 700); scene.add(water)
  const waterMaterial = water.material as T.ShaderMaterial
  const ripplePool = Array.from({ length: 5 }, () => {
    const points = Array.from({ length: 129 }, (_, i) => new T.Vector3(Math.cos(i / 128 * Math.PI * 2), 0, Math.sin(i / 128 * Math.PI * 2)))
    const line = new T.Line(new T.BufferGeometry().setFromPoints(points), new T.LineBasicMaterial({ color: '#44554d', transparent: true, opacity: 0 })); line.visible = false; scene.add(line); return { line, age: 0 }
  }); let rippleIndex = 0
  const ray = new T.Raycaster(), plane = new T.Plane(new T.Vector3(0, 1, 0), 0)
  const ripple = (x: number, y: number) => {
    const rect = canvas.getBoundingClientRect(); ray.setFromCamera(new T.Vector2((x - rect.left) / rect.width * 2 - 1, 1 - (y - rect.top) / rect.height * 2), camera)
    const hit = new T.Vector3(); if (!ray.ray.intersectPlane(plane, hit) || hit.distanceTo(camera.position) > 500) return
    const r = ripplePool[rippleIndex++ % ripplePool.length]; r.age = 0; r.line.position.copy(hit); r.line.position.y = .025; r.line.visible = true
  }
  let forward = false, yaw = 0, pitch = 0
  let drag: { x: number; y: number; startX: number; startY: number; moved: boolean; id: number } | null = null
  const keys = new Set<string>()
  const notify = () => update({ ...state })
  const clearDrag = () => {
    const id = drag?.id; drag = null
    if (id !== undefined && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id)
  }
  const clearInput = () => { keys.clear(); forward = false; state.moving = false; clearDrag() }
  const takeOver = ({ focus = false }: { focus?: boolean } = {}) => {
    const dir = camera.getWorldDirection(new T.Vector3()); yaw = Math.atan2(-dir.x, -dir.z); pitch = Math.asin(dir.y)
    clearInput(); state.mode = 'free'; state.playing = false
    if (focus) canvas.focus({ preventScroll: true })
    notify()
  }
  const inputAllowed = () => !canvas.closest('[inert], [data-panel-open="true"]') && !canvas.closest('.ink-landscape')?.querySelector('dialog[open]')
  const down = (e: PointerEvent) => {
    if (!e.isPrimary || e.button !== 0 || drag || state.mode === 'landing' || !inputAllowed() || !ownsExperienceStageInput(canvas.closest('.experience-stage'), e)) return
    canvas.focus({ preventScroll: true })
    if (state.mode === 'free') interact()
    drag = { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, moved: false, id: e.pointerId }
    canvas.setPointerCapture(e.pointerId)
  }
  const move = (e: PointerEvent) => {
    if (!drag || drag.id !== e.pointerId) return
    if (!inputAllowed()) { clearDrag(); return }
    const gesture = drag
    if (!gesture.moved && Math.hypot(e.clientX - gesture.startX, e.clientY - gesture.startY) < 6) return
    if (state.mode === 'flight') {
      // Keep the current flight pose, then continue this same physical drag.
      takeOver({ focus: true }); interact(); drag = gesture; canvas.setPointerCapture(e.pointerId)
    }
    const dx = e.clientX - gesture.x, dy = e.clientY - gesture.y
    gesture.moved = true; yaw -= dx * .004; pitch = Math.max(-1.15, Math.min(1.15, pitch - dy * .004))
    gesture.x = e.clientX; gesture.y = e.clientY
  }
  const up = (e: PointerEvent) => {
    if (!drag || drag.id !== e.pointerId) return
    if (state.mode === 'free' && !drag.moved && inputAllowed()) ripple(e.clientX, e.clientY)
    clearDrag()
  }
  const cancel = (e: PointerEvent) => { if (drag?.id === e.pointerId) clearDrag() }
  const keydown = (e: KeyboardEvent) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
    if (state.mode !== 'free' || !inputAllowed() || !ownsExperienceStageInput(canvas.closest('.experience-stage'), e) || !['w','a','s','d','q','e','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key)) return
    e.preventDefault(); canvas.focus({ preventScroll: true }); interact(); keys.add(key)
  }
  const keyup = (e: KeyboardEvent) => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key)
  const blur = (event: Event) => {
    const next = 'relatedTarget' in event ? event.relatedTarget : null
    const ownControl = event.target === canvas && next instanceof Element
      && canvas.closest('.ink-landscape')?.contains(next)
      && next.closest('button, input, select, [role="button"], [role="slider"]')
    // Clicking our stop button must not reset its state before onClick reads it.
    if (ownControl) { keys.clear(); clearDrag() } else clearInput()
    notify()
  }
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', cancel); canvas.addEventListener('lostpointercapture', cancel); canvas.addEventListener('blur', blur)
  // A first movement key may target BODY; claim it before shell navigation.
  window.addEventListener('keydown', keydown, true); window.addEventListener('keyup', keyup, true); window.addEventListener('blur', blur)
  const resize = () => { const { width, height } = canvas.getBoundingClientRect(); renderer.setSize(width, height, false); camera.aspect = width / Math.max(1, height); camera.fov = camera.aspect < 1 ? 96 : 65; camera.updateProjectionMatrix() }
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize()
  const setPose = () => {
    if (state.mode === 'landing') { camera.position.set(camera.aspect < 1 ? -3 : -6, 4.8, 91); camera.lookAt(0, 6, 11); return }
    const s = sampleFlight(state.time, camera.aspect, reduced.matches)
    camera.position.copy(s.position); camera.up.set(0, 1, 0); camera.lookAt(s.target)
  }
  setPose(); notify()
  const frame = (now: number) => {
    if (disposed) return
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now
    const active = state.mode !== 'flight' || state.playing
    if (active && !document.hidden) elapsed += dt
    if (state.mode === 'flight') {
      if (state.playing && !document.hidden) state.time = Math.min(FLIGHT_SECONDS, state.time + dt)
      setPose()
      if (state.time >= FLIGHT_SECONDS && state.playing) { takeOver(); finish() }
      if (now - lastNotify > 120) { notify(); lastNotify = now }
    } else if (state.mode === 'free') {
      camera.up.set(0, 1, 0); camera.rotation.set(pitch, yaw, 0, 'YXZ')
      if (inputAllowed()) {
        const speed = 29 * dt, dir = camera.getWorldDirection(new T.Vector3()), right = new T.Vector3().crossVectors(dir, camera.up)
        if (forward || keys.has('w') || keys.has('ArrowUp')) camera.position.addScaledVector(dir, speed)
        if (keys.has('s') || keys.has('ArrowDown')) camera.position.addScaledVector(dir, -speed)
        if (keys.has('d') || keys.has('ArrowRight')) camera.position.addScaledVector(right, speed)
        if (keys.has('a') || keys.has('ArrowLeft')) camera.position.addScaledVector(right, -speed)
        if (keys.has('e')) camera.position.y += speed
        if (keys.has('q')) camera.position.y -= speed
        camera.position.y = Math.max(.8, Math.min(350, camera.position.y)); camera.position.x = Math.max(-520, Math.min(520, camera.position.x)); camera.position.z = Math.max(-1050, Math.min(180, camera.position.z))
      }
    }
    waterMaterial.uniforms.time.value = reduced.matches ? 0 : state.mode === 'flight' ? state.time : elapsed
    landscape.animate(reduced.matches ? 0 : state.mode === 'flight' ? state.time : elapsed)
    for (const r of ripplePool) if (r.line.visible) { r.age += active ? dt : 0; r.line.scale.setScalar(1 + r.age * 4); (r.line.material as T.LineBasicMaterial).opacity = Math.max(0, .5 - r.age * .11); if (r.age > 4.6) r.line.visible = false }
    renderer.render(scene, camera); raf = requestAnimationFrame(frame)
  }; raf = requestAnimationFrame(frame)
  return {
    ready,
    play() { clearInput(); state.mode = 'flight'; state.time = 0; elapsed = 0; state.playing = true; notify() },
    pause() { state.playing = !state.playing; notify() },
    seek(time: number) { clearInput(); state.mode = 'flight'; state.time = Math.max(0, Math.min(FLIGHT_SECONDS, time)); state.playing = false; setPose(); notify() },
    takeOver,
    forward(value: boolean) { forward = value; state.moving = value; notify() },
    fog(value: number) { state.fog = value; fog.density = .0006 + value * .0012; for (const m of materials) m.uniforms.density.value = fog.density; notify() },
    dispose() {
      disposed = true; clearInput(); cancelAnimationFrame(raf); observer.disconnect(); window.removeEventListener('blur', blur)
      window.removeEventListener('keydown', keydown, true); window.removeEventListener('keyup', keyup, true)
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', cancel); canvas.removeEventListener('lostpointercapture', cancel); canvas.removeEventListener('blur', blur)
      const geometries = new Set<T.BufferGeometry>(), mats = new Set<T.Material>()
      scene.traverse(object => { if (object instanceof T.Mesh || object instanceof T.Line || object instanceof T.Points) { geometries.add(object.geometry); for (const m of Array.isArray(object.material) ? object.material : [object.material]) mats.add(m) } })
      geometries.forEach(g => g.dispose()); mats.forEach(m => m.dispose()); landscape.dispose(); water.getRenderTarget().dispose(); renderer.dispose()
    },
  }
}
