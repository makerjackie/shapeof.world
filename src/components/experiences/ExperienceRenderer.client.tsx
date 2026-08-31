import '@tanstack/react-start/client-only'

import { Component, Suspense, type ReactNode } from 'react'

import { ExperienceOpeningPoster } from '~/components/experiences/ExperienceOpeningPoster'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { localizeIssue } from '~/data/issue-localization'
import type { DailyIssue } from '~/data/issues'
import type { WorldExperience } from '~/data/worlds/types'
import { useI18n } from '~/i18n/index'
import {trackEvent} from '~/lib/analytics'
import { getExperienceRenderer } from '~/worlds/experience-registry'
import './styles/OpenSourceAdapters.css'

class RendererErrorBoundary extends Component<{
  children: ReactNode
  title: string
  body: string
  retry: string
  poster: string
  fallback: WorldExperience['fallback']
  conclusion: string
  worldId: string
}, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error) {
    trackEvent({event: 'experience_error', worldId: this.props.worldId})
    console.error(JSON.stringify({ type: 'oneworld_renderer_error', message: error.message.slice(0, 240) }))
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className={`renderer-error is-${this.props.fallback}`} role="alert">
        {this.props.fallback === 'poster' && <img src={this.props.poster} alt="" />}
        <div>
          <h2>{this.props.title}</h2>
          <p>{this.props.body}</p>
          {this.props.fallback === 'text' && <blockquote>{this.props.conclusion}</blockquote>}
          <button type="button" onClick={() => window.location.reload()}>{this.props.retry}</button>
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
  const Renderer = getExperienceRenderer(world.renderer)
  const conclusion = issue ? localizeIssue(issue, locale).conclusion : worldText(world, 'payoff')

  if (!Renderer) {
    return (
      <div className={`renderer-error is-${world.fallback}`} role="status">
        {world.fallback === 'poster' && <img src={world.poster} alt="" />}
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
      title={t('experience.error.title')}
      body={t('experience.error.body')}
      retry={t('system.retry')}
      poster={world.poster}
      fallback={world.fallback}
      conclusion={conclusion}
      worldId={world.id}
    >
      <Suspense fallback={<ExperienceOpeningPoster world={world} />}>
        <Renderer controls={controls} issue={issue} />
      </Suspense>
    </RendererErrorBoundary>
  )
}
