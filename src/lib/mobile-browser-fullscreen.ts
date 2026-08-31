const MOBILE_POINTER_QUERY = '(hover: none) and (pointer: coarse)'
const STANDALONE_DISPLAY_QUERY = '(display-mode: standalone)'

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean
}

function mediaMatches(query: string): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(query).matches
}

export function canRequestMobileBrowserFullscreen(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  if (!mediaMatches(MOBILE_POINTER_QUERY)) return false
  if (mediaMatches(STANDALONE_DISPLAY_QUERY)) return false
  if (typeof navigator !== 'undefined' && (navigator as NavigatorWithStandalone).standalone) return false
  if (document.fullscreenElement) return false
  if (document.fullscreenEnabled === false) return false
  return typeof document.documentElement.requestFullscreen === 'function'
}

export async function requestMobileBrowserFullscreen(): Promise<boolean> {
  if (!canRequestMobileBrowserFullscreen()) return false

  try {
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
    return true
  } catch {
    // Fullscreen is progressive enhancement. The shell's existing immersive
    // mode remains active when a browser or device rejects the request.
    return false
  }
}

export async function exitMobileBrowserFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') return false
  if (document.fullscreenElement !== document.documentElement) return false
  if (typeof document.exitFullscreen !== 'function') return false

  try {
    await document.exitFullscreen()
    return true
  } catch {
    return false
  }
}
