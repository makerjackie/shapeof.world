import { useCallback, useState } from 'react'

import { hasCompletedGuide } from '~/components/experiences/GuideTour'

type StoryFreeModeOptions = {
  firstVisit?: 'story' | 'free'
}

/**
 * 故事模式 / 自由探索双路径状态。
 * - 难懂世界首次进入故事；一眼能懂的世界可用 firstVisit: 'free'
 * - 关闭或讲完引导后：storyMode=false → Freebar + GhostHint
 * - 回访：hasCompletedGuide 为 true → 直接自由探索
 */
export function useStoryFreeMode(
  worldId: string,
  { firstVisit = 'story' }: StoryFreeModeOptions = {},
) {
  const [storyMode, setStoryMode] = useState(() => {
    if (firstVisit === 'free') return false
    if (typeof window === 'undefined') return true
    return !hasCompletedGuide(worldId)
  })

  const enterFree = useCallback(() => {
    setStoryMode(false)
  }, [])

  const enterStory = useCallback(() => {
    setStoryMode(true)
  }, [])

  return {
    storyMode,
    setStoryMode,
    enterFree,
    enterStory,
    /** 兼容旧命名 */
    returnToFree: enterFree,
  } as const
}
