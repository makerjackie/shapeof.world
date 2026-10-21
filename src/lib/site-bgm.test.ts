import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createSiteBgmController,
  SITE_BGM_MUTE_KEY,
  SITE_BGM_VOLUME,
} from './site-bgm'
import { createSafeStorage, type StorageArea } from './storage'
import { installWorldPlaybackGuards, resetWorldPlaybackForTests, setWorldPaused } from './world-playback'

function memoryStorage(): StorageArea {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
    removeItem: (key) => {
      values.delete(key)
    },
  }
}

function mockAudio() {
  const state = {
    paused: true,
    muted: false,
    volume: 1,
    loop: false,
    src: '',
    playCalls: 0,
    pauseCalls: 0,
    shouldRejectPlay: false,
  }
  const audio = {
    get paused() {
      return state.paused
    },
    get muted() {
      return state.muted
    },
    set muted(value: boolean) {
      state.muted = value
    },
    get volume() {
      return state.volume
    },
    set volume(value: number) {
      state.volume = value
    },
    get loop() {
      return state.loop
    },
    set loop(value: boolean) {
      state.loop = value
    },
    get src() {
      return state.src
    },
    set src(value: string) {
      state.src = value
    },
    play: vi.fn(async () => {
      state.playCalls += 1
      if (state.shouldRejectPlay) throw new DOMException('Playback needs a gesture', 'NotAllowedError')
      state.paused = false
    }),
    pause: vi.fn(() => {
      state.pauseCalls += 1
      state.paused = true
    }),
  } as unknown as HTMLAudioElement
  return { audio, state }
}

