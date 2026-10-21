/**
 * Default world-music bed.
 *
 * This is not a site-wide loop. It plays only while a world without its own
 * music is open. Entering a world that owns sound, or leaving explore,
 * yields the channel. The toolbar mutes rather than pausing so unmuting
 * continues mid-track without a restart.
 */

import { useCallback, useSyncExternalStore } from 'react'

import { createSafeStorage, type SafeStorage } from './storage'

export const SITE_BGM_SRC = '/assets/audio/hidden-shapes.mp3'
export const SITE_BGM_MUTE_KEY = 'oneworld.site-bgm.muted.v1'
/** Quiet enough to sit under narration and world SFX without competing. */
export const SITE_BGM_VOLUME = 0.28
const SOUNDTRACK_START_TIMEOUT_MS = 8_000

export type SiteBgmController = {
  isMuted: () => boolean
  isActive: () => boolean
  setMuted: (muted: boolean) => void
  toggleMuted: () => boolean
  /** Begin (or resume) the default bed for a world that has no music of its own. */
  requestPlay: (src?: string) => void
  /** Stop the default bed so a world or a non-world page can own the sound. */
  yieldPlayback: () => void
  subscribe: (listener: () => void) => () => void
  /** Test / teardown only. */
  dispose: () => void
}

type SiteBgmOptions = {
  storage?: SafeStorage
  createAudio?: () => HTMLAudioElement
  documentRef?: Document
}

function defaultCreateAudio(): HTMLAudioElement {
  const audio = new Audio()
  audio.loop = true
  audio.preload = 'auto'
  audio.crossOrigin = 'anonymous'
  return audio
}

