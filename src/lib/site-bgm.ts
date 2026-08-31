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
  const audio = new Audio(SITE_BGM_SRC)
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
  let gestureBound = false
  let visibilityBound = false
  const listeners = new Set<() => void>()

  function notify() {
    for (const listener of listeners) listener()
  }

  function ensureAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined' && !options.createAudio) return null
    if (audio) return audio
    audio = createAudio()
    audio.loop = true
    audio.volume = SITE_BGM_VOLUME
    audio.muted = muted
    if (!audio.src) audio.src = SITE_BGM_SRC
    bindVisibility()
    return audio
  }

  function bindVisibility() {
    if (visibilityBound) return
    const doc = documentRef ?? (typeof document !== 'undefined' ? document : undefined)
    if (!doc) return
    visibilityBound = true
    doc.addEventListener('visibilitychange', () => {
      if (!audio || !active) return
      if (doc.visibilityState === 'hidden') {
        audio.pause()
        return
      }
      void tryPlay()
    })
  }

  function unbindGesture() {
    if (!gestureBound || typeof window === 'undefined') return
    window.removeEventListener('pointerdown', unlockFromGesture, true)
    window.removeEventListener('keydown', unlockFromGesture, true)
    gestureBound = false
  }

  function unlockFromGesture() {
    unbindGesture()
    void tryPlay()
  }

  function bindGestureUnlock() {
    if (gestureBound || typeof window === 'undefined') return
    gestureBound = true
    window.addEventListener('pointerdown', unlockFromGesture, true)
    window.addEventListener('keydown', unlockFromGesture, true)
  }

  async function tryPlay() {
    const el = ensureAudio()
    if (!el || !active) return
    el.muted = muted
    el.volume = SITE_BGM_VOLUME
    if (!el.paused) return
    try {
      await el.play()
      unbindGesture()
    } catch {
      // Autoplay policies block sound until a real user gesture.
      bindGestureUnlock()
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
      active = true
      const el = ensureAudio()
      if (el && el.src !== src && !el.src.endsWith(src)) {
        el.src = src
        el.loop = true
      }
      void tryPlay()
      notify()
    },
    yieldPlayback() {
      if (!active && (!audio || audio.paused)) return
      active = false
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
      unbindGesture()
      listeners.clear()
      if (audio) {
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
