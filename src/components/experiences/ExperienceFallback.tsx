import { Link } from '@tanstack/react-router'

import { worldArtifactManifest } from '~/data/world-artifacts'
import type { WorldExperience } from '~/data/worlds/types'
import { useI18n } from '~/i18n/index'
import { worldThumbnail } from '~/lib/posters'

import './ExperienceFallback.css'

/**
 * 世界跑不起来时的出口。
 *
 * 之前这种情况没有出口：3D 世界在没有 WebGL 的浏览器里不会报错，
 * 只是永远停在「正在打开这个世界…」。用户看不出是自己的浏览器不行，
 * 还是网站坏了，只能退出。
 *
 * 这里至少给三样东西：这个世界长什么样（海报）、为什么打不开、
 * 以及两个不需要 WebGL 也能玩的世界。
 */
export function ExperienceFallback({
  world,
  reason,
}: {
  world: WorldExperience
  reason: 'webgl' | 'slow'
}) {
  const { t, worldText } = useI18n()
  const alternatives = worldArtifactManifest.fallbackWorlds
    .filter((item) => item.id !== world.id)
    .slice(0, 2)

  return (
    <div className="experience-fallback" role="alert">
      <img
        className="experience-fallback-poster"
        src={worldThumbnail(world)}
        alt=""
        aria-hidden="true"
        decoding="async"
      />
      <div className="experience-fallback-body">
        <h2>{worldText(world, 'title')}</h2>
        <p>{reason === 'webgl' ? t('experience.fallback.webgl') : t('experience.fallback.slow')}</p>

        {alternatives.length > 0 && (
          <>
            <p className="experience-fallback-hint">{t('experience.fallback.tryInstead')}</p>
            <ul className="experience-fallback-list">
              {alternatives.map((item) => (
                <li key={item.id}>
                  <Link to="/explore/$worldId" params={{ worldId: item.id }}>
                    {worldText(item, 'posterTitle')}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        <Link to="/" className="experience-fallback-home">
          {t('experience.fallback.browseAll')}
        </Link>
      </div>
    </div>
  )
}
