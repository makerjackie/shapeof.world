import type { CSSProperties, MouseEventHandler, ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Check } from '@phosphor-icons/react'

import type { WorldSummary } from '~/data/world-summaries'
import { useI18n } from '~/i18n'
import { worldThumbnail } from '~/lib/posters'
import { worldRoute } from '~/lib/world-urls'
import { worldIntentHandlers } from '~/lib/world-prefetch'

export type WorldCardSize = 'large' | 'medium' | 'small'

/**
 * The one card used wherever a world is listed: a 16:10 poster, a serif title
 * and one 12px line (category, date or topic). Sizes only change the type and
 * padding; the surface, radius and hover are shared (see site-system.css).
 */
export function WorldCard({
  world,
  size = 'medium',
  label,
  viewed = false,
  search,
  eager = false,
  title: titleOverride,
  image,
  delay,
  onClick,
  className,
}: {
  world: Pick<WorldSummary, 'id' | 'posterTitle'> & {
    posterPosition?: string
    accent?: string
    translations: { en: { posterTitle: string } }
  }
  size?: WorldCardSize
  label?: ReactNode
  viewed?: boolean
  search?: { collection?: 'featured' }
  eager?: boolean
  /** For worlds outside the public summaries (making list). */
  title?: string
  /** Defaults to the generated thumbnail; null renders an empty frame. */
  image?: string | null
  delay?: number
  onClick?: MouseEventHandler<HTMLAnchorElement>
  className?: string
}) {
  const { t, locale } = useI18n()
  const title = titleOverride ?? (locale === 'en' ? world.translations.en.posterTitle : world.posterTitle)
  const src = image === undefined ? worldThumbnail(world) : image
  return (
    <Link
      to={worldRoute}
      params={{ worldId: world.id }}
      search={search ?? {}}
      className={`work-card work-card--${size}${className ? ` ${className}` : ''}`}
      onClick={onClick}
      style={{
        '--world-accent': world.accent,
        '--world-poster-position': world.posterPosition ?? '50% 50%',
        ...(delay === undefined ? {} : { '--reveal-delay': `${delay}ms` }),
      } as CSSProperties}
      {...worldIntentHandlers(world.id)}
    >
      <span className="work-card-media">
        {src ? (
          <img
            src={src}
            alt=""
            width={384}
            height={256}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={eager ? 'auto' : 'low'}
          />
        ) : null}
        {viewed && <span className="work-card-viewed"><Check aria-hidden="true" />{t('home.viewed')}</span>}
      </span>
      <span className="work-card-body">
        <strong className="work-card-title">{title}</strong>
        {label ? <span className="work-card-label">{label}</span> : null}
      </span>
    </Link>
  )
}
