import { useEffect, useRef } from 'react'
import { useLocation } from '@tanstack/react-router'
import { onCLS, onINP, onLCP, onTTFB, type Metric } from 'web-vitals'

import { trackEvent } from '~/lib/analytics'
import { getSiteBgmController } from '~/lib/site-bgm'
import { createVisibleDurationTracker } from '~/lib/visible-duration'
import { parseExploreWorldId, shouldPlayDefaultWorldMusic, soundtrackSrcForWorld } from '~/lib/world-music'
import { installWorldPlaybackGuards, setWorldPaused } from '~/lib/world-playback'

export function ClientRuntime() {
  const navigationKey = useLocation({ select: (location) => location.href })
  const pathname = useLocation({ select: (location) => location.pathname })
  const lastTrackedNavigation = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (lastTrackedNavigation.current === navigationKey) return
    lastTrackedNavigation.current = navigationKey
    trackEvent({ event: 'page_view' })
  }, [navigationKey])

  useEffect(() => {
    const restore = installWorldPlaybackGuards(window)
    const syncVisibility = () => setWorldPaused(document.hidden)
    syncVisibility()
    document.addEventListener('visibilitychange', syncVisibility)
    return () => {
      document.removeEventListener('visibilitychange', syncVisibility)
      setWorldPaused(false)
      restore()
    }
  }, [])

  useEffect(() => {
    const eventByMetric = {
      CLS: 'web_vital_cls',
      INP: 'web_vital_inp',
      LCP: 'web_vital_lcp',
      TTFB: 'web_vital_ttfb',
    } as const
    const report = (metric: Metric) => {
      const event = eventByMetric[metric.name as keyof typeof eventByMetric]
      if (!event || !Number.isFinite(metric.value) || metric.value < 0) return
      trackEvent({ event, value: metric.value })
    }

    onCLS(report)
    onINP(report)
    onLCP(report)
    onTTFB(report)
  }, [])

  // Default world music plays only inside worlds that do not own a soundtrack.
  useEffect(() => {
    const controller = getSiteBgmController()
    if (shouldPlayDefaultWorldMusic(pathname)) {
      controller.requestPlay(soundtrackSrcForWorld(parseExploreWorldId(pathname)))
    } else {
      controller.yieldPlayback()
    }
  }, [pathname])

  useEffect(() => {
    let visibleSeconds = 0
    const emitted = new Set<number>()
    const thresholds = [5, 15, 30]
    const worldId = parseExploreWorldId(pathname)
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      visibleSeconds += 1
      for (const threshold of thresholds) {
        if (visibleSeconds < threshold || emitted.has(threshold)) continue
        emitted.add(threshold)
        trackEvent({
          event: 'page_engaged',
          worldId,
          value: `${threshold}s`,
        })
      }
    }, 1_000)

    return () => window.clearInterval(timer)
  }, [navigationKey, pathname])

  useEffect(() => {
    const worldId = parseExploreWorldId(pathname)
    if (!worldId) return

    const tracker = createVisibleDurationTracker({
      now: () => performance.now(),
      initialVisible: document.visibilityState === 'visible',
      emit: (visibleSeconds) => trackEvent({
        event: 'experience_duration',
        worldId,
        value: visibleSeconds,
      }),
    })
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') tracker.show()
      else tracker.hide()
    }
    const handlePageHide = () => tracker.hide()
    const handlePageShow = () => {
      if (document.visibilityState === 'visible') tracker.show()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('pageshow', handlePageShow)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('pageshow', handlePageShow)
      tracker.finish()
    }
  }, [pathname])

  useEffect(() => {
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      let refreshing = false
      const hadController = Boolean(navigator.serviceWorker.controller)
      const refreshOnControllerChange = () => {
        // A first install also claims the page, but it has no stale app shell.
        // Reload only when this page actually started under an older worker.
        if (!hadController || refreshing) return
        refreshing = true
        window.location.reload()
      }

      navigator.serviceWorker.addEventListener('controllerchange', refreshOnControllerChange)
      void navigator.serviceWorker.register('/sw.js', {updateViaCache: 'none'}).then((registration) => {
        void registration.update()
        registration.waiting?.postMessage({type: 'SKIP_WAITING'})
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              worker.postMessage({type: 'SKIP_WAITING'})
            }
          })
        })
      })

      return () => navigator.serviceWorker.removeEventListener('controllerchange', refreshOnControllerChange)
    }
  }, [])

  return null
}
