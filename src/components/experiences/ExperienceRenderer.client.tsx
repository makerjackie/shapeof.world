import '@tanstack/react-start/client-only'

import { Suspense, useEffect, useRef } from 'react'

import { ExperienceLoading } from '~/components/experiences/ExperienceLoading'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { localizeIssue } from '~/data/issue-localization'
import type { DailyIssue } from '~/data/issues'
import type { WorldExperience } from '~/data/worlds/types'
import { useI18n } from '~/i18n/index'
import {trackEvent} from '~/lib/analytics'
import { RendererErrorBoundary } from './RendererErrorBoundary'
import { WorldLoadProgressProvider } from './WorldLoadProgress'
import { releaseWorldWarmups } from '~/lib/world-prefetch'
import { getExperienceRenderer } from '~/worlds/experience-registry'
import './styles/OpenSourceAdapters.css'

export function ClientExperienceRenderer({
  world,
  issue,
  controls,
}: {
  world: WorldExperience
  issue?: DailyIssue
  controls: ExperienceControls
}) {
  const { locale, t, worldText } = useI18n()
  const rendererStart = useRef({ worldId: world.id, at: performance.now() })
  if (rendererStart.current.worldId !== world.id) rendererStart.current = { worldId: world.id, at: performance.now() }
  const Renderer = getExperienceRenderer(world.renderer)
  const conclusion = issue ? localizeIssue(issue, locale).conclusion : worldText(world, 'payoff')

  if (!Renderer) {
    return (
      <div className={`renderer-error is-${world.fallback}`} role="status">
        {world.fallback === 'poster' && world.poster && <img src={world.poster} alt="" />}
        <div>
          <h2>{t('experience.archived.title')}</h2>
          <p>{t('experience.archived.body')}</p>
          {world.fallback === 'text' && <blockquote>{conclusion}</blockquote>}
        </div>
      </div>
    )
  }

  return (
    <RendererErrorBoundary key={world.id} world={world}>
      <WorldLoadProgressProvider>
        <Suspense fallback={<ExperienceLoading key={world.id} world={world} />}>
          <Renderer controls={controls} issue={issue} />
          <RendererReady worldId={world.id} started={rendererStart.current.at} />
        </Suspense>
      </WorldLoadProgressProvider>
    </RendererErrorBoundary>
  )
}

// Suspense commits this alongside the resolved renderer. This measures the renderer
// reaching a paint opportunity, not completion of its own remote assets or onboarding.
function RendererReady({ worldId, started }: { worldId: string; started: number }) {
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      trackEvent({ event: 'experience_renderer_ready', worldId, value: Math.round(performance.now() - started) })
      releaseWorldWarmups(worldId)
    })
    return () => cancelAnimationFrame(frame)
  }, [worldId, started])
  return null
}
