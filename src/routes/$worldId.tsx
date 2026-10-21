import { worldPath } from '~/lib/world-urls'
import { isReservedWorldName } from '~/lib/world-route-names'
import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { ExperienceShell } from '~/components/ExperienceShell'
import { ExperienceRenderer } from '~/components/experiences/ExperienceRenderer'
import { localizeIssue } from '~/data/issue-localization'
import { worldArtifactManifest } from '~/data/world-artifacts'
import type { WorldState } from '~/data/world-state'
import { getWorldSearchProfile } from '~/data/world-search-profiles'
import { SOCIAL_CARD_HEIGHT, SOCIAL_CARD_WIDTH, worldSocialCard } from '~/lib/posters'
import { languageDiscoveryLinks } from '~/i18n/seo'
import { experienceClientUrl } from '~/lib/experience-client-url'
import { languageCanonicalUrl, localizedPublicUrl } from '~/lib/share-url'
import { seo } from '~/utils/seo'
import { loadWorldPathNavigation } from '~/lib/world-path-navigation'

export type ExperienceVisibility = Exclude<WorldState, 'rights-blocked'>

export function getExperienceDiscoveryPolicy(visibility: ExperienceVisibility) {
  return {
    robots: visibility === 'public' ? undefined : 'noindex,follow',
    includeLearningResource: visibility === 'public',
  } as const
}

const getExperienceRouteData = createServerFn({ method: 'GET' })
  .validator((input: { worldId: string; issueId?: string; pathId?: string }) => ({
    worldId: input.worldId,
    issueId: input.issueId,
    pathId: input.pathId,
  }))
  .handler(async ({ data }) => {
    if (isReservedWorldName(data.worldId)) return { status: 'not-found' as const }
    const [issueData, contentGraph, redirects, artifactData, navigationData] = await Promise.all([
      import('~/data/issues'),
      import('~/data/content-graph'),
      import('~/data/legacy-redirects'),
      import('~/data/world-artifacts.server'),
      import('~/lib/next-world'),
    ])

    const replacement = Object.hasOwn(redirects.legacyWorldRedirects, data.worldId) ? redirects.legacyWorldRedirects[data.worldId] : undefined
    if (replacement) {
      const target = await artifactData.loadWorldArtifact(replacement)
      if (target?.state === 'public') return { status: 'redirect' as const, replacement }
      return { status: 'not-found' as const }
    }

    const artifact = await artifactData.loadWorldArtifact(data.worldId)
    if (!artifact || artifact.state === 'rights-blocked') return { status: 'not-found' as const }
    const { world, state: visibility } = artifact
    const loadPublicWorld = async (worldId: string | undefined) => {
      if (!worldId) return undefined
      const candidate = await artifactData.loadWorldArtifact(worldId)
      return candidate?.state === 'public' ? candidate.world : undefined
    }

    const requestedIssue = data.issueId ? issueData.getDailyIssue(data.issueId) : undefined
    const issue = requestedIssue?.worldId === world.id ? requestedIssue : undefined
    const issueFeedContext = issue ? issueData.getDailyIssueFeedContext(issue) : undefined
    const nextIssue = issueFeedContext?.next
    const pathContext = data.pathId ? contentGraph.getPathContext(data.pathId, world.id) : undefined
    const [pathNextWorld, relatedWorld, adjacentWorld, issueNextWorld] = await Promise.all([
      loadPublicWorld(pathContext?.nextWorldId),
      loadPublicWorld(world.related[0]),
      loadPublicWorld(artifact.navigation?.nextWorldId),
      loadPublicWorld(nextIssue?.worldId),
    ])
    const nextSelection = visibility === 'public' ? navigationData.selectEditorialNextWorld({
      issue: issueNextWorld,
      path: pathNextWorld,
      related: relatedWorld,
      recommended: adjacentWorld,
    }) : undefined
    const nextKind = nextSelection?.kind
    const nextWorld = nextSelection?.world
    const worldPaths = visibility === 'public'
      ? await loadWorldPathNavigation(world.id, contentGraph.paths, loadPublicWorld)
      : []
    const randomWorldIds = visibility === 'public' ? [...(artifact.navigation?.randomWorldIds ?? [])] : []
    const worldIssues = issueData.dailyIssues
      .filter((item) => item.worldId === world.id && item.publishedOn <= issueData.getEditorialDayKey())
      .sort((left, right) => right.publishedOn.localeCompare(left.publishedOn))

    return {
      status: 'found' as const,
      world,
      visibility,
      issue,
      navigation: {
        nextWorld,
        worldPaths,
        nextIssue: nextKind === 'issue' ? nextIssue : undefined,
        nextKind,
        randomWorldIds,
        pathPosition: pathContext
          ? {
              id: pathContext.path.id,
              title: pathContext.path.title,
              titleEn: pathContext.path.titleEn,
              order: pathContext.order,
              total: pathContext.total,
            }
          : undefined,
        displayPosition: issueFeedContext?.position,
        displayTotal: issueFeedContext?.position ? issueFeedContext.total : worldArtifactManifest.total,
        worldIssues,
      },
    }
  })

