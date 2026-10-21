/** Owns a legacy DOM/WebGL application's effects without an iframe or global patches. */
export function createScopedRuntime(root: ShadowRoot, body: HTMLElement, translate: (value: string) => string) {
  let disposed = false
  const cleanups: Array<() => void> = []
  const frames = new Set<number>(), timers = new Set<number>(), intervals = new Set<number>()
  const audio: AudioContext[] = []
  // Chapter links belong to this renderer, never overwrite TanStack's state.
  const location = new URL(window.location.href)
  const history = { replaceState(_state: unknown, _title: string, url?: string | URL | null) {
    if (url) location.hash = new URL(url, location).hash
  } }
  const listen = (target: EventTarget, type: string, fn: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean) => {
    target.addEventListener(type, fn, options)
    cleanups.push(() => target.removeEventListener(type, fn, options))
  }
  // Autoplay may be blocked until a trusted gesture. Resume only contexts
  // owned by this world; native gain controls continue to honor mute.
  const unlockAudio = (event: Event) => {
    if (!event.isTrusted || disposed || document.hidden) return
    audio.forEach(context => {
      if (context.state === 'suspended') void context.resume().catch(() => {})
    })
  }
  listen(window, 'pointerdown', unlockAudio)
  listen(window, 'keydown', unlockAudio)
  const requestAnimationFrame = (fn: FrameRequestCallback): number => {
    if (disposed) return 0
    const id = window.requestAnimationFrame(time => { frames.delete(id); if (!disposed) fn(time) })
    frames.add(id); return id
  }
  const setTimeout = (fn: () => void, delay = 0): number => {
    if (disposed) return 0
    const id = window.setTimeout(() => { timers.delete(id); if (!disposed) fn() }, delay)
    timers.add(id); return id
  }
  const setInterval = (fn: () => void, delay = 0): number => {
    if (disposed) return 0
    const id = window.setInterval(() => { if (!disposed) fn() }, delay)
    intervals.add(id); return id
  }
  const matchMedia = (query: string) => {
    const media = window.matchMedia(query)
    return new Proxy(media, { get(target, key) {
      if (key === 'addEventListener') return (type: string, fn: EventListener) => listen(target, type, fn)
      const value = Reflect.get(target, key, target)
      return typeof value === 'function' ? value.bind(target) : value
    } })
  }
  const localWindow = new Proxy(Object.create(null) as Record<string | symbol, unknown>, {
    get(target, key) {
      if (key in target) return target[key]
      if (key === 'location') return location
      if (key === 'history') return history
      if (key === 'addEventListener') return (type: string, fn: EventListener, options?: AddEventListenerOptions | boolean) => listen(window, type, fn, options)
      if (key === 'matchMedia') return matchMedia
      if (key === 'AudioContext' || key === 'webkitAudioContext') return class extends AudioContext {
        constructor(options?: AudioContextOptions) { super(options); audio.push(this) }
      }
      const value = Reflect.get(window, key, window)
      return typeof value === 'function' && !/^[A-Z]/.test(String(key)) ? value.bind(window) : value
    },
    set(target, key, value) { target[key] = value; return true },
  })
  const scopedDocument = new Proxy(document, { get(target, key) {
    if (key === 'body' || key === 'documentElement') return body
    if (key === 'querySelector') return root.querySelector.bind(root)
    if (key === 'querySelectorAll') return root.querySelectorAll.bind(root)
    if (key === 'getElementById') return root.getElementById.bind(root)
    if (key === 'activeElement') return root.activeElement
    if (key === 'addEventListener') return (type: string, fn: EventListener, options?: AddEventListenerOptions | boolean) => listen(type === 'visibilitychange' ? document : root, type, fn, options)
    const value = Reflect.get(target, key, target)
    return typeof value === 'function' ? value.bind(target) : value
  }, set(_target, key, value) {
    // The site owns its document title. Application titles stay inside the stage.
    if (key === 'title') { body.dataset.applicationTitle = String(value); return true }
    return false
  } })
  class ScopedResizeObserver extends ResizeObserver {
    constructor(callback: ResizeObserverCallback) { super(callback); cleanups.push(() => this.disconnect()) }
  }
  const environment = { translate, location: Object.assign(location, { reload: () => window.location.reload() }), history, document: scopedDocument, window: localWindow, requestAnimationFrame,
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window), setTimeout, setInterval,
    clearTimeout: window.clearTimeout.bind(window), clearInterval: window.clearInterval.bind(window),
    matchMedia, ResizeObserver: ScopedResizeObserver }
  Object.assign(localWindow, { document: scopedDocument, requestAnimationFrame, setTimeout, setInterval })
  return { environment, dispose() {
    if (disposed) return
    disposed = true
    frames.forEach(id => window.cancelAnimationFrame(id)); timers.forEach(id => window.clearTimeout(id)); intervals.forEach(id => window.clearInterval(id))
    cleanups.reverse().forEach(cleanup => cleanup())
    audio.forEach(context => { void context.close() })
    root.querySelectorAll('canvas').forEach(canvas => {
      // Context loss is deliberate during teardown; legacy error UI must not
      // run after its DOM has been detached.
      canvas.addEventListener('webglcontextlost', event => event.stopImmediatePropagation(), { capture: true, once: true })
      canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext()
    })
    root.replaceChildren()
  } }
}
