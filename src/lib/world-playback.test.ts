import { afterEach, describe, expect, it } from 'vitest'

import {
  cancelWorldFrame,
  installWorldPlaybackGuards,
  isWorldPaused,
  requestWorldFrame,
  resetWorldPlaybackForTests,
  setWorldAudioMuted,
  setWorldPaused,
  subscribeWorldPlayback,
  type WorldPlaybackHost,
} from './world-playback'

type QueuedFrame = { id: number; callback: FrameRequestCallback }

function createFrameHost() {
  let nextNativeId = 1
  const queue: QueuedFrame[] = []
  const host: WorldPlaybackHost & { flush: (time?: number) => void } = {
    requestAnimationFrame(callback) {
      const id = nextNativeId
      nextNativeId += 1
      queue.push({ id, callback })
      return id
    },
    cancelAnimationFrame(id) {
      const index = queue.findIndex((item) => item.id === id)
      if (index >= 0) queue.splice(index, 1)
    },
    flush(time = 16) {
      const batch = queue.splice(0)
      for (const item of batch) item.callback(time)
    },
  }
  return host
}

async function flushAudioOperations() {
  for (let index = 0; index < 8; index += 1) await Promise.resolve()
}

function createAudioContextHost(initialState: AudioContextState = 'running') {
  type Operation = 'suspend' | 'resume' | 'close'
  class FakeAudioContext {
    state: AudioContextState = initialState
    calls: Operation[] = []
    pending: Array<{ operation: Operation; resolve: () => void; reject: (error: Error) => void }> = []

    transition(operation: Operation) {
      this.calls.push(operation)
      return new Promise<void>((resolve, reject) => {
        this.pending.push({
          operation,
          resolve: () => {
            if (this.state !== 'closed') {
              this.state = operation === 'close' ? 'closed' : operation === 'resume' ? 'running' : 'suspended'
            }
            resolve()
          },
          reject,
        })
      })
    }

    suspend() { return this.transition('suspend') }
    resume() { return this.transition('resume') }
    close() { return this.transition('close') }

    async complete(operation: Operation, index = 0) {
      const [next] = this.pending.splice(index, 1)
      expect(next?.operation).toBe(operation)
      next?.resolve()
      await flushAudioOperations()
    }

    async fail(operation: Operation) {
      const next = this.pending.shift()
      expect(next?.operation).toBe(operation)
      next?.reject(new Error(`${operation} failed`))
      await flushAudioOperations()
    }
  }

  const host = { ...createFrameHost(), AudioContext: FakeAudioContext as unknown as typeof AudioContext }
  installWorldPlaybackGuards(host)
  return { create: () => new host.AudioContext() as unknown as FakeAudioContext }
}

function createMediaHost() {
  class FakeAudio {
    paused = true
    playCalls = 0
    pauseCalls = 0
    play() {
      this.playCalls += 1
      this.paused = false
      return Promise.resolve()
    }
    pause() {
      this.pauseCalls += 1
      this.paused = true
    }
  }
  const host = { ...createFrameHost(), Audio: FakeAudio as unknown as typeof Audio }
  installWorldPlaybackGuards(host)
  return { create: () => new host.Audio() as unknown as FakeAudio }
}

afterEach(() => {
  resetWorldPlaybackForTests()
})

