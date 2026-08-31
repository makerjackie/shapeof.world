import { createContext, useContext, useEffect, useMemo, useRef } from 'react'

import {
  decodeShareState,
  encodeShareState,
  SHARE_STATE_PARAM,
  type ShareState,
} from '~/lib/share-state'

export type PublishedShareState = {
  /** Packed state for the URL; empty when the world publishes nothing. */
  packed: string
  /**
   * One line describing what the sharer set up, in their language. This is the
   * difference between "look at this simulator" and "someone pushed the Moon to
   * 52% of its distance — look what happened to the ocean".
   */
  summary?: string
}

/**
 * Draw the current frame and return it as a data URL.
 *
 * WebGL worlds need this. Their contexts are created without
 * `preserveDrawingBuffer`, so the buffer is empty by the time anything outside
 * the render loop looks at it, and the share card silently falls back to the
 * poster — the same picture for every user, in worlds where the picture *is*
 * what the user made. Turning the flag on instead costs frame rate for
 * everybody, all the time, to serve an occasional screenshot.
 *
 * So the world redraws once, on demand, and reads the canvas back in the same
 * task before the browser can clear it.
 */
export type ShareCapture = () => string | null

type ShareStateStore = {
  current: PublishedShareState
  capture: ShareCapture | null
}

/**
 * The shell reads whatever the mounted world last published. A ref rather than
 * state on purpose: worlds update this on every slider move, and re-rendering
 * the whole shell sixty times a second to keep a share button current would be
 * an absurd trade.
 */
export const ShareStateContext = createContext<ShareStateStore | null>(null)

export function createShareStateStore(): ShareStateStore {
  return { current: { packed: '' }, capture: null }
}

/** Read the state a shared link arrived with, before the world renders. */
function readIncomingState(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const packed = new URL(window.location.href).searchParams.get(SHARE_STATE_PARAM)
    return decodeShareState(packed)
  } catch {
    return {}
  }
}

export type ShareableStateInput = {
  /** Current state, small and flat. Restored by `useIncomingShareState`. */
  state: ShareState
  summary?: string
}

/**
 * Read the state a shared link arrived with.
 *
 * Call this *before* the `useState` initialisers that consume it, so a world
 * opens directly in the shared configuration rather than flashing its defaults
 * and then jumping:
 *
 * ```ts
 * const incoming = useIncomingShareState()
 * const [wind, setWind] = useState(() => readNumber(incoming, 'wind', 0.09))
 * ```
 *
 * The result is frozen at mount: a link describes the moment it was made, and
 * re-reading it later would fight the user as they explore away from it.
 *
 * Values here come from a stranger's URL. Always read them through
 * `readOption` / `readNumber` with an explicit allow-list or range rather than
 * trusting them directly.
 */
export function useIncomingShareState(): Record<string, string> {
  return useMemo(readIncomingState, [])
}

/**
 * Publish the world's current state so the shell can build a share link that
 * restores it. Worlds call this on every render with their live values.
 */
export function useShareableState({ state, summary }: ShareableStateInput): string {
  const store = useContext(ShareStateContext)
  const packed = encodeShareState(state)

  const latest = useRef<PublishedShareState>({ packed, summary })
  latest.current = { packed, summary }
  if (store) store.current = latest.current

  return packed
}

/**
 * Register a same-task redraw-and-read for worlds whose canvas cannot be read
 * between frames. Pass a stable callback; it is stored, not called, until a
 * share card is opened.
 */
export function useShareCapture(capture: ShareCapture | null) {
  const store = useContext(ShareStateContext)
  useEffect(() => {
    if (!store) return
    store.capture = capture
    return () => {
      if (store.capture === capture) store.capture = null
    }
  }, [store, capture])
}

/** True when this page was opened from someone else's shared moment. */
export function useArrivedFromShare(): boolean {
  return useMemo(() => Object.keys(readIncomingState()).length > 0, [])
}
