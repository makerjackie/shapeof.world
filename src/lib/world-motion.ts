import { useSyncExternalStore } from 'react'

const eventName = 'shapeofworld:reduced-motion'

export function worldPrefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return document.documentElement.dataset.appReducedMotion === 'true'
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function observeWorldReducedMotion(onChange: () => void) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  media.addEventListener('change', onChange)
  window.addEventListener(eventName, onChange)
  return () => {
    media.removeEventListener('change', onChange)
    window.removeEventListener(eventName, onChange)
  }
}

export function setAppReducedMotion(value: boolean) {
  document.documentElement.dataset.appReducedMotion = String(value)
  window.dispatchEvent(new Event(eventName))
}

export function useWorldReducedMotion() {
  return useSyncExternalStore(observeWorldReducedMotion, worldPrefersReducedMotion, () => false)
}
