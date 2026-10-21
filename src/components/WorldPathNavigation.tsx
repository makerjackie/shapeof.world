import { worldRoute } from '~/lib/world-urls'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from '@phosphor-icons/react'
import { useI18n } from '~/i18n'
import type { WorldPathNavigation as WorldPath } from '~/lib/world-path-navigation'
import { worldIntentHandlers } from '~/lib/world-prefetch'
import './WorldPathNavigation.css'

export function WorldPathNavigation({ path, worldId, active, onNavigate }: {
  path: WorldPath
  worldId: string
  active: boolean
  onNavigate: () => void
}) {
  const { locale, t } = useI18n()
  return (
    <nav className="world-path-navigation" aria-label={locale === 'zh' ? path.title : path.titleEn}>
      <Link to="/routes/$slug" params={{ slug: path.slug }} onClick={onNavigate} className="world-path-navigation-title" viewTransition>
        <span><small>{t('experience.series')}</small><strong>{locale === 'zh' ? path.title : path.titleEn}</strong></span>
        <ArrowRight aria-hidden="true" />
      </Link>
      <ol>
        {path.stops.map((stop, index) => (
          <li key={stop.worldId}>
            <Link
              to={worldRoute}
              params={{ worldId: stop.worldId }}
              search={{ path: path.id }}
              data-current={active && stop.worldId === worldId ? 'true' : undefined}
              onClick={onNavigate}
              viewTransition
              {...worldIntentHandlers(stop.worldId)}
            >
              <small aria-hidden="true">{String(index + 1).padStart(2, '0')}</small>
              <span>{locale === 'zh' ? stop.title : stop.titleEn}</span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  )
}
