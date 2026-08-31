export type FrameScheduler = (callback: FrameRequestCallback) => number
export type FrameCanceller = (handle: number) => void

/**
 * Run expensive client startup only after the browser has had a chance to
 * paint the server-rendered opening poster. Two animation frames are used:
 * the first commits the current frame and the second starts new work.
 */
export function afterNextPaint(
  callback: () => void,
  schedule: FrameScheduler = window.requestAnimationFrame.bind(window),
  cancel: FrameCanceller = window.cancelAnimationFrame.bind(window),
) {
  let secondFrame = 0
  const firstFrame = schedule(() => {
    secondFrame = schedule(callback)
  })

  return () => {
    cancel(firstFrame)
    if (secondFrame) cancel(secondFrame)
  }
}
