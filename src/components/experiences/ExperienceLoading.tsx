import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

import { ExperienceFallback } from '~/components/experiences/ExperienceFallback'
import { ExperienceOpeningPoster } from '~/components/experiences/ExperienceOpeningPoster'
import type { WorldExperience } from '~/data/worlds/types'
import { trackEvent } from '~/lib/analytics'
import { releaseWorldWarmups } from '~/lib/world-prefetch'
import { getWorldDownload } from '~/lib/world-download'
import { isWorldLoadStalled } from '~/lib/world-load-progress'
import { useProgressVisible } from './WorldLoadProgress'

const emptyProgress = { loaded: 0 }

export function ExperienceLoading({ world }: { world: WorldExperience }) {
  const [stalled, setStalled] = useState(false)
  const download = getWorldDownload(world.renderer)
  const started = useRef(performance.now())
  const progress = useSyncExternalStore(download.subscribe, download.getSnapshot, () => emptyProgress)
  const visible = useProgressVisible()

  useEffect(() => {
    const timer = window.setInterval(() => {
      download.refresh()
      // Missing metadata cannot prove that an in-flight import has stopped.
      // Keep the honest indeterminate state unless the browser is offline.
      setStalled((download.meter.observable || navigator.onLine === false) &&
        isWorldLoadStalled(Math.max(started.current, download.meter.lastActivity), performance.now()))
    }, 250)
    return () => window.clearInterval(timer)
  }, [download])

  useEffect(() => {
    if (!stalled) return
    releaseWorldWarmups(world.id)
    trackEvent({ event: 'experience_load_timeout', worldId: world.id, value: 'stalled' })
  }, [stalled, world.id])

  if (stalled) return <ExperienceFallback world={world} reason="stalled" />
  return <ExperienceOpeningPoster world={world} progress={visible ? progress : undefined} />
}
