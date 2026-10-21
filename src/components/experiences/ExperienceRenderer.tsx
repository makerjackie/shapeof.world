import { lazy, Suspense, useEffect, useState } from 'react'
import { createClientOnlyFn } from '@tanstack/react-start'

import { ClientOnly } from '~/components/ClientOnly'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { ExperienceFallback } from '~/components/experiences/ExperienceFallback'
import { ExperienceLoading } from '~/components/experiences/ExperienceLoading'
import { ExperienceOpeningPoster } from '~/components/experiences/ExperienceOpeningPoster'
import type { DailyIssue } from '~/data/issues'
import type { WorldExperience } from '~/data/worlds/types'
import { trackEvent } from '~/lib/analytics'
import { afterNextPaint } from '~/lib/after-next-paint'
import { detectWebglSupport, runtimeNeedsWebgl } from '~/lib/webgl'
import { holdWorldWarmups, releaseWorldWarmups } from '~/lib/world-prefetch'

const loadClientExperienceRenderer = createClientOnlyFn(() =>
  import('~/components/experiences/ExperienceRenderer.client').then((module) => ({
    default: module.ClientExperienceRenderer,
  })),
)
const ClientExperienceRenderer = lazy(loadClientExperienceRenderer)

/**
 * Keep browser-only experience engines out of the Cloudflare SSR worker.
 *
 * The `.client` module is mocked out of the server dependency graph by
 * TanStack Start. After hydration, the browser loads only the selected
 * renderer and its colocated CSS through the nested lazy boundary.
 */
export function ExperienceRenderer({
  world,
  issue,
  controls,
}: {
  world: WorldExperience
  issue?: DailyIssue
  controls: ExperienceControls
}) {
  const [rendererReady, setRendererReady] = useState(false)
  // Runs before the shell's own effects, so warming the next world waits for
  // this renderer's first paint instead of sharing its download.
  useEffect(() => {
    holdWorldWarmups(world.id)
    return () => releaseWorldWarmups(world.id)
  }, [world.id])
  useEffect(() => {
    void loadClientExperienceRenderer()
    afterNextPaint(() => setRendererReady(true))
  }, [])

  // SSR 与首次渲染必须和服务端一致，所以能力探测放在 mount 之后。
  const [webglBlocked, setWebglBlocked] = useState(false)
  useEffect(() => {
    if (!runtimeNeedsWebgl(world.runtime)) return
    if (detectWebglSupport() !== 'unavailable') return
    setWebglBlocked(true)
    releaseWorldWarmups(world.id)
    trackEvent({ event: 'experience_error', worldId: world.id, value: 'webgl-unavailable' })
  }, [world.id, world.runtime])

  if (webglBlocked) return <ExperienceFallback world={world} reason="webgl" />

  if (!rendererReady) return <ExperienceOpeningPoster world={world} />

  return (
    <ClientOnly fallback={<ExperienceOpeningPoster world={world} />}>
      <Suspense fallback={<ExperienceLoading key={world.id} world={world} />}>
        <ClientExperienceRenderer world={world} issue={issue} controls={controls} />
      </Suspense>
    </ClientOnly>
  )
}