export function createSiteBgmController(options: SiteBgmOptions = {}): SiteBgmController {
  const storage = options.storage ?? createSafeStorage(() => {
    if (typeof window === 'undefined') return
    return window.localStorage
  })
  const createAudio = options.createAudio ?? defaultCreateAudio
  const documentRef = options.documentRef

  let muted = storage.get(SITE_BGM_MUTE_KEY) === '1'
  let active = false
  let audio: HTMLAudioElement | null = null
  let disposed = false
  let gestureBound = false
  let visibilityDocument: Document | null = null
  let startupTimer: ReturnType<typeof setTimeout> | null = null
  const listeners = new Set<() => void>()

  function notify() {
    for (const listener of listeners) listener()
  }

  function clearStartupTimer() {
    if (startupTimer === null) return
    clearTimeout(startupTimer)
    startupTimer = null
  }

  function watchStartup(el: HTMLAudioElement, src: string) {
    clearStartupTimer()
    if (src === SITE_BGM_SRC) return
    startupTimer = setTimeout(() => {
      startupTimer = null
      if (disposed || !active || audio !== el || el.readyState > 0) return
      if (el.src !== src && !el.src.endsWith(src)) return
      // The remote stream can return headers without delivering playable data.
      // Use the bundled soundtrack so the world does not remain silent.
      el.src = SITE_BGM_SRC
      el.load?.()
      bindGestureUnlock()
      void tryPlay()
    }, SOUNDTRACK_START_TIMEOUT_MS)
  }

  function ensureAudio(): HTMLAudioElement | null {
    if (disposed) return null
    if (typeof window === 'undefined' && !options.createAudio) return null
    if (audio) return audio
    audio = createAudio()
    audio.addEventListener?.('stalled', handleStalled)
    audio.loop = true
    audio.volume = SITE_BGM_VOLUME
    audio.muted = muted
    bindVisibility()
    return audio
  }

  function bindVisibility() {
    if (visibilityDocument) return
    const doc = documentRef ?? (typeof document !== 'undefined' ? document : undefined)
    if (!doc) return
    visibilityDocument = doc
    doc.addEventListener('visibilitychange', handleVisibility)
  }

  function isDocumentHidden() {
    return visibilityDocument?.visibilityState === 'hidden'
  }

  function handleVisibility() {
    if (!audio || !active) return
    if (isDocumentHidden()) {
      audio.pause()
      return
    }
    void tryPlay()
  }

  function unbindGesture() {
    if (!gestureBound || typeof window === 'undefined') return
    window.removeEventListener('pointerdown', unlockFromGesture, true)
    window.removeEventListener('keydown', unlockFromGesture, true)
    gestureBound = false
  }

  function unlockFromGesture() {
    unbindGesture()
    // A play() promise can stay pending while the first media request stalls.
    // Restart loading inside the gesture so the pending request cannot strand
    // an apparently unmuted world with no audible soundtrack.
    if (audio?.readyState === 0) audio.load?.()
    void tryPlay()
  }

  function handleStalled() {
    if (active && audio?.readyState === 0) bindGestureUnlock()
  }

  function bindGestureUnlock() {
    if (gestureBound || typeof window === 'undefined') return
    gestureBound = true
    window.addEventListener('pointerdown', unlockFromGesture, true)
    window.addEventListener('keydown', unlockFromGesture, true)
  }

  async function tryPlay() {
    const el = ensureAudio()
    if (!el || !active || isDocumentHidden()) return
    el.muted = muted
    el.volume = SITE_BGM_VOLUME
    if (!el.paused) {
      if (el.readyState > 0) unbindGesture()
      return
    }
    try {
      await el.play()
      if (disposed || audio !== el || !active || isDocumentHidden()) {
        el.pause()
        return
      }
      unbindGesture()
    } catch (error) {
      if (disposed || audio !== el || !active) return
      const name = typeof error === 'object' && error !== null && 'name' in error ? error.name : undefined
      if (name === 'NotAllowedError') {
        bindGestureUnlock()
      } else if (name !== 'AbortError') {
        // Network/codec failures cannot be repaired by every subsequent click.
        unbindGesture()
        console.warn('World music playback failed', error)
      }
    }
  }

  return {
    isMuted: () => muted,
    isActive: () => active,
    setMuted(next) {
      if (muted === next) return
      muted = next
      storage.set(SITE_BGM_MUTE_KEY, next ? '1' : '0')
      if (audio) {
        audio.muted = muted
        audio.volume = SITE_BGM_VOLUME
      }
      notify()
    },
    toggleMuted() {
      muted = !muted
      storage.set(SITE_BGM_MUTE_KEY, muted ? '1' : '0')
      if (audio) {
        audio.muted = muted
        audio.volume = SITE_BGM_VOLUME
      }
      notify()
      return muted
    },
    requestPlay(src = SITE_BGM_SRC) {
      if (disposed) return
      active = true
      const el = ensureAudio()
      if (el && el.src !== src && !el.src.endsWith(src)) {
        el.src = src
        el.loop = true
      }
      if (el) watchStartup(el, src)
      // Keep a gesture fallback while the initial play promise is pending.
      // Some browsers stall before they can reject autoplay or decode media.
      bindGestureUnlock()
      void tryPlay()
      notify()
    },
    yieldPlayback() {
      if (!active && (!audio || audio.paused)) return
      active = false
      clearStartupTimer()
      unbindGesture()
      audio?.pause()
      notify()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    dispose() {
      disposed = true
      clearStartupTimer()
      unbindGesture()
      visibilityDocument?.removeEventListener('visibilitychange', handleVisibility)
      visibilityDocument = null
      listeners.clear()
      if (audio) {
        audio.removeEventListener?.('stalled', handleStalled)
        audio.pause()
        audio.src = ''
        audio = null
      }
      active = false
    },
  }
}

let sharedController: SiteBgmController | null = null

export function getSiteBgmController(): SiteBgmController {
  if (!sharedController) sharedController = createSiteBgmController()
  return sharedController
}

/** Reset the shared singleton — tests only. */
export function resetSiteBgmControllerForTests() {
  sharedController?.dispose()
  sharedController = null
}

export function useSiteBgm() {
  const controller = getSiteBgmController()
  const muted = useSyncExternalStore(
    controller.subscribe,
    controller.isMuted,
    () => true,
  )
  const active = useSyncExternalStore(
    controller.subscribe,
    controller.isActive,
    () => false,
  )
  const setMuted = useCallback((next: boolean) => {
    controller.setMuted(next)
  }, [controller])
  const toggleMuted = useCallback(() => controller.toggleMuted(), [controller])
  const requestPlay = useCallback(() => {
    controller.requestPlay()
  }, [controller])
  const yieldPlayback = useCallback(() => {
    controller.yieldPlayback()
  }, [controller])

  return { muted, active, setMuted, toggleMuted, requestPlay, yieldPlayback }
}
