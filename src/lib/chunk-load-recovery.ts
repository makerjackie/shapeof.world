export const chunkReloadKey = 'oneworld.chunk-reload.v1'

export function isChunkLoadError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const { name, message } = error as { name?: unknown; message?: unknown }
  return name === 'ChunkLoadError' || (typeof message === 'string' && (
    /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|loading (?:css )?chunk .+ failed|unable to preload css/i.test(message)
  ))
}

// Keep the marker across reloads. If storage is unavailable, leave recovery to
// the existing error UI rather than risk a reload loop.
export function reloadAfterChunkFailure(target: Pick<Window, 'sessionStorage' | 'location'>): boolean {
  try {
    if (target.sessionStorage.getItem(chunkReloadKey)) return false
    target.sessionStorage.setItem(chunkReloadKey, '1')
  } catch {
    return false
  }
  target.location.reload()
  return true
}

export function recoverFromChunkError(error: unknown): boolean {
  return typeof window !== 'undefined' && isChunkLoadError(error) && reloadAfterChunkFailure(window)
}

let installed = false

export function installChunkLoadRecovery() {
  if (typeof window === 'undefined' || installed) return
  installed = true
  window.addEventListener('vite:preloadError', (event) => {
    // Suppress Vite's throw only when a guarded reload is actually starting.
    if (reloadAfterChunkFailure(window)) event.preventDefault()
  })
  window.addEventListener('unhandledrejection', (event) => {
    if (recoverFromChunkError(event.reason)) event.preventDefault()
  })
}
