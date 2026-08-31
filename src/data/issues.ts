export {editorialTimeZone, getEditorialDayKey} from './editorial-date'
export {localizeIssue} from './issue-localization'

export type IssueLocale = 'en' | 'zh'

export type BilingualText = {
  en: string
  zh: string
}

export type IssueExperience = {
  renderer: string
  focus: string
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

export const dailyIssues: Array<DailyIssue> = []
export const dailyFeedSize = 0
export const homepageLeadIssueId = ''

export function validateDailyIssues(): Array<string> {
  return []
}

export function getDailyIssue(_id: string): DailyIssue | undefined {
  return undefined
}

export function getDailyFeaturedIssue(_date = new Date()): DailyIssue | undefined {
  return undefined
}

export function getDailyIssueFeed(_date = new Date(), _count = dailyFeedSize): Array<DailyIssue> {
  return []
}

export type DailyIssueFeedContext = {
  previous?: DailyIssue
  next?: DailyIssue
}

export function getDailyIssueFeedContext(_issue: DailyIssue, _date = new Date()): DailyIssueFeedContext {
  return {}
}

export function getNextDailyIssue(_issue: DailyIssue, _date = new Date()): DailyIssue | undefined {
  return undefined
}
