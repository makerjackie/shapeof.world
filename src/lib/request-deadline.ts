/** Own the timer and parent listener so completed requests leave no background work. */
export function requestDeadline(milliseconds: number, parent?: AbortSignal) {
  const controller = new AbortController()
  const abort = () => controller.abort(parent?.reason)
  if (parent?.aborted) abort()
  else parent?.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), milliseconds)
  return {
    signal: controller.signal,
    dispose() { clearTimeout(timer); parent?.removeEventListener('abort', abort) },
  }
}
