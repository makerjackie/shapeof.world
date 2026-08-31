import { useCallback, useLayoutEffect, useRef, useState, type RefCallback } from 'react'

type ScrollRevealOptions = {
  /**
   * Change this when the caller filters or re-sorts the collection.
   * The current collection becomes visible immediately so an interaction never
   * replays the entrance wave. Items appended without changing the key still
   * receive the one-shot scroll reveal.
   */
  contentKey?: string
}

type RevealController = {
  refresh: (revealCurrent: boolean) => void
  dispose: () => void
}

const REVEAL_ROOT_CLASS = 'reveal-ready'
const REVEALED_CLASS = 'is-in'
const REVEAL_MARGIN = '0px 0px -8% 0px'
const REVEAL_THRESHOLD = 0.05
const INITIAL_CONTENT_KEY = Symbol('initial-scroll-reveal-content')

function createRevealController(root: HTMLElement, selector: string): RevealController {
  const observed = new Set<Element>()
  let intersectionObserver: IntersectionObserver | null = null
  let disposed = false

  const reveal = (element: Element) => {
    element.classList.add(REVEALED_CLASS)
    if (intersectionObserver && observed.delete(element)) {
      intersectionObserver.unobserve(element)
    }
  }

  const ensureIntersectionObserver = () => {
    if (
      intersectionObserver
      || typeof IntersectionObserver === 'undefined'
    ) {
      return intersectionObserver
    }

    intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) reveal(entry.target)
        }
      },
      { rootMargin: REVEAL_MARGIN, threshold: REVEAL_THRESHOLD },
    )
    return intersectionObserver
  }

  const refresh = (revealCurrent: boolean) => {
    if (disposed) return

    const items = Array.from(root.querySelectorAll(selector))
    for (const element of observed) {
      if (!root.contains(element) || !element.matches(selector)) {
        intersectionObserver?.unobserve(element)
        observed.delete(element)
      }
    }

    const observer = ensureIntersectionObserver()
    const showImmediately = revealCurrent || !observer
    for (const element of items) {
      if (element.classList.contains(REVEALED_CLASS)) continue
      if (showImmediately) {
        reveal(element)
      } else if (!observed.has(element)) {
        observed.add(element)
        observer.observe(element)
      }
    }
  }

  root.classList.add(REVEAL_ROOT_CLASS)

  const mutationObserver = typeof MutationObserver === 'undefined'
    ? null
    : new MutationObserver(() => refresh(false))
  mutationObserver?.observe(root, { childList: true, subtree: true })

  return {
    refresh,
    dispose: () => {
      disposed = true
      intersectionObserver?.disconnect()
      mutationObserver?.disconnect()
      observed.clear()
      root.classList.remove(REVEAL_ROOT_CLASS)
    },
  }
}

/**
 * One-shot scroll reveal for a collection under one root.
 *
 * The interface deliberately exposes only the item selector and the optional
 * collection identity. Observer lifecycles, DOM mutations, browser fallbacks,
 * and the reveal classes stay inside the module.
 */
export function useScrollReveal<T extends HTMLElement>(
  selector: string,
  { contentKey }: ScrollRevealOptions = {},
): RefCallback<T> {
  const [root, setRoot] = useState<T | null>(null)
  const controllerRef = useRef<RevealController | null>(null)
  const previousContentKeyRef = useRef<string | symbol | undefined>(INITIAL_CONTENT_KEY)
  const attach = useCallback((node: T | null) => setRoot(node), [])

  useLayoutEffect(() => {
    if (!root) return
    const controller = createRevealController(root, selector)
    controllerRef.current = controller
    return () => {
      controller.dispose()
      if (controllerRef.current === controller) controllerRef.current = null
    }
  }, [root, selector])

  // Run after every committed render. MutationObserver covers imperative DOM
  // changes; this refresh is also the fallback in browsers without it.
  useLayoutEffect(() => {
    const controller = controllerRef.current
    if (!controller) return
    const previousKey = previousContentKeyRef.current
    const contentChanged = previousKey !== INITIAL_CONTENT_KEY
      && previousKey !== contentKey
    controller.refresh(contentChanged)
    previousContentKeyRef.current = contentKey
  })

  return attach
}
