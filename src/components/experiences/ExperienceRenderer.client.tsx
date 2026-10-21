import { Link } from '@tanstack/react-router'
import '@tanstack/react-start/client-only'

import { Component, Suspense, useEffect, useRef, type ReactNode } from 'react'

import { ExperienceLoading } from '~/components/experiences/ExperienceLoading'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { localizeIssue } from '~/data/issue-localization'
import type { DailyIssue } from '~/data/issues'
import type { WorldExperience } from '~/data/worlds/types'
import { useI18n } from '~/i18n/index'
import {trackEvent} from '~/lib/analytics'
import { recoverFromChunkError } from '~/lib/chunk-load-recovery'
import { releaseWorldWarmups } from '~/lib/world-prefetch'
import { getExperienceRenderer } from '~/worlds/experience-registry'
import './styles/OpenSourceAdapters.css'

class RendererErrorBoundary extends Component<{
  children: ReactNode
  title: string
  body: string
  report: string
  retry: string
  poster?: string
  fallback: WorldExperience['fallback']
  conclusion: string
  worldId: string
}, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error) {
    recoverFromChunkError(error)
    releaseWorldWarmups(this.props.worldId)
    trackEvent({event: 'experience_error', worldId: this.props.worldId, value: /chunk|dynamic.*import|module.*fetch/i.test(error.message) ? 'chunk_load' : /webgl|context.*lost/i.test(error.message) ? 'webgl' : 'render'})
    console.error(JSON.stringify({ type: 'oneworld_renderer_error', message: error.message.slice(0, 240) }))
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className={`renderer-error is-${this.props.fallback}`} role="alert">
        {this.props.fallback === 'poster' && this.props.poster && <img src={this.props.poster} alt="" />}
        <div>
          <h2>{this.props.title}</h2>
          <p>{this.props.body}</p>
          {this.props.fallback === 'text' && <blockquote>{this.props.conclusion}</blockquote>}
          <button type="button" onClick={() => window.location.reload()}>{this.props.retry}</button>
          <Link to="/feedback" search={{ world: this.props.worldId, kind: 'problem' }}>{this.props.report}</Link>
        </div>
      </div>
    )
  }
}

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
    <RendererErrorBoundary
      key={world.id}
      title={t('experience.error.title')}
      body={t('experience.error.body')}
      retry={t('system.retry')}
      report={t('feedback.report')}
      poster={world.poster}
      fallback={world.fallback}
      conclusion={conclusion}
      worldId={world.id}
    >
      <Suspense fallback={<ExperienceLoading key={world.id} world={world} />}>
        <Renderer controls={controls} issue={issue} />
        <RendererReady worldId={world.id} started={rendererStart.current.at} />
      </Suspense>
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
