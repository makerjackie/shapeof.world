import { useEffect, useRef } from 'react'
import { useLocation } from '@tanstack/react-router'

// A newer deployed build is never announced. When the service worker finds one,
// the visitor keeps working undisturbed; the next in-app navigation becomes a
// full page load so they land on the new build. Stale lazy chunks are handled
// separately by `~/lib/chunk-load-recovery` (one guarded reload per session).
const ACTIVATION_WAIT_MS = 1500

export function SilentSiteUpdate() {
  const pathname = useLocation({ select: (location) => location.pathname })
  const pending = useRef(false)
  const registrationRef = useRef<ServiceWorkerRegistration | undefined>(undefined)
  const lastPathname = useRef(pathname)

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
    let disposed = false
    const cleanups: Array<() => void> = []
    const hadController = Boolean(navigator.serviceWorker.controller)
    void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(registration => {
      if (disposed) return
      registrationRef.current = registration
      const check = () => {
        if (disposed) return
        // A first installation can briefly wait before activating. It is an
        // update only when an older worker already controls this page.
        const controller = navigator.serviceWorker.controller
        const waiting = registration.waiting
        if (controller && waiting && waiting !== controller && waiting.state === 'installed') pending.current = true
      }
      const controllerChanged = () => { if (hadController) pending.current = true }
      navigator.serviceWorker.addEventListener('controllerchange', controllerChanged)
      cleanups.push(() => navigator.serviceWorker.removeEventListener('controllerchange', controllerChanged))
      const installing = () => {
        const worker = registration.installing
        if (!worker) return
        worker.addEventListener('statechange', check)
        cleanups.push(() => worker.removeEventListener('statechange', check))
      }
      check(); installing()
      registration.addEventListener('updatefound', installing)
      cleanups.push(() => registration.removeEventListener('updatefound', installing))
      void registration.update().catch(() => undefined)
    }).catch(() => undefined)
    return () => { disposed = true; cleanups.forEach(cleanup => cleanup()) }
  }, [])

  useEffect(() => {
    if (lastPathname.current === pathname) return
    lastPathname.current = pathname
    if (!pending.current) return
    pending.current = false
    const waiting = registrationRef.current?.waiting
    const reload = () => window.location.reload()
    if (!waiting) { reload(); return }
    // Let the new worker take control first so the reload is served by it.
    const timer = window.setTimeout(reload, ACTIVATION_WAIT_MS)
    navigator.serviceWorker.addEventListener('controllerchange', () => { window.clearTimeout(timer); reload() }, { once: true })
    waiting.postMessage({ type: 'SKIP_WAITING' })
  }, [pathname])

  return null
}