export const Route = createFileRoute('/$worldId')({
  /**
   * `s` carries a shared moment's state. It is preserved here so the router does
   * not strip it on navigation; the mounted world decodes and validates it via
   * `useIncomingShareState`, which is where the allow-lists live.
   */
  validateSearch: (search: Record<string, unknown>): { issue?: string; path?: string; s?: string; exploreAll?: boolean; collection?: 'featured' } => ({
    ...(typeof search.issue === 'string' ? { issue: search.issue } : {}),
    ...(typeof search.path === 'string' ? { path: search.path } : {}),
    ...(typeof search.s === 'string' ? { s: search.s } : {}),
    ...(search.collection === 'featured' ? { collection: 'featured' as const } : {}),
    ...(search.exploreAll === true || search.exploreAll === 'true' ? { exploreAll: true } : {}),
  }),
  loaderDeps: ({ search }) => ({ issueId: search.issue, pathId: search.path }),
  loader: async ({ params, deps, context, location }) => {
    const result = await getExperienceRouteData({
      data: { worldId: params.worldId, issueId: deps.issueId, pathId: deps.pathId },
    })
    if (result.status === 'redirect') {
      throw redirect({
        href: `${worldPath(result.replacement, context.locale)}${location.searchStr}`,
        statusCode: 301,
        replace: true,
      })
    }
    if (result.status === 'not-found') throw notFound()
    return { ...result, locale: context.locale }
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'zh'
    const discoveryPolicy = loaderData
      ? getExperienceDiscoveryPolicy(loaderData.visibility)
      : undefined
    const issueCopy = loaderData?.issue ? localizeIssue(loaderData.issue, locale) : undefined
    const worldCopy = loaderData
      ? locale === 'zh' ? loaderData.world : loaderData.world.translations.en
      : undefined
    const searchCopy = loaderData
      ? getWorldSearchProfile(loaderData.world.id)?.[locale]
      : undefined
    // 分享卡片走 1200×630 JPEG，不用体验海报（WebP / 16:10 / 数百 KB）：
    // 微信与微博对 WebP 的 OG 预览支持不可靠。每日刊物有自己的海报时仍然优先用它。
    const issuePoster = loaderData?.issue?.poster?.desktopSrc ?? loaderData?.issue?.poster?.src
    const cardPath = loaderData
      ? issuePoster ?? worldSocialCard(loaderData.world)
      : undefined
    const socialImage = cardPath?.startsWith('http')
      ? cardPath
      : cardPath
        ? `https://shapeof.world${cardPath}`
        : undefined
    const canonicalUrl = loaderData
      ? `https://shapeof.world${worldPath(loaderData.world.id)}${loaderData.issue ? `?issue=${loaderData.issue.id}` : ''}`
      : undefined
    const socialTitle = loaderData
      ? `${issueCopy?.question ?? searchCopy?.title ?? worldCopy?.question} — ${locale === 'zh' ? '世界的形状' : 'Shape of the World'}`
      : undefined
    return ({
      meta: loaderData
        ? [
          ...seo({
            title: socialTitle ?? '',
            description: issueCopy?.hook ?? searchCopy?.description ?? worldCopy?.hook,
            keywords: searchCopy?.queries.join(', '),
            image: socialImage,
            imageAlt: socialTitle,
            imageWidth: SOCIAL_CARD_WIDTH,
            imageHeight: SOCIAL_CARD_HEIGHT,
            locale,
            url: localizedPublicUrl(canonicalUrl ?? 'https://shapeof.world/', locale),
          }),
          { name: 'theme-color', content: '#101a22' },
          ...(discoveryPolicy?.robots
            ? [{ name: 'robots', content: discoveryPolicy.robots }]
            : []),
        ]
        : [],
      links: loaderData
        ? [
        ...languageDiscoveryLinks(canonicalUrl ?? 'https://shapeof.world/', locale),
        ...(loaderData.world.posterMobile
          ? [{ rel: 'preload', as: 'image', href: loaderData.world.posterMobile, media: '(max-width: 720px)' }]
          : []),
        ...(loaderData.world.posterDesktop
          ? [{ rel: 'preload', as: 'image', href: loaderData.world.posterDesktop, media: '(min-width: 721px)' }]
          : []),
        ...(experienceClientUrl
          ? [{ rel: 'modulepreload' as const, href: experienceClientUrl }]
          : []),
        ]
        : [],
      // 结构化数据：让搜索与 AI 引擎知道这是一件可交互的科普作品，而不是一个空页面。
      scripts: loaderData && discoveryPolicy?.includeLearningResource
        ? [{
          type: 'application/ld+json',
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LearningResource',
            name: issueCopy?.question ?? searchCopy?.title ?? worldCopy?.question,
            description: issueCopy?.hook ?? searchCopy?.description ?? worldCopy?.hook,
            url: languageCanonicalUrl(canonicalUrl ?? 'https://shapeof.world/', locale),
            image: socialImage,
            inLanguage: locale === 'zh' ? 'zh-Hans' : 'en',
            learningResourceType: 'Interactive simulation',
            isAccessibleForFree: true,
            ...(searchCopy
              ? {
                keywords: searchCopy.queries.join(', '),
                abstract: searchCopy.answer,
                teaches: searchCopy.teaches,
                about: searchCopy.queries.map((name) => ({ '@type': 'Thing', name })),
              }
              : {}),
            publisher: {
              '@type': 'Organization',
              name: 'Shape of the World',
              url: 'https://shapeof.world/',
            },
            ...(loaderData.world.sources.length > 0
              ? {
                citation: loaderData.world.sources.map((source) => ({
                  '@type': 'CreativeWork',
                  name: locale === 'zh' ? source.label : source.labelEn,
                  url: source.url,
                })),
              }
              : {}),
          }),
        }]
        : [],
    })
  },
  component: ExplorePage,
})

function ExplorePage() {
  const { world, visibility, issue, navigation } = Route.useLoaderData()
  const { exploreAll, collection, path } = Route.useSearch()

  return (
    <ExperienceShell
      key={`${world.id}:${issue?.id ?? 'default'}`}
      world={world}
      issue={issue}
      navigation={navigation}
      exploreAll={exploreAll}
      exploreFeatured={collection === 'featured' && !path && !issue}
      isPublic={visibility === 'public'}
    >
      {(controls) => (
        <ExperienceRenderer world={world} issue={issue} controls={controls} />
      )}
    </ExperienceShell>
  )
}
