import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

/** Keep long exposures and dense street façades responsive on smaller GPUs. */
export function FrameBudget() {
  const setDpr = useThree(state => state.setDpr)
  const sample = useRef({ elapsed: 0, frames: 0, stable: 0 })
  useFrame((state, delta) => {
    if (document.hidden || delta > 0.2) return
    const window = sample.current
    window.elapsed += delta; window.frames++
    if (window.elapsed < 1.5) return
    const average = window.elapsed / window.frames
    const ceiling = Math.min(1.5, devicePixelRatio), current = state.viewport.dpr
    if (average > 1 / 52 && current > 0.85) {
      setDpr(Math.max(0.85, current - 0.15)); window.stable = 0
    } else if (average < 1 / 85) {
      window.stable += window.elapsed
      if (window.stable > 6 && current < ceiling) { setDpr(Math.min(ceiling, current + 0.1)); window.stable = 0 }
    } else window.stable = 0
    window.elapsed = 0; window.frames = 0
  })
  return null
}
