import { lazy, Suspense, useEffect, useState } from 'react'
import { createClientOnlyFn } from '@tanstack/react-start'

import { ClientOnly } from '~/components/ClientOnly'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { ExperienceFallback } from '~/components/experiences/ExperienceFallback'
import { ExperienceOpeningPoster } from '~/components/experiences/ExperienceOpeningPoster'
import type { DailyIssue } from '~/data/issues'
import type { WorldExperience } from '~/data/worlds/types'
import { trackEvent } from '~/lib/analytics'
import { afterNextPaint } from '~/lib/after-next-paint'
import { detectWebglSupport, runtimeNeedsWebgl } from '~/lib/webgl'

const loadClientExperienceRenderer = createClientOnlyFn(() =>
  import('~/components/experiences/ExperienceRenderer.client').then((module) => ({
    default: module.ClientExperienceRenderer,
  })),
)
const ClientExperienceRenderer = lazy(loadClientExperienceRenderer)

/** 超过这个时间还没换掉加载态，就认为用户已经卡住了，给出口。 */
const LOAD_TIMEOUT_MS = 12_000

function ExperienceLoading({ world }: { world: WorldExperience }) {
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setTimedOut(true)
      trackEvent({ event: 'experience_load_timeout', worldId: world.id })
    }, LOAD_TIMEOUT_MS)
    return () => window.clearTimeout(timeout)
  }, [world.id])

  if (timedOut) return <ExperienceFallback world={world} reason="slow" />
  return <ExperienceOpeningPoster world={world} />
}

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
  useEffect(() => afterNextPaint(() => setRendererReady(true)), [])

  // SSR 与首次渲染必须和服务端一致，所以能力探测放在 mount 之后。
  const [webglBlocked, setWebglBlocked] = useState(false)
  useEffect(() => {
    if (!runtimeNeedsWebgl(world.runtime)) return
    if (detectWebglSupport() !== 'unavailable') return
    setWebglBlocked(true)
    trackEvent({ event: 'experience_error', worldId: world.id, value: 'webgl-unavailable' })
  }, [world.id, world.runtime])

  if (webglBlocked) return <ExperienceFallback world={world} reason="webgl" />

  if (!rendererReady) return <ExperienceOpeningPoster world={world} />

  return (
    <ClientOnly fallback={<ExperienceOpeningPoster world={world} />}>
      <Suspense fallback={<ExperienceLoading world={world} />}>
        <ClientExperienceRenderer world={world} issue={issue} controls={controls} />
      </Suspense>
    </ClientOnly>
  )
}
