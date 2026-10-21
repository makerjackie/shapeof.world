import { useEffect, useState } from 'react'

import { ExperienceFallback } from '~/components/experiences/ExperienceFallback'
import { ExperienceOpeningPoster } from '~/components/experiences/ExperienceOpeningPoster'
import type { WorldExperience } from '~/data/worlds/types'
import { trackEvent } from '~/lib/analytics'
import { releaseWorldWarmups } from '~/lib/world-prefetch'

export function ExperienceLoading({ world }: { world: WorldExperience }) {
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setTimedOut(true)
      releaseWorldWarmups(world.id)
      trackEvent({ event: 'experience_load_timeout', worldId: world.id })
    }, 12_000)
    return () => window.clearTimeout(timeout)
  }, [world.id])

  if (timedOut) return <ExperienceFallback world={world} reason="slow" />
  return <ExperienceOpeningPoster world={world} />
}
