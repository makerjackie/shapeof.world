import { Link } from '@tanstack/react-router'
import { ArrowRight } from '@phosphor-icons/react'
import { paths } from '~/data/content-graph'
import { sortPathsByRecentUpdate } from '~/data/path-freshness'
import type { WorldSummary } from '~/data/world-summaries'
import { useI18n } from '~/i18n'
import { PathShowcase } from './PathShowcase'

export function HomeSeries({ worldById }: { worldById: ReadonlyMap<string, WorldSummary> }) {
  const { t } = useI18n()
  const available = paths.filter((path) => path.publication === 'public' && path.worldIds.length > 0 && path.worldIds.every((id) => worldById.has(id)))
  if (!available.length) return null
  const shown = sortPathsByRecentUpdate(available)
  return (
    <section className="home-section home-series-section" id="home-series" aria-labelledby="home-series-title">
      <header className="home-section-head">
        <div><h2 id="home-series-title">{t('home.paths.title')}</h2></div>
        <Link to="/routes" className="home-section-more">{t('home.paths.viewAll', { value: available.length })}<ArrowRight aria-hidden="true" /></Link>
      </header>
      <PathShowcase paths={shown} worldById={worldById} compact />
    </section>
  )
}
