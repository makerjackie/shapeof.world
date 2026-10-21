import type { Path } from '~/data/content-graph/types'

export type WorldPathNavigation = {
  id: string
  slug: string
  title: string
  titleEn: string
  stops: Array<{ worldId: string; title: string; titleEn: string }>
}

type PublicWorld = {
  title: string
  translations: { en: { title: string } }
}

/** Keep authoring-only or unavailable worlds out of every series entry. */
export async function loadWorldPathNavigation(
  worldId: string,
  paths: ReadonlyArray<Path>,
  loadPublicWorld: (id: string) => Promise<PublicWorld | undefined>,
): Promise<Array<WorldPathNavigation>> {
  const candidates = paths.filter((path) => path.publication === 'public' && path.worldIds.includes(worldId))
  const resolved = await Promise.all(candidates.map(async (path) => {
    const worlds = await Promise.all(path.worldIds.map(loadPublicWorld))
    if (worlds.some((world) => !world)) return undefined
    return {
      id: path.id,
      slug: path.slug,
      title: path.title,
      titleEn: path.titleEn,
      stops: worlds.map((world, index) => ({
        worldId: path.worldIds[index],
        title: path.stopLabels?.[index].zh ?? world!.title,
        titleEn: path.stopLabels?.[index].en ?? world!.translations.en.title,
      })),
    }
  }))
  return resolved.filter((path): path is WorldPathNavigation => Boolean(path))
}
