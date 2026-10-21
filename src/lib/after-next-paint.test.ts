import { beforeEach, describe, expect, test, vi } from 'vitest'

import { afterNextPaint, type FrameScheduler } from './after-next-paint'

/** A fake frame clock: callbacks queue up and run only when `flush` is called. */
function createFrameClock() {
  let nextHandle = 100
  const queue = new Map<number, FrameRequestCallback>()
  const schedule: FrameScheduler = (callback) => {
    queue.set(nextHandle, callback)
    return nextHandle++
  }
  const cancel = vi.fn((handle: number) => {
    queue.delete(handle)
  })
  const flush = () => {
    const due = [...queue.entries()]
    queue.clear()
    for (const [, callback] of due) callback(0)
  }
  return { schedule, cancel, flush, pendingCount: () => queue.size }
}

describe('afterNextPaint', () => {
  let clock: ReturnType<typeof createFrameClock>
  beforeEach(() => {
    clock = createFrameClock()
  })

  test('runs the callback on the second frame, not the first', () => {
    const work = vi.fn()
    afterNextPaint(work, clock.schedule, clock.cancel)

    expect(clock.pendingCount()).toBe(1)
    clock.flush()
    expect(work).not.toHaveBeenCalled()
    expect(clock.pendingCount()).toBe(1)

    clock.flush()
    expect(work).toHaveBeenCalledTimes(1)
    expect(clock.pendingCount()).toBe(0)
  })

  test('cleanup before any frame cancels the first frame so nothing runs', () => {
    const work = vi.fn()
    const stop = afterNextPaint(work, clock.schedule, clock.cancel)

    stop()
    clock.flush()
    clock.flush()

    expect(clock.cancel).toHaveBeenCalledWith(100)
    expect(work).not.toHaveBeenCalled()
  })

  test('cleanup between the frames cancels the second frame', () => {
    const work = vi.fn()
    const stop = afterNextPaint(work, clock.schedule, clock.cancel)

    clock.flush()
    stop()
    clock.flush()

    expect(clock.cancel).toHaveBeenCalledWith(101)
    expect(work).not.toHaveBeenCalled()
  })
})
