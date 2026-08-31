import { useState, type CSSProperties } from 'react'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { ArrowRight, MagnifyingGlass } from '@phosphor-icons/react'

import { SiteFooter } from '~/components/SiteFooter'
import { SiteHeader } from '~/components/SiteHeader'
import { useI18n } from '~/i18n'
import '~/styles/sources.css'
import { getLocalizedSeo, localeFromRouteMatches, useLocalizedRouteSeo } from '~/i18n/seo'
import { seo } from '~/utils/seo'

const getSourcesArtifact = createServerFn({ method: 'GET' }).handler(async () => {
  const { loadWorldSources } = await import('~/data/world-artifacts.server')
  return loadWorldSources()
})

export const Route = createFileRoute('/sources')({
  loader: async () => {
    const artifact = await getSourcesArtifact()
    if (!artifact) throw notFound()
    return artifact
  },
  head: ({ matches }) => {
    const copy = getLocalizedSeo('sources', localeFromRouteMatches(matches))
    return ({
      meta: seo({
      ...copy,
      image: 'https://shapeof.world/assets/oneworld-og.jpg',
      url: 'https://shapeof.world/sources',
    }),
    links: [{ rel: 'canonical', href: 'https://shapeof.world/sources' }],
    })
  },
  component: SourcesPage,
})

function SourcesPage() {
  const artifact = Route.useLoaderData()
  const { locale, t, sourceText } = useI18n()
  useLocalizedRouteSeo('sources')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [evidence, setEvidence] = useState('all')
  const sources = artifact.worlds.flatMap((world) =>
    world.sources.map((source) => ({
      ...source,
      label: sourceText(source),
      world: locale === 'zh' ? world.title : world.titleEn,
      category: locale === 'zh' ? world.topicLabel : world.topicLabelEn,
      evidence: world.evidence,
      evidenceLabel: t(`evidence.${world.evidence}`),
      accent: world.accent,
    })),
  )
  const categories = Array.from(new Set(sources.map((source) => source.category))).sort()
  const normalizedQuery = query.trim().toLocaleLowerCase(locale === 'zh' ? 'zh-CN' : 'en')
  const filteredSources = sources.filter((source) => {
    const matchesQuery = !normalizedQuery || `${source.world} ${source.label}`.toLocaleLowerCase(locale === 'zh' ? 'zh-CN' : 'en').includes(normalizedQuery)
    const matchesCategory = category === 'all' || source.category === category
    const matchesEvidence = evidence === 'all' || source.evidence === evidence
    return matchesQuery && matchesCategory && matchesEvidence
  })
  const evidenceCounts = (['live', 'verified', 'compiled', 'modeled'] as const).map((level) => ({
    level,
    count: artifact.worldCounts[level],
  }))

  return (
    <main className="editorial-page sources-page">
      <SiteHeader />
      <header className="page-hero page-hero--narrow">
        <p className="eyebrow">{t('sources.eyebrow')}</p>
        <h1>{t('sources.title')}</h1>
        <p>{t('sources.body')}</p>
      </header>

      <section className="evidence-section sources-ledger-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t('sources.ledger')}</p>
            <h2>{t('sources.evidence')}</h2>
          </div>
          <Link to="/changelog" className="sources-ledger-link">
            {t('nav.changelog')} <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <div className="evidence-tools" aria-label={t('sources.filters')}>
          <label>
            <MagnifyingGlass aria-hidden="true" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('sources.search')} aria-label={t('sources.search')} />
          </label>
          <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label={t('sources.category')}>
            <option value="all">{t('sources.category.all')}</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={evidence} onChange={(event) => setEvidence(event.target.value)} aria-label={t('sources.evidenceLevel')}>
            <option value="all">{t('sources.evidenceLevel.all')}</option>
            <option value="live">{t('evidence.live')}</option>
            <option value="verified">{t('evidence.verified')}</option>
            <option value="compiled">{t('evidence.compiled')}</option>
            <option value="modeled">{t('evidence.modeled')}</option>
          </select>
          <span aria-live="polite">{t('sources.results', { value: filteredSources.length })}</span>
        </div>
        <div className="evidence-stats" aria-label={t('sources.evidenceLevel')}>
          {evidenceCounts.map(({ level, count }) => (
            <button
              key={level}
              type="button"
              className={`evidence-stat is-${level}${evidence === level ? ' is-active' : ''}`}
              onClick={() => setEvidence((current) => (current === level ? 'all' : level))}
            >
              <i aria-hidden="true" />
              <b>{count}</b> {t(`evidence.${level}`)}
            </button>
          ))}
        </div>
        <div className="source-ledger">
          {filteredSources.map((source, index) => (
            <a
              key={`${source.world}-${source.url}`}
              className="source-card"
              style={{ '--world-accent': source.accent, '--reveal-delay': `${(index % 12) * 30}ms` } as CSSProperties}
              href={source.url}
              target="_blank"
              rel="noreferrer"
            >
              <span className="source-card-top">
                <i className={`evidence-dot is-${source.evidence}`} aria-hidden="true" />
                {source.evidenceLabel}
              </span>
              <strong>{source.label}</strong>
              <span className="source-card-world">{source.world} ↗</span>
            </a>
          ))}
        </div>
        {filteredSources.length === 0 && <p className="evidence-empty">{t('sources.empty')}</p>}
      </section>
      <SiteFooter />
    </main>
  )
}
