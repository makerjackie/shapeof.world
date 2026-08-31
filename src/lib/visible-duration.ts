type VisibleDurationTrackerOptions = {
  now: () => number
  initialVisible: boolean
  emit: (visibleSeconds: number) => void
  minimumSegmentMs?: number
  maximumSegmentSeconds?: number
}

export type VisibleDurationTracker = {
  show: () => void
  hide: () => void
  finish: () => void
}

export function createVisibleDurationTracker({
  now,
  initialVisible,
  emit,
  minimumSegmentMs = 250,
  maximumSegmentSeconds = 1_800,
}: VisibleDurationTrackerOptions): VisibleDurationTracker {
  let visibleSince = initialVisible ? now() : null
  let finished = false

  const flush = () => {
    if (visibleSince === null) return
    const elapsedMs = Math.max(0, now() - visibleSince)
    visibleSince = null
    if (elapsedMs < minimumSegmentMs) return
    emit(Math.min(maximumSegmentSeconds, Number((elapsedMs / 1_000).toFixed(3))))
  }

  return {
    show() {
      if (!finished && visibleSince === null) visibleSince = now()
    },
    hide() {
      if (!finished) flush()
    },
    finish() {
      if (finished) return
      flush()
      finished = true
    },
  }
}
