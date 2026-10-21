export type WorldPlaybackListener = {
  onPause?: () => void
  onResume?: () => void
}

export type WorldPlaybackHost = {
  requestAnimationFrame: (callback: FrameRequestCallback) => number
  cancelAnimationFrame: (handle: number) => void
  AudioContext?: typeof AudioContext
  Audio?: typeof Audio
  dispatchEvent?: (event: Event) => boolean
  HTMLAudioElement?: typeof HTMLAudioElement
}

type PendingFrame = {
  callback: FrameRequestCallback
  nativeId: number | null
}

type AudioTransition = {
  target: 'running' | 'suspended'
  promise: Promise<void>
}

const pauseListeners = new Set<() => void>()
const resumeListeners = new Set<() => void>()
const pendingFrames = new Map<number, PendingFrame>()
const trackedAudioContexts = new Set<{ synchronizePlayback: () => Promise<void> }>()
const trackedMedia = new Set<WeakRef<HTMLMediaElement>>()
const collectedMedia = new FinalizationRegistry<WeakRef<HTMLMediaElement>>((reference) => {
  trackedMedia.delete(reference)
})
let mediaPlayback = new WeakMap<HTMLMediaElement, { suspend: () => void; resume: () => void }>()

let paused = false
let muted = false
let nextFrameId = 1
let nativeRequestAnimationFrame: WorldPlaybackHost['requestAnimationFrame'] | null = null
let nativeCancelAnimationFrame: WorldPlaybackHost['cancelAnimationFrame'] | null = null
let installedHost: WorldPlaybackHost | null = null
let restoreHost: (() => void) | null = null

function defaultHost(): WorldPlaybackHost | null {
  if (typeof globalThis.requestAnimationFrame !== 'function') return null
  return globalThis as unknown as WorldPlaybackHost
}

function activeHost(): WorldPlaybackHost {
  const host = installedHost ?? defaultHost()
  if (!host) {
    throw new Error('World playback has no animation-frame host')
  }
  return host
}

function ensureInstalled() {
  if (installedHost || nativeRequestAnimationFrame) return
  const host = defaultHost()
  if (host) installWorldPlaybackGuards(host)
}

function nativeRaf(): WorldPlaybackHost['requestAnimationFrame'] {
  ensureInstalled()
  if (nativeRequestAnimationFrame) return nativeRequestAnimationFrame
  const host = defaultHost()
  if (!host) {
    throw new Error('World playback has no animation-frame host')
  }
  return host.requestAnimationFrame.bind(host)
}

function nativeCancel(): WorldPlaybackHost['cancelAnimationFrame'] {
  if (nativeCancelAnimationFrame) return nativeCancelAnimationFrame
  const host = defaultHost()
  if (!host) return () => {}
  return host.cancelAnimationFrame.bind(host)
}

function arm(id: number) {
  const entry = pendingFrames.get(id)
  if (!entry || paused) return
  entry.nativeId = nativeRaf()((time) => {
    const current = pendingFrames.get(id)
    if (!current) return
    pendingFrames.delete(id)
    if (paused) {
      pendingFrames.set(id, { callback: current.callback, nativeId: null })
      return
    }
    current.callback(time)
  })
}

function dispatchWindowEvent(type: string) {
  const host = installedHost ?? defaultHost()
  if (typeof host?.dispatchEvent === 'function' && typeof Event === 'function') {
    host.dispatchEvent(new Event(type))
  }
}

function audioBlocked(): boolean {
  return paused || muted
}

function synchronizeAudio() {
  for (const context of trackedAudioContexts) {
    void context.synchronizePlayback().catch(() => {})
  }
  for (const reference of trackedMedia) {
    const media = reference.deref()
    if (!media) {
      trackedMedia.delete(reference)
      continue
    }
    const playback = mediaPlayback.get(media)
    if (audioBlocked()) playback?.suspend()
    else playback?.resume()
  }
}

export function isWorldPaused(): boolean {
  return paused
}

export function isWorldAudioMuted(): boolean {
  return muted
}

export function setWorldAudioMuted(next: boolean): void {
  if (muted === next) return
  muted = next
  synchronizeAudio()
}

export function requestWorldFrame(callback: FrameRequestCallback): number {
  ensureInstalled()
  const id = nextFrameId
  nextFrameId += 1
  pendingFrames.set(id, { callback, nativeId: null })
  if (!paused) arm(id)
  return id
}

export function cancelWorldFrame(handle: number): void {
  const entry = pendingFrames.get(handle)
  if (!entry) return
  if (entry.nativeId != null) nativeCancel()(entry.nativeId)
  pendingFrames.delete(handle)
}

export function subscribeWorldPlayback(listener: WorldPlaybackListener): () => void {
  const onPause = listener.onPause
  const onResume = listener.onResume
  if (onPause) pauseListeners.add(onPause)
  if (onResume) resumeListeners.add(onResume)
  return () => {
    if (onPause) pauseListeners.delete(onPause)
    if (onResume) resumeListeners.delete(onResume)
  }
}

export function setWorldPaused(next: boolean): void {
  ensureInstalled()
  if (paused === next) return
  paused = next
  if (next) {
    for (const entry of pendingFrames.values()) {
      if (entry.nativeId != null) {
        nativeCancel()(entry.nativeId)
        entry.nativeId = null
      }
    }
    synchronizeAudio()
    for (const listener of pauseListeners) listener()
    dispatchWindowEvent('shapeofworld:pause')
    return
  }
  synchronizeAudio()
  for (const listener of resumeListeners) listener()
  dispatchWindowEvent('shapeofworld:resume')
  for (const id of pendingFrames.keys()) arm(id)
}

