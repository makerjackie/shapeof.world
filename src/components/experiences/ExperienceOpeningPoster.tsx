import type { WorldExperience } from '~/data/worlds/types'
import { useI18n } from '~/i18n/index'
import type { LoadProgress } from '~/lib/world-load-progress'
import { WorldLoadProgress } from './WorldLoadProgress'

/** First paint for a world page: the poster is the LCP image, not a blank stage. */
export function ExperienceOpeningPoster({ world, progress }: { world: WorldExperience; progress?: LoadProgress }) {
  const { t, worldText } = useI18n()
  return (
    <div className="canvas-loading canvas-loading--poster">
      {world.poster && <picture>
        {world.posterMobile ? (
          <source media="(max-width: 720px)" srcSet={world.posterMobile} type="image/webp" />
        ) : null}
        {world.posterDesktop ? (
          <source media="(min-width: 721px)" srcSet={world.posterDesktop} type="image/webp" />
        ) : null}
        <img
          src={world.poster}
          alt=""
          width={1280}
          height={800}
          fetchPriority="high"
          decoding="async"
        />
      </picture>}
      <div className="world-opening-status">
        {progress ? <WorldLoadProgress {...progress} label={t('experience.opening')} /> :
          <p className="world-opening-label">{t('experience.opening')} · {worldText(world, 'title')}</p>}
      </div>
    </div>
  )
}
