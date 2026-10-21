import { useEffect } from 'react'

import { ownsExperienceStageInput } from './experience-input'

type GuideCanvasExitOptions = {
  worldId: string
  active: boolean
  onExit: () => void
}

export function useGuideCanvasExit({ worldId, active, onExit }: GuideCanvasExitOptions) {
  useEffect(() => {
    if (!active) return

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || event.isPrimary === false) return
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('nav')) return
      const surface = target.closest('canvas, svg')
      const stage = surface?.closest('.experience-stage')
      if (stage?.closest('[data-world-id]')?.getAttribute('data-world-id') !== worldId) return
      if (!ownsExperienceStageInput(stage ?? null, event)) return

      // Observe in capture so canvas handlers may stop propagation without hiding
      // the interaction; leave the original event available to the world.
      onExit()
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [worldId, active, onExit])
}
