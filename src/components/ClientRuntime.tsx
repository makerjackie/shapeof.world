import { useEffect, useRef } from 'react'
import { SilentSiteUpdate } from './SilentSiteUpdate'
import { useLocation } from '@tanstack/react-router'
import { onCLS, onINP, onLCP, onTTFB, type Metric } from 'web-vitals'

import { trackEvent } from '~/lib/analytics'
import { getSiteBgmController } from '~/lib/site-bgm'
import { createVisibleDurationTracker } from '~/lib/visible-duration'
import { parseExploreWorldId, shouldPlayDefaultWorldMusic, soundtrackSrcForWorld } from '~/lib/world-music'
import { installWorldPlaybackGuards, setWorldPaused } from '~/lib/world-playback'

export function ClientRuntime() {
  const pathname = useLocation({ select: (location) => location.pathname })
  const lastTrackedNavigation = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (lastTrackedNavigation.current === pathname) return
    lastTrackedNavigation.current = pathname
    trackEvent({ event: 'page_view' })
  }, [pathname])

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
    const initialPath = window.location.pathname
    const report = (metric: Metric) => {
      const event = eventByMetric[metric.name as keyof typeof eventByMetric]
      if (!event || !Number.isFinite(metric.value) || metric.value < 0) return
      const path = metric.navigationURL ? new URL(metric.navigationURL, window.location.origin).pathname : initialPath
      trackEvent({ event, value: metric.value, metricId: metric.id }, path)
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
  }, [pathname])

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
      }, pathname),
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

  return <SilentSiteUpdate />
}
