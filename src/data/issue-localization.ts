import type { DailyIssue, IssueLocale } from './issues'

export function localizeIssue(issue: DailyIssue, locale: IssueLocale) {
  return {
    question: issue.question[locale],
    hook: issue.hook[locale],
    conclusion: issue.conclusion[locale],
  }
}
