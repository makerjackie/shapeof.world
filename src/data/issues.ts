import {getEditorialDayKey} from './editorial-date'
import {archivedWorldIds, rightsBlockedWorldIds} from './world-state'

export {editorialTimeZone, getEditorialDayKey} from './editorial-date'
export {localizeIssue} from './issue-localization'

export type IssueLocale = 'en' | 'zh'

export type BilingualText = {
  en: string
  zh: string
}

export type IssueExperience =
  | {renderer: 'global-flight-flow'; focus: 'hubs'}
  | {renderer: 'solar-system'; focus: 'falling-sideways'}
  | {renderer: 'cow-anatomy'; focus: 'body-systems-and-cuts'}
  | {renderer: 'periodic-table'; focus: 'four-orders'}
  // Retired renderers remain typed while their source modules are kept as an archive.
  | {renderer: 'living-earth'; focus: 'strongest' | 'depth'; minimumMagnitude: 2.5 | 4 | 5.5}
  | {renderer: 'apollo-eleven'; focus: 'hull' | 'seats' | 'panel' | 'graffiti'; openingExplode: number}
  | {renderer: 'ocean-descent'; focus: 'light' | 'pressure'; openingDepth: number; targetDepth: number}
  | {renderer: 'earth-cutaway'; focus: 'crust' | 'outer-core' | 'inner-core'; openingExplode: number}
  | {
      renderer: 'scale-portal'
      direction: 'inward' | 'outward'
      openingScale: 'atom' | 'cell' | 'human' | 'earth' | 'solar-system'
      targetScale: 'atom' | 'cell' | 'human' | 'earth' | 'solar-system'
    }

export type DailyIssue = {
  id: string
  worldId: string
  publishedOn: string
  isLive: boolean
  estimatedMinutes: number
  question: BilingualText
  hook: BilingualText
  conclusion: BilingualText
  experience: IssueExperience
  poster?: {
    src: string
    mobileSrc?: string
    desktopSrc?: string
    position?: string
  }
}

export const dailyIssues: Array<DailyIssue> = [
  {
    id: 'gravity-turns-falling-into-orbit',
    worldId: 'solar-system',
    publishedOn: '2026-07-17',
    isLive: false,
    estimatedMinutes: 10,
    question: {en: 'Why do planets neither fall into the Sun nor fly away?', zh: '太阳一直在拉住行星，它们为什么既不坠落，也不飞走？'},
    hook: {en: 'Pause time, choose a planet, then watch gravity continually turn its path.', zh: '暂停时间，选择一颗行星，再让轨道显示引力如何持续改变它的方向。'},
    conclusion: {en: 'An orbit is a continuous fall whose sideways motion keeps missing the centre.', zh: '轨道是一场持续的坠落；横向速度让行星每一刻都错过太阳。'},
    experience: {renderer: 'solar-system', focus: 'falling-sideways'},
  },
  {
    id: 'cities-stitch-the-world',
    worldId: 'global-flight-network',
    publishedOn: '2026-07-09',
    isLive: false,
    estimatedMinutes: 4,
    question: {en: 'Which cities reorganize the world without borders?', zh: '如果拿掉国名，世界会被哪些城市重新组织？'},
    hook: {en: 'Explore 67,663 historical airline routes.', zh: '拖动 67,663 条开放历史航线，点一座机场，看枢纽怎样把远方变成邻居。'},
    conclusion: {en: 'Globalization depends on a small set of hubs.', zh: '全球化并不是均匀覆盖地球，而是依靠少数枢纽把大量城市串成网络。'},
    experience: {renderer: 'global-flight-flow', focus: 'hubs'},
  },
  {
    id: 'inside-a-cow',
    worldId: 'cow-anatomy',
    publishedOn: '2026-07-01',
    isLive: false,
    estimatedMinutes: 8,
    question: {en: 'How do anatomy and movement become different cuts of beef?', zh: '吊龙、匙仁和牛腱，究竟分别长在牛的哪里？'},
    hook: {en: 'Reveal seven body systems, then locate eight familiar beef cuts.', zh: '先让表皮变透明观察七套系统，再把吊龙、匙仁、胸口和牛腱放回身体原位。'},
    conclusion: {en: 'Movement, support and connective tissue shape each cut.', zh: '一块肉的嫩、脆、筋与脂，来自这组肌肉在活着时承担的运动和支撑任务。'},
    experience: {renderer: 'cow-anatomy', focus: 'body-systems-and-cuts'},
  },
  {
    id: 'elements-have-many-orders',
    worldId: 'periodic-table',
    publishedOn: '2026-06-28',
    isLive: false,
    estimatedMinutes: 5,
    question: {en: 'What if the periodic table could become a sphere or helix?', zh: '如果元素之间的关系不只可以画成一张表呢？'},
    hook: {en: 'Rearrange 118 elements without breaking their relationships.', zh: '让 118 种元素在周期表、球体、螺旋和晶格之间重新排列。'},
    conclusion: {en: 'The table is a relationship system, not a stack of cards.', zh: '周期表不是 118 张卡片，而是一套在不同排列中仍然成立的关系。'},
    experience: {renderer: 'periodic-table', focus: 'four-orders'},
  },
]

