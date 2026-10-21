import { worldRoute } from '~/lib/world-urls'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Play } from '@phosphor-icons/react'
import { homeSeriesDescriptions } from '~/data/home-series'
import type { Path } from '~/data/content-graph'
import type { WorldSummary } from '~/data/world-summaries'
import { useI18n } from '~/i18n'
import { firstUnexploredWorldIndex, pathMembers, pathStopLabel } from '~/lib/path-progress'
import { worldThumbnail } from '~/lib/posters'
import { worldIntentHandlers } from '~/lib/world-prefetch'
import { useAtlas } from '~/state/atlas'
import './SeriesDiscovery.css'

function SeriesCard({ path, members, compact }: { path: Path; members: WorldSummary[]; compact: boolean }) {
  const { locale, t, pathText } = useI18n()
  const atlas = useAtlas()
  const viewed = atlas.ready ? members.filter((world) => atlas.visited.includes(world.id)).length : 0
  const nextIndex = firstUnexploredWorldIndex(members, atlas.ready ? atlas.visited : [])
  const nextWorld = members[nextIndex]
  const preview = members.slice(0, 3)
  const labeledStops = members.slice(0, 4)
  return (
    <article className={`series-card${compact ? ' is-compact' : ''}`}>
      <Link className="series-card-overview" to="/routes/$slug" params={{ slug: path.slug }}>
        <span className="series-card-images" aria-hidden="true">
          {preview.map((world, index) => (
            <span key={world.id}>
              <img src={worldThumbnail(world)} alt="" width={384} height={256} loading="lazy" decoding="async"
                style={{ objectPosition: world.posterPosition ?? '50% 50%' }} />
              <small>{String(index + 1).padStart(2, '0')}</small>
            </span>
          ))}
        </span>
        <span className="series-card-meta">{t('home.paths.worldCount', { value: members.length })}<ArrowRight aria-hidden="true" /></span>
        <h3>{pathText(path, 'title')}</h3>
        <p className="series-card-description">{compact ? homeSeriesDescriptions[path.id]?.[locale] ?? pathText(path, 'description') : pathText(path, 'description')}</p>
      </Link>
      {!compact && <>
      <p className="series-card-stops">
        {labeledStops.map((world, index) => pathStopLabel(path, index, world, locale)).join(' → ')}
        {members.length > labeledStops.length && <span> · +{members.length - labeledStops.length}</span>}
      </p>
      <div className="series-card-bottom">
        {viewed > 0 && <span className="series-card-progress">{t('home.paths.exploredCount', { current: viewed, total: members.length })}</span>}
        <Link to={worldRoute} params={{ worldId: nextWorld.id }} search={{ path: path.id }}
          className="btn-secondary series-card-start" {...worldIntentHandlers(nextWorld.id)}>
          <Play aria-hidden="true" weight="fill" />
          {viewed === 0 ? t('home.paths.startExplore') : viewed === members.length ? t('home.paths.again') : t('home.paths.continue', { value: nextIndex + 1 })}
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
      </>}
    </article>
  )
}

export function PathShowcase({ paths, worldById, compact = false }: {
  compact?: boolean
  paths: readonly Path[]
  worldById: ReadonlyMap<string, WorldSummary>
}) {
  const { t } = useI18n()
  return (
    <div role={compact ? 'region' : undefined} aria-label={compact ? t('home.paths.title') : undefined} className={`series-grid${compact ? ' series-rail' : ''}`} tabIndex={compact ? 0 : undefined}>
      {paths.map((path) => {
        const members = pathMembers(path, worldById)
        // A partial route would change the editorial order and mislabel its stops.
        if (path.publication !== 'public' || !members.length || members.length !== path.worldIds.length) return null
        return <SeriesCard key={path.id} path={path} members={members} compact={compact} />
      })}
    </div>
  )
}
