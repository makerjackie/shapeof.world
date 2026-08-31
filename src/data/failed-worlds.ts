export type FailedWorldCopy = {
  zh: string
  en: string
}

export type FailedWorldRecord = {
  worldId: string
  createdAt: string
  poster: string
  posterMobile: string
  reason: FailedWorldCopy
  title: FailedWorldCopy
}

export const failedWorlds: Array<FailedWorldRecord> = []

export const failedWorldIds: ReadonlySet<string> = new Set()

export function isFailedWorldId(_worldId: string) {
  return false
}