export const dailyFeedSize = worldsInFeed()
export const homepageLeadIssueId = 'gravity-turns-falling-into-orbit'

function worldsInFeed() {
  return new Set(dailyIssues
    .filter((issue) => !archivedWorldIds.has(issue.worldId) && !rightsBlockedWorldIds.has(issue.worldId))
    .map((issue) => issue.worldId)).size
}

export function validateDailyIssues(
  input = dailyIssues,
  resolveWorld?: (worldId: string) => { renderer: string } | undefined,
): Array<string> {
  const errors: Array<string> = []
  const ids = new Set<string>()

  for (const issue of input) {
    if (ids.has(issue.id)) errors.push(`Duplicate issue id: ${issue.id}`)
    ids.add(issue.id)
    const world = resolveWorld?.(issue.worldId)
    if (resolveWorld && !world && !rightsBlockedWorldIds.has(issue.worldId)) {
      errors.push(`Unknown world for ${issue.id}: ${issue.worldId}`)
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(issue.publishedOn)) errors.push(`Invalid publishedOn for ${issue.id}`)
    if (!Number.isFinite(issue.estimatedMinutes) || issue.estimatedMinutes <= 0) errors.push(`Invalid estimatedMinutes for ${issue.id}`)
    if (world && issue.experience.renderer !== world.renderer) {
      errors.push(`Renderer mismatch for ${issue.id}: ${issue.experience.renderer} != ${world.renderer}`)
    }
  }
  return errors
}

export function getDailyIssue(id: string): DailyIssue | undefined {
  return dailyIssues.find((issue) => issue.id === id)
}

export function getDailyFeaturedIssue(date = new Date()): DailyIssue | undefined {
  return getDailyIssueFeed(date, 1)[0]
}

export function getDailyIssueFeed(date = new Date(), count = dailyFeedSize): Array<DailyIssue> {
  if (count <= 0) return []
  const today = getEditorialDayKey(date)
  const available = dailyIssues.filter((issue) => (
    issue.publishedOn <= today
    && !archivedWorldIds.has(issue.worldId)
    && !rightsBlockedWorldIds.has(issue.worldId)
  ))
  const scheduled = available.filter((issue) => issue.publishedOn === today)
  const remaining = available
    .filter((issue) => issue.publishedOn !== today)
    .sort((left, right) => right.publishedOn.localeCompare(left.publishedOn))
  const latestPublishedOn = remaining[0]?.publishedOn
  const daysSinceLatest = latestPublishedOn
    ? Math.max(0, Math.floor(
        (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${latestPublishedOn}T00:00:00Z`)) / 86_400_000,
      ))
    : 0
  const rotatedRemaining = scheduled.length === 0 && remaining.length > 0 && daysSinceLatest > 0
    ? [
        ...remaining.slice(daysSinceLatest % remaining.length),
        ...remaining.slice(0, daysSinceLatest % remaining.length),
      ]
    : remaining
  const result: Array<DailyIssue> = []
  const seenWorlds = new Set<string>()

  const datedSequence = [...scheduled, ...rotatedRemaining]
  const leadIssue = available.find((issue) => issue.id === homepageLeadIssueId)
  const sequence = leadIssue
    ? [leadIssue, ...datedSequence.filter((issue) => issue.id !== leadIssue.id)]
    : datedSequence

  for (const issue of sequence) {
    if (seenWorlds.has(issue.worldId)) continue
    seenWorlds.add(issue.worldId)
    result.push(issue)
    if (result.length >= count) break
  }
  return result
}

export type DailyIssueFeedContext = {
  position?: number
  total: number
  next?: DailyIssue
}

export function getDailyIssueFeedContext(issue: DailyIssue, date = new Date()): DailyIssueFeedContext {
  const feed = getDailyIssueFeed(date)
  const index = feed.findIndex((item) => item.id === issue.id)

  return {
    position: index >= 0 ? index + 1 : undefined,
    total: feed.length,
    next: index >= 0 && feed.length > 1
      ? feed[(index + 1) % feed.length]
      : feed[0],
  }
}

export function getNextDailyIssue(issue: DailyIssue, date = new Date()): DailyIssue | undefined {
  return getDailyIssueFeedContext(issue, date).next
}