function installAudioContextGuard(host: WorldPlaybackHost) {
  const NativeAudioContext = host.AudioContext
  if (!NativeAudioContext) return () => {}
  class GuardedAudioContext extends NativeAudioContext {
    #wantsPlayback: boolean
    #blocked = false
    #closing = false
    #transition: AudioTransition | null = null

    constructor(options?: AudioContextOptions) {
      super(options)
      this.#wantsPlayback = this.state === 'running'
      trackedAudioContexts.add(this)
      void this.synchronizePlayback().catch(() => {})
    }

    synchronizePlayback(): Promise<void> {
      const nextBlocked = audioBlocked()
      if (nextBlocked && !this.#blocked && !this.#transition) {
        // Browser/autoplay suspension is not a request for the shell to resume it.
        this.#wantsPlayback = this.state === 'running'
      }
      this.#blocked = nextBlocked
      return this.#reconcile()
    }

    #reconcile(explicitResume = false): Promise<void> {
      if (this.#closing || this.state === 'closed') return Promise.resolve()
      const target = this.#wantsPlayback && !this.#blocked ? 'running' : 'suspended'
      if (this.#transition?.target === target && !(explicitResume && target === 'running')) {
        return this.#transition.promise
      }
      if (!this.#transition && this.state === target) return Promise.resolve()
      // An autoplay-blocked resume can remain pending until another user gesture.
      // Forward explicit resumes and changed targets without waiting for that promise.
      const operation = target === 'running' ? super.resume() : super.suspend()
      const transition: AudioTransition = { target, promise: operation }
      transition.promise = operation.then(() => {
        if (this.#transition === transition) this.#transition = null
        const desired = this.#wantsPlayback && !this.#blocked ? 'running' : 'suspended'
        if (target !== desired) void this.#reconcile().catch(() => {})
      }, (error: unknown) => {
        if (this.#transition === transition) this.#transition = null
        const desired = this.#wantsPlayback && !this.#blocked ? 'running' : 'suspended'
        if (target !== desired) void this.#reconcile().catch(() => {})
        throw error
      })
      this.#transition = transition
      return transition.promise
    }

    override resume(): Promise<void> {
      if (this.#closing || this.state === 'closed') return super.resume()
      this.#wantsPlayback = true
      return this.#reconcile(true)
    }

    override suspend(): Promise<void> {
      if (this.#closing || this.state === 'closed') return super.suspend()
      this.#wantsPlayback = false
      return this.#reconcile()
    }

    override close(): Promise<void> {
      this.#closing = true
      this.#wantsPlayback = false
      trackedAudioContexts.delete(this)
      return super.close()
    }
  }
  host.AudioContext = GuardedAudioContext as typeof AudioContext
  return () => {
    host.AudioContext = NativeAudioContext
  }
}

function installMediaGuard(host: WorldPlaybackHost) {
  const NativeAudio = host.Audio
  if (!NativeAudio) return () => {}
  const GuardedAudio = function GuardedAudio(this: HTMLAudioElement, src?: string) {
    const element = src === undefined ? new NativeAudio() : new NativeAudio(src)
    const reference = new WeakRef(element)
    trackedMedia.add(reference)
    collectedMedia.register(element, reference)
    const nativePlay = element.play.bind(element)
    const nativePause = element.pause.bind(element)
    let resumeAfterBlock = false
    element.play = () => {
      if (audioBlocked()) {
        resumeAfterBlock = true
        return Promise.resolve()
      }
      resumeAfterBlock = false
      return nativePlay()
    }
    element.pause = () => {
      resumeAfterBlock = false
      nativePause()
    }
    mediaPlayback.set(element, {
      suspend() {
        if (element.paused) return
        resumeAfterBlock = true
        nativePause()
      },
      resume() {
        if (!resumeAfterBlock) return
        resumeAfterBlock = false
        void element.play()?.catch(() => {})
      },
    })
    if (audioBlocked()) nativePause()
    return element
  } as unknown as typeof Audio
  GuardedAudio.prototype = NativeAudio.prototype
  host.Audio = GuardedAudio
  return () => {
    host.Audio = NativeAudio
  }
}

export function installWorldPlaybackGuards(host: WorldPlaybackHost = activeHost()): () => void {
  if (installedHost === host && restoreHost) return restoreHost
  restoreHost?.()
  installedHost = host
  nativeRequestAnimationFrame = host.requestAnimationFrame.bind(host)
  nativeCancelAnimationFrame = host.cancelAnimationFrame.bind(host)
  host.requestAnimationFrame = requestWorldFrame
  host.cancelAnimationFrame = cancelWorldFrame
  const restoreAudio = installAudioContextGuard(host)
  const restoreMedia = installMediaGuard(host)
  restoreHost = () => {
    host.requestAnimationFrame = nativeRequestAnimationFrame!
    host.cancelAnimationFrame = nativeCancelAnimationFrame!
    restoreAudio()
    restoreMedia()
    installedHost = null
    nativeRequestAnimationFrame = null
    nativeCancelAnimationFrame = null
    restoreHost = null
  }
  return restoreHost
}

export function resetWorldPlaybackForTests(): void {
  restoreHost?.()
  paused = false
  muted = false
  nextFrameId = 1
  pauseListeners.clear()
  resumeListeners.clear()
  pendingFrames.clear()
  trackedAudioContexts.clear()
  trackedMedia.clear()
  mediaPlayback = new WeakMap()
}
