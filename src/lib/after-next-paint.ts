export type FrameScheduler = (callback: FrameRequestCallback) => number
export type FrameCanceller = (handle: number) => void

/**
 * Defers `callback` until the browser has painted at least once after this
 * call. A single requestAnimationFrame fires before the paint of the current
 * frame, so the work is chained through two frames; heavy startup code then
 * runs after the server-rendered poster is already on screen.
 *
 * Returns a cleanup that cancels whichever frames are still pending.
 */
export function afterNextPaint(
  callback: () => void,
  schedule: FrameScheduler = window.requestAnimationFrame.bind(window),
  cancel: FrameCanceller = window.cancelAnimationFrame.bind(window),
): () => void {
  const pending: Array<number> = []
  const waitFrames = (remaining: number) => {
    pending.push(schedule(() => (remaining > 1 ? waitFrames(remaining - 1) : callback())))
  }
  waitFrames(2)
  return () => {
    for (const handle of pending) cancel(handle)
  }
}