describe('world playback lifecycle', () => {
  it('invokes pause and resume hooks without unmounting the loaded world identity', () => {
    const host = createFrameHost()
    installWorldPlaybackGuards(host)
    const world = { id: 'double-slit', mounted: true }
    const frames: number[] = []
    let pauseHooks = 0
    let resumeHooks = 0

    const unsubscribe = subscribeWorldPlayback({
      onPause: () => {
        pauseHooks += 1
        expect(world.mounted).toBe(true)
        expect(world.id).toBe('double-slit')
      },
      onResume: () => {
        resumeHooks += 1
        expect(world.mounted).toBe(true)
        expect(world.id).toBe('double-slit')
      },
    })

    const loop = (time: number) => {
      frames.push(time)
      requestWorldFrame(loop)
    }
    requestWorldFrame(loop)
    host.flush(16)
    expect(frames).toEqual([16])

    setWorldPaused(true)
    expect(isWorldPaused()).toBe(true)
    expect(pauseHooks).toBe(1)
    expect(world.mounted).toBe(true)
    host.flush(32)
    expect(frames).toEqual([16])

    setWorldPaused(false)
    expect(isWorldPaused()).toBe(false)
    expect(resumeHooks).toBe(1)
    expect(world.mounted).toBe(true)
    host.flush(48)
    expect(frames.length).toBeGreaterThan(1)
    expect(world.mounted).toBe(true)

    unsubscribe()
  })

  it('pauses AudioContext output while the world stays mounted', async () => {
    const host = createAudioContextHost()
    const world = { id: 'black-hole-flyby', mounted: true }
    const context = host.create()
    expect(context.state).toBe('running')

    setWorldPaused(true)
    expect(world.mounted).toBe(true)
    await context.complete('suspend')
    expect(context.state).toBe('suspended')
    await context.resume()
    expect(context.state).toBe('suspended')

    setWorldPaused(false)
    expect(world.mounted).toBe(true)
    await context.complete('resume')
    expect(context.state).toBe('running')
  })

  it('does not fire a cancelled frame after pause', () => {
    const host = createFrameHost()
    installWorldPlaybackGuards(host)
    let calls = 0
    const id = requestWorldFrame(() => {
      calls += 1
    })
    cancelWorldFrame(id)
    setWorldPaused(true)
    setWorldPaused(false)
    host.flush(16)
    expect(calls).toBe(0)
  })
})

describe('AudioContext playback intent', () => {
  it('keeps an already suspended context suspended through overlapping blockers', () => {
    const context = createAudioContextHost('suspended').create()
    setWorldPaused(true)
    setWorldAudioMuted(true)
    setWorldPaused(false)
    setWorldAudioMuted(false)
    expect(context.calls).toEqual([])
    expect(context.state).toBe('suspended')
  })

  it('restores system-suspended audio once the last blocker clears', async () => {
    const context = createAudioContextHost().create()
    setWorldPaused(true)
    setWorldAudioMuted(true)
    await context.complete('suspend')
    setWorldPaused(false)
    expect(context.calls).toEqual(['suspend'])
    setWorldPaused(true)
    setWorldAudioMuted(false)
    expect(context.calls).toEqual(['suspend'])
    setWorldPaused(false)
    await context.complete('resume')
    expect(context.calls).toEqual(['suspend', 'resume'])
  })

  it('does not undo a world suspend that is still in flight when the shell pauses', async () => {
    const context = createAudioContextHost().create()
    const suspended = context.suspend()
    setWorldPaused(true)
    setWorldPaused(false)
    await context.complete('suspend')
    await suspended
    expect(context.state).toBe('suspended')
    expect(context.calls).toEqual(['suspend'])
  })

  it('allows an explicit suspend while blocked to cancel system restoration', async () => {
    const context = createAudioContextHost().create()
    setWorldPaused(true)
    const suspended = context.suspend()
    setWorldPaused(false)
    await context.complete('suspend')
    await suspended
    expect(context.state).toBe('suspended')
    expect(context.calls).toEqual(['suspend'])
  })

  it('remembers an explicit resume while blocked, and a subsequent suspend can cancel it', async () => {
    const context = createAudioContextHost('suspended').create()
    setWorldPaused(true)
    await context.resume()
    expect(context.calls).toEqual([])
    await context.suspend()
    setWorldPaused(false)
    expect(context.calls).toEqual([])
    setWorldAudioMuted(true)
    await context.resume()
    setWorldPaused(true)
    setWorldAudioMuted(false)
    expect(context.calls).toEqual([])
    setWorldPaused(false)
    await context.complete('resume')
    expect(context.state).toBe('running')
  })

  it('does not start a context created suspended while the shell is blocked', () => {
    const host = createAudioContextHost('suspended')
    setWorldAudioMuted(true)
    const context = host.create()
    setWorldAudioMuted(false)
    expect(context.calls).toEqual([])
  })

  it('suspends and restores a running context created while the shell is blocked', async () => {
    const host = createAudioContextHost()
    setWorldAudioMuted(true)
    const context = host.create()
    setWorldAudioMuted(false)
    await context.complete('suspend')
    await context.complete('resume')
    expect(context.state).toBe('running')
  })

  it('forwards changed targets while coalescing overlapping blockers', async () => {
    const context = createAudioContextHost().create()
    setWorldPaused(true)
    setWorldPaused(false)
    setWorldPaused(true)
    setWorldAudioMuted(true)
    expect(context.calls).toEqual(['suspend', 'resume', 'suspend'])
    await context.complete('suspend')
    await context.complete('resume')
    await context.complete('suspend')
    setWorldPaused(false)
    expect(context.calls).toEqual(['suspend', 'resume', 'suspend'])
    setWorldAudioMuted(false)
    await context.complete('resume')
    expect(context.state).toBe('running')
  })

  it('corrects a late native resume after a newer suspension has already completed', async () => {
    const context = createAudioContextHost('suspended').create()
    const resumed = context.resume()
    setWorldAudioMuted(true)
    await context.complete('suspend', 1)
    await context.complete('resume')
    await resumed
    expect(context.calls).toEqual(['resume', 'suspend', 'suspend'])
    await context.complete('suspend')
    expect(context.state).toBe('suspended')
  })

  it('forwards a new user-gesture resume when autoplay left the first resume pending', async () => {
    let allowed = false
    class AutoplayAudioContext {
      state: AudioContextState = 'suspended'
      resumeCalls = 0
      pending: Array<() => void> = []

      resume() {
        this.resumeCalls += 1
        const result = new Promise<void>((resolve) => { this.pending.push(resolve) })
        if (allowed) {
          this.state = 'running'
          for (const resolve of this.pending.splice(0)) resolve()
        }
        return result
      }
      suspend() { this.state = 'suspended'; return Promise.resolve() }
      close() { this.state = 'closed'; return Promise.resolve() }
    }
    const host = { ...createFrameHost(), AudioContext: AutoplayAudioContext as unknown as typeof AudioContext }
    installWorldPlaybackGuards(host)
    const context = new host.AudioContext() as unknown as AutoplayAudioContext
    const first = context.resume()
    expect(context.state).toBe('suspended')
    allowed = true
    const unlocked = context.resume()
    expect(context.resumeCalls).toBe(2)
    await Promise.all([first, unlocked])
    expect(context.state).toBe('running')
  })

  it('does not restore a closed context after an outstanding system suspension', async () => {
    const context = createAudioContextHost().create()
    setWorldPaused(true)
    const closed = context.close()
    setWorldPaused(false)
    await context.complete('suspend')
    await context.complete('close')
    await closed
    setWorldAudioMuted(true)
    setWorldAudioMuted(false)
    expect(context.calls).toEqual(['suspend', 'close'])
    expect(context.state).toBe('closed')
  })

  it('absorbs a rejected system suspension without retrying or resuming running audio', async () => {
    const context = createAudioContextHost().create()
    setWorldPaused(true)
    await context.fail('suspend')
    setWorldPaused(false)
    expect(context.calls).toEqual(['suspend'])
    expect(context.state).toBe('running')
  })

  it('propagates a rejected user resume without converting later unmute into a retry', async () => {
    const context = createAudioContextHost('suspended').create()
    const resumed = expect(context.resume()).rejects.toThrow('resume failed')
    await context.fail('resume')
    await resumed
    setWorldAudioMuted(true)
    setWorldAudioMuted(false)
    expect(context.calls).toEqual(['resume'])
    expect(context.state).toBe('suspended')
  })
})

