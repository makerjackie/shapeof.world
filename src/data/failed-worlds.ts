import type { AiModelId } from './ai-models'

export type FailedWorldCopy = {
  zh: string
  en: string
}

export type FailedWorldRecord = {
  worldId: string
  createdAt: string
  initialModel?: AiModelId
  poster: string
  posterMobile: string
  reason: FailedWorldCopy
  title: FailedWorldCopy
}

/**
 * 失败馆馆藏已于 2026-10-12 全部删除。
 * 清单为空，保留类型与读取接口只为让生命周期代码继续成立。
 */
export const failedWorlds: ReadonlyArray<FailedWorldRecord> = []

export const failedWorldIds: ReadonlySet<string> = new Set(
  failedWorlds.map((record) => record.worldId),
)

export function isFailedWorldId(worldId: string) {
  return failedWorldIds.has(worldId)
}
