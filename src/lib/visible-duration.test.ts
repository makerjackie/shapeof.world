import { describe, expect, it, vi } from 'vitest'

import { createVisibleDurationTracker } from './visible-duration'

describe('visible duration tracker', () => {
  it('emits only foreground-visible segments', () => {
    let now = 0
    const emit = vi.fn()
    const tracker = createVisibleDurationTracker({ now: () => now, initialVisible: true, emit })

    now = 12_500
    tracker.hide()
    now = 72_500
    tracker.show()
    now = 80_750
    tracker.finish()

    expect(emit.mock.calls).toEqual([[12.5], [8.25]])
  })

  it('does not duplicate a segment when pagehide is followed by cleanup', () => {
    let now = 0
    const emit = vi.fn()
    const tracker = createVisibleDurationTracker({ now: () => now, initialVisible: true, emit })

    now = 4_000
    tracker.hide()
    now = 4_100
    tracker.finish()
    tracker.finish()

    expect(emit).toHaveBeenCalledOnce()
    expect(emit).toHaveBeenCalledWith(4)
  })

  it('drops accidental flashes and caps abandoned foreground tabs', () => {
    let now = 0
    const emit = vi.fn()
    const tracker = createVisibleDurationTracker({ now: () => now, initialVisible: true, emit })

    now = 100
    tracker.hide()
    tracker.show()
    now = 3_000_100
    tracker.finish()

    expect(emit.mock.calls).toEqual([[1_800]])
  })
})