describe('media playback ownership', () => {
  it('restores only media that the shell paused after every blocker clears', async () => {
    const host = createMediaHost()
    const playing = host.create()
    const idle = host.create()
    await playing.play()
    setWorldPaused(true)
    setWorldAudioMuted(true)
    setWorldPaused(false)
    expect(playing.playCalls).toBe(1)
    setWorldAudioMuted(false)
    expect(playing.playCalls).toBe(2)
    expect(playing.paused).toBe(false)
    expect(idle.playCalls).toBe(0)
  })

  it('does not restart media explicitly paused or disposed during a shell pause', async () => {
    const audio = createMediaHost().create()
    await audio.play()
    setWorldPaused(true)
    audio.pause()
    setWorldPaused(false)
    expect(audio.playCalls).toBe(1)
    expect(audio.paused).toBe(true)
  })

  it('defers a play request made while blocked and allows a later pause to cancel it', async () => {
    const host = createMediaHost()
    setWorldAudioMuted(true)
    const audio = host.create()
    await audio.play()
    expect(audio.playCalls).toBe(0)
    audio.pause()
    setWorldAudioMuted(false)
    expect(audio.playCalls).toBe(0)
    setWorldPaused(true)
    await audio.play()
    setWorldPaused(false)
    expect(audio.playCalls).toBe(1)
    expect(audio.paused).toBe(false)
  })
})
