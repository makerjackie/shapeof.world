import { getCategory, getPrimaryCategoryTrail } from '~/data/content-graph'
import type { WorldSummary } from '~/data/world-summaries'

export function normalizeWorldSearch(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase()
}

function compactWorldSearch(value: string): string {
  return normalizeWorldSearch(value).replace(/[\p{P}\p{S}\s]+/gu, '')
}

function worldQuery(value: string): string {
  const normalized = normalizeWorldSearch(value)
  const withoutOrigin = normalized.replace(/^(?:https?:\/\/)?(?:www\.)?shapeof\.world\//u, '/')
  const withoutExplorePath = withoutOrigin.replace(/^\/?explore\//u, '')
  const pathName = withoutExplorePath.split(/[?#]/u, 1)[0]
  return pathName || normalized
}

export function worldMatchesSearch(world: WorldSummary, query: string): boolean {
  const originalQuery = normalizeWorldSearch(query)
  if (!originalQuery) return true

  const normalizedQuery = worldQuery(query)
  const compactQuery = compactWorldSearch(normalizedQuery)

  const categories = [
    ...getPrimaryCategoryTrail(world.primaryCategoryId),
    ...(world.additionalCategoryIds ?? []).map(getCategory),
  ]
  return [
    world.id,
    `/explore/${world.id}`,
    world.title,
    world.posterTitle,
    world.posterHook,
    world.question,
    world.topicLabel,
    world.translations.en.title,
    world.translations.en.posterTitle,
    world.translations.en.posterHook,
    world.translations.en.question,
    world.translations.en.topicLabel,
    ...categories.flatMap((category) => [category.title, category.titleEn]),
  ].some((value) => {
    if (!value) return false
    const normalizedValue = normalizeWorldSearch(value)
    return normalizedValue.includes(normalizedQuery)
      || (compactQuery.length >= 2 && compactWorldSearch(normalizedValue).includes(compactQuery))
  })
}
