import type { WorldExperience } from '~/data/worlds'

export function PosterImage({
  world,
  priority = false,
  className,
}: {
  world: Pick<WorldExperience, 'poster' | 'posterMobile' | 'posterDesktop'>
  priority?: boolean
  className: string
}) {
  if (!world.poster) return null
  return (
    <picture className="poster-picture">
      {world.posterMobile && <source media="(max-width: 720px)" srcSet={world.posterMobile} />}
      {world.posterDesktop && <source media="(min-width: 721px)" srcSet={world.posterDesktop} />}
      <img
        src={world.poster}
        alt=""
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
      />
    </picture>
  )
}
