import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PerspectiveCamera, Scene } from 'three'
import { createInkScene, type InkEngine, type InkState } from './scene'

const render = vi.hoisted(() => vi.fn())
vi.mock('three', async importOriginal => {
  const actual = await importOriginal<typeof import('three')>()
  return { ...actual, WebGLRenderer: class {
    setPixelRatio() {} setSize() {} dispose() {}
    render = render
  } }
})
vi.mock('./songxi-landscape', () => ({ buildSongxi: () => ({ ready: Promise.resolve(), materials: [], animate() {}, dispose() {} }) }))
vi.mock('./ink-material', async () => {
  const { Mesh, PlaneGeometry, ShaderMaterial } = await import('three')
  return { createInkWater: () => Object.assign(new Mesh(new PlaneGeometry(1, 1), new ShaderMaterial({ uniforms: { time: { value: 0 } } })), { getRenderTarget: () => ({ dispose() {} }) }) }
})

describe('Songxi manual flight input', () => {
  let canvas: HTMLCanvasElement, engine: InkEngine, state: InkState
  let scheduledFrame: FrameRequestCallback, clock: number
  let camera: PerspectiveCamera, scene: Scene
  const tick = () => { scheduledFrame(clock += 16); [scene, camera] = render.mock.lastCall! }
  const pointer = (type: string, x = 500, y = 700, options: { primary?: boolean; button?: number; id?: number } = {}) => {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: options.button ?? 0 })
    Object.defineProperties(event, { pointerId: { value: options.id ?? 1 }, isPrimary: { value: options.primary ?? true } })
    canvas.dispatchEvent(event)
  }
  const key = (type: string, value: string) => canvas.dispatchEvent(new KeyboardEvent(type, { key: value, bubbles: true, cancelable: true }))
  const visibleRipples = () => scene.children.filter(child => child.type === 'Line' && child.visible).length

  beforeEach(() => {
    render.mockClear()
    document.body.innerHTML = '<div class="experience-stage"><div class="ink-landscape"><canvas tabindex="0"></canvas></div></div>'
    canvas = document.querySelector('canvas')!
    canvas.getBoundingClientRect = () => new DOMRect(0, 0, 1000, 800)
    const captures = new Set<number>()
    canvas.setPointerCapture = id => { captures.add(id) }
    canvas.releasePointerCapture = id => { captures.delete(id) }
    canvas.hasPointerCapture = id => captures.has(id)
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { scheduledFrame = callback; return 1 })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    clock = performance.now()
    engine = createInkScene(canvas, value => { state = value }, vi.fn(), vi.fn())
    tick()
  })
  afterEach(() => { engine.dispose(); vi.unstubAllGlobals(); document.body.innerHTML = '' })

  it('enters free flight at the displayed pose without stealing initial focus', () => {
    engine.seek(6); tick()
    const position = camera.position.clone(), direction = camera.quaternion.clone()
    engine.takeOver(); tick()
    expect(state.mode).toBe('free')
    expect(state.playing).toBe(false)
    expect(document.activeElement).not.toBe(canvas)
    expect(camera.position.distanceTo(position)).toBeLessThan(1e-9)
    expect(Math.abs(camera.quaternion.dot(direction))).toBeCloseTo(1, 10)
  })

  it('focuses an explicit takeover and clears movement when restarting or seeking', () => {
    engine.takeOver({ focus: true }); tick()
    expect(document.activeElement).toBe(canvas)
    const start = camera.position.clone()
    key('keydown', 'w'); tick()
    expect(camera.position.distanceTo(start)).toBeGreaterThan(0)
    engine.forward(true); engine.play(); engine.seek(4); engine.takeOver(); tick()
    const stopped = camera.position.clone()
    tick()
    expect(state.moving).toBe(false)
    expect(camera.position.distanceTo(stopped)).toBeLessThan(1e-9)
  })

  it('claims the first movement key from BODY before next-world navigation', () => {
    engine.takeOver(); tick()
    expect(document.activeElement).toBe(document.body)
    const start = camera.position.clone(), nextWorld = vi.fn()
    const shellKeydown = (event: KeyboardEvent) => { if (event.key === 'ArrowDown' && !event.defaultPrevented) nextWorld() }
    window.addEventListener('keydown', shellKeydown)
    try {
      const down = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })
      document.body.dispatchEvent(down); tick()
      expect(down.defaultPrevented).toBe(true)
      expect(nextWorld).not.toHaveBeenCalled()
      expect(document.activeElement).toBe(canvas)
      expect(camera.position.distanceTo(start)).toBeGreaterThan(0)
      document.body.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowDown', bubbles: true }))
      const stopped = camera.position.clone(); tick()
      expect(camera.position.distanceTo(stopped)).toBeLessThan(1e-9)
    } finally { window.removeEventListener('keydown', shellKeydown) }
  })

  it('leaves control keys and browser shortcuts outside the flight input owner', () => {
    engine.takeOver(); tick()
    const input = document.createElement('input'); canvas.parentElement!.appendChild(input); input.focus()
    const controlKey = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })
    input.dispatchEvent(controlKey)
    expect(controlKey.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(input)
    input.blur()
    const shortcut = new KeyboardEvent('keydown', { key: 'w', ctrlKey: true, bubbles: true, cancelable: true })
    document.body.dispatchEvent(shortcut)
    expect(shortcut.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(document.body)
    const stopped = camera.position.clone(); tick()
    expect(camera.position.distanceTo(stopped)).toBeLessThan(1e-9)
  })

  it('ignores taps and small pointer jitter during a tour, then takes over on a deliberate drag', () => {
    engine.seek(3); tick()
    const position = camera.position.clone(), direction = camera.quaternion.clone()
    pointer('pointerdown', 400, 400); pointer('pointermove', 403, 402); pointer('pointerup', 403, 402)
    expect(state.mode).toBe('flight')
    expect(visibleRipples()).toBe(0)
    pointer('pointerdown', 400, 400); pointer('pointermove', 414, 400); tick()
    expect(state.mode).toBe('free')
    expect(document.activeElement).toBe(canvas)
    expect(camera.position.distanceTo(position)).toBeLessThan(1e-9)
    expect(Math.abs(camera.quaternion.dot(direction))).toBeLessThan(.9999)
    pointer('pointermove', 424, 400); pointer('pointerup', 424, 400)
    expect(visibleRipples()).toBe(0)
  })

  it('does not turn a cancelled touch or lost capture into a water click', () => {
    engine.seek(2); engine.takeOver(); tick()
    pointer('pointerdown'); pointer('pointercancel'); pointer('pointerup')
    expect(visibleRipples()).toBe(0)
    pointer('pointerdown'); pointer('lostpointercapture'); pointer('pointerup')
    expect(visibleRipples()).toBe(0)
    pointer('pointerdown'); pointer('pointerup')
    expect(visibleRipples()).toBe(1)
  })

  it('lets the stop control read the running state after it receives focus', () => {
    engine.takeOver({ focus: true }); engine.forward(true)
    const stop = document.createElement('button'); canvas.parentElement!.appendChild(stop)
    stop.focus()
    expect(state.moving).toBe(true)
    // The UI focuses the canvas, then toggles the current continuous-flight state.
    const moving = state.moving
    canvas.focus(); engine.forward(!moving); tick()
    const stopped = camera.position.clone(); tick()
    expect(state.moving).toBe(false)
    expect(camera.position.distanceTo(stopped)).toBeLessThan(1e-9)
  })

  it('stops continuous flight on external focus or window blur', () => {
    engine.takeOver({ focus: true }); engine.forward(true)
    const outside = document.createElement('button'); document.body.appendChild(outside)
    outside.focus()
    expect(state.moving).toBe(false)
    canvas.focus(); engine.forward(true)
    window.dispatchEvent(new FocusEvent('blur'))
    expect(state.moving).toBe(false)
  })

  it('keeps secondary pointers, overlays and a modal from taking over a tour', () => {
    engine.seek(3)
    pointer('pointerdown', 400, 400, { primary: false }); pointer('pointermove', 450, 400)
    pointer('pointerdown', 400, 400, { button: 2 }); pointer('pointermove', 450, 400)
    expect(state.mode).toBe('flight')
    canvas.parentElement!.dataset.experienceOverlay = 'true'
    pointer('pointerdown', 400, 400); pointer('pointermove', 450, 400)
    expect(state.mode).toBe('flight')
    delete canvas.parentElement!.dataset.experienceOverlay
    canvas.parentElement!.insertAdjacentHTML('beforeend', '<dialog open></dialog>')
    pointer('pointerdown', 400, 400); pointer('pointermove', 450, 400)
    expect(state.mode).toBe('flight')
  })
})