describe('site BGM controller', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    resetWorldPlaybackForTests()
  })

  it('starts muted state from storage and keeps audio playing while muted', async () => {
    const area = memoryStorage()
    area.setItem(SITE_BGM_MUTE_KEY, '1')
    const storage = createSafeStorage(() => area)
    const { audio, state } = mockAudio()
    const controller = createSiteBgmController({
      storage,
      createAudio: () => audio,
    })

    expect(controller.isMuted()).toBe(true)
    controller.requestPlay()
    await Promise.resolve()

    expect(audio.play).toHaveBeenCalled()
    expect(state.paused).toBe(false)
    expect(state.muted).toBe(true)
    expect(state.volume).toBe(SITE_BGM_VOLUME)
    expect(state.loop).toBe(true)

    controller.dispose()
  })

  it('toggles mute without pausing and persists the preference', async () => {
    const area = memoryStorage()
    const storage = createSafeStorage(() => area)
    const { audio, state } = mockAudio()
    const controller = createSiteBgmController({
      storage,
      createAudio: () => audio,
    })
    const snapshots: Array<boolean> = []
    controller.subscribe(() => {
      snapshots.push(controller.isMuted())
    })

    controller.requestPlay()
    await Promise.resolve()
    expect(state.paused).toBe(false)
    expect(controller.isMuted()).toBe(false)

    const next = controller.toggleMuted()
    expect(next).toBe(true)
    expect(controller.isMuted()).toBe(true)
    expect(state.muted).toBe(true)
    expect(state.paused).toBe(false)
    expect(area.getItem(SITE_BGM_MUTE_KEY)).toBe('1')
    expect(snapshots.at(-1)).toBe(true)

    controller.setMuted(false)
    expect(controller.isMuted()).toBe(false)
    expect(state.muted).toBe(false)
    expect(state.paused).toBe(false)
    expect(area.getItem(SITE_BGM_MUTE_KEY)).toBe('0')

    controller.dispose()
  })

  it('retries play after autoplay is blocked once a gesture arrives', async () => {
    const area = memoryStorage()
    const storage = createSafeStorage(() => area)
    const { audio, state } = mockAudio()
    state.shouldRejectPlay = true

    const listeners = new Map<string, EventListener>()
    const addSpy = vi.spyOn(window, 'addEventListener').mockImplementation((type, listener) => {
      listeners.set(type, listener as EventListener)
    })
    const removeSpy = vi.spyOn(window, 'removeEventListener').mockImplementation((type) => {
      listeners.delete(type)
    })

    const controller = createSiteBgmController({
      storage,
      createAudio: () => audio,
    })

    controller.requestPlay()
    await Promise.resolve()
    expect(state.paused).toBe(true)
    expect(listeners.has('pointerdown')).toBe(true)

    state.shouldRejectPlay = false
    listeners.get('pointerdown')?.(new Event('pointerdown'))
    await Promise.resolve()

    expect(state.paused).toBe(false)
    expect(listeners.has('pointerdown')).toBe(false)

    addSpy.mockRestore()
    removeSpy.mockRestore()
    controller.dispose()
  })

  it('does not retry network or codec failures on every gesture', async () => {
    const { audio } = mockAudio()
    audio.play = vi.fn().mockRejectedValue(new DOMException('Audio unavailable', 'NotSupportedError'))
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const controller = createSiteBgmController({ createAudio: () => audio })
    controller.requestPlay()
    await Promise.resolve()
    expect(add.mock.calls.filter(([type]) => String(type) === 'pointerdown')).toHaveLength(1)
    expect(remove.mock.calls.filter(([type]) => String(type) === 'pointerdown')).toHaveLength(1)
    expect(warn).toHaveBeenCalledOnce()
    controller.dispose()
  })

  it('yields the bed when a world takes over or the visitor leaves explore', async () => {
    const area = memoryStorage()
    const storage = createSafeStorage(() => area)
    const { audio, state } = mockAudio()
    const controller = createSiteBgmController({
      storage,
      createAudio: () => audio,
    })

    controller.requestPlay()
    await Promise.resolve()
    expect(state.paused).toBe(false)
    expect(controller.isActive()).toBe(true)

    controller.yieldPlayback()
    expect(state.paused).toBe(true)
    expect(controller.isActive()).toBe(false)
    expect(audio.pause).toHaveBeenCalled()

    controller.setMuted(true)
    expect(state.paused).toBe(true)
    expect(controller.isActive()).toBe(false)

    controller.requestPlay()
    await Promise.resolve()
    expect(state.paused).toBe(false)
    expect(state.muted).toBe(true)
    expect(controller.isActive()).toBe(true)

    controller.dispose()
  })

  it('switches the bed to the requested original without using r2.dev', async () => {
    const area = memoryStorage()
    const storage = createSafeStorage(() => area)
    const { audio, state } = mockAudio()
    const controller = createSiteBgmController({
      storage,
      createAudio: () => audio,
    })
    const src = 'https://music-cdn.shapeof.world/tracks/orbital-garden/v1/preview.mp3'
    controller.requestPlay(src)
    await Promise.resolve()
    expect(state.src).toBe(src)
    expect(state.src).not.toContain('r2.dev')
    controller.dispose()
  })

  it('unsubscribes visibility changes and cannot restart after disposal', async () => {
    const { audio, state } = mockAudio()
    const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' })
    const addListener = vi.spyOn(doc, 'addEventListener')
    const removeListener = vi.spyOn(doc, 'removeEventListener')
    const controller = createSiteBgmController({
      createAudio: () => audio,
      documentRef: doc as unknown as Document,
    })
    controller.requestPlay()
    await Promise.resolve()
    doc.visibilityState = 'hidden'
    doc.dispatchEvent(new Event('visibilitychange'))
    expect(state.paused).toBe(true)
    doc.visibilityState = 'visible'
    doc.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()
    expect(state.playCalls).toBe(2)

    controller.dispose()
    expect(removeListener).toHaveBeenCalledWith('visibilitychange', addListener.mock.calls[0]?.[1])
    doc.dispatchEvent(new Event('visibilitychange'))
    controller.requestPlay()
    expect(state.playCalls).toBe(2)
    expect(controller.isActive()).toBe(false)
  })

  it('does not restore gesture listeners if a pending play rejects after disposal', async () => {
    const { audio } = mockAudio()
    let rejectPlay: (error: Error) => void = () => {}
    audio.play = vi.fn(() => new Promise<void>((_, reject) => { rejectPlay = reject }))
    const addListener = vi.spyOn(window, 'addEventListener')
    const removeListener = vi.spyOn(window, 'removeEventListener')
    const controller = createSiteBgmController({ createAudio: () => audio })
    controller.requestPlay()
    const gestureAdds = addListener.mock.calls.filter(([type]) => String(type) === 'pointerdown' || String(type) === 'keydown')
    expect(gestureAdds).toHaveLength(2)
    controller.dispose()
    rejectPlay(new Error('NotAllowedError'))
    await Promise.resolve()
    expect(addListener.mock.calls.filter(([type]) => String(type) === 'pointerdown' || String(type) === 'keydown')).toEqual(gestureAdds)
    expect(removeListener.mock.calls.filter(([type]) => String(type) === 'pointerdown' || String(type) === 'keydown')).toHaveLength(2)
  })

  it('retries a stalled initial stream on the first gesture', async () => {
    const { audio, state } = mockAudio()
    const mediaEvents = new EventTarget()
    let readyState = 0
    audio.addEventListener = mediaEvents.addEventListener.bind(mediaEvents)
    audio.removeEventListener = mediaEvents.removeEventListener.bind(mediaEvents)
    Object.defineProperty(audio, 'readyState', { get: () => readyState })
    audio.load = vi.fn(() => {
      state.paused = true
      readyState = 4
    })
    audio.play = vi.fn(() => {
      state.playCalls += 1
      state.paused = false
      return state.playCalls === 1 ? new Promise<void>(() => {}) : Promise.resolve()
    })
    const controller = createSiteBgmController({ createAudio: () => audio })

    controller.requestPlay()
    mediaEvents.dispatchEvent(new Event('stalled'))
    window.dispatchEvent(new Event('pointerdown'))
    await Promise.resolve()

    expect(audio.load).toHaveBeenCalledOnce()
    expect(audio.play).toHaveBeenCalledTimes(2)
    expect(state.paused).toBe(false)
    controller.dispose()
  })

  it('uses the bundled soundtrack if a remote stream never yields playable data', async () => {
    vi.useFakeTimers()
    const { audio, state } = mockAudio()
    Object.defineProperty(audio, 'readyState', { get: () => 0 })
    audio.load = vi.fn(() => { state.paused = true })
    audio.play = vi.fn(() => {
      state.playCalls += 1
      state.paused = false
      return new Promise<void>(() => {})
    })
    const controller = createSiteBgmController({ createAudio: () => audio })

    controller.requestPlay('/media/music/living-blue/v1/preview.mp3')
    await vi.advanceTimersByTimeAsync(8_000)

    expect(audio.src).toContain('/assets/audio/hidden-shapes.mp3')
    expect(audio.load).toHaveBeenCalledOnce()
    expect(audio.play).toHaveBeenCalledTimes(2)
    controller.dispose()
  })

  it('does not switch soundtracks after yielding playback', async () => {
    vi.useFakeTimers()
    const { audio } = mockAudio()
    Object.defineProperty(audio, 'readyState', { get: () => 0 })
    const controller = createSiteBgmController({ createAudio: () => audio })

    controller.requestPlay('/media/music/living-blue/v1/preview.mp3')
    controller.yieldPlayback()
    await vi.advanceTimersByTimeAsync(8_000)

    expect(audio.src).toContain('/media/music/living-blue/v1/preview.mp3')
    controller.dispose()
  })

  it('stops a pending play that completes after disposal', async () => {
    const { audio, state } = mockAudio()
    let finishPlay: () => void = () => {}
    audio.play = vi.fn(() => new Promise<void>((resolve) => {
      finishPlay = () => { state.paused = false; resolve() }
    }))
    const controller = createSiteBgmController({ createAudio: () => audio })
    controller.requestPlay()
    controller.dispose()
    finishPlay()
    await Promise.resolve()
    expect(state.paused).toBe(true)
    expect(controller.isActive()).toBe(false)
  })

  it('cancels shell-owned media restoration when the controller is disposed', async () => {
    const { audio, state } = mockAudio()
    const host = {
      requestAnimationFrame: () => 0,
      cancelAnimationFrame: () => {},
      Audio: function Audio() { return audio } as unknown as typeof Audio,
    }
    installWorldPlaybackGuards(host)
    const controller = createSiteBgmController({ createAudio: () => new host.Audio() })
    controller.requestPlay()
    await Promise.resolve()
    setWorldPaused(true)
    controller.dispose()
    setWorldPaused(false)
    expect(state.playCalls).toBe(1)
    expect(state.paused).toBe(true)
  })
})
