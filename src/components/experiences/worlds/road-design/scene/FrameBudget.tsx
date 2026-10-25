import { useEffect, useLayoutEffect, useRef, type ComponentRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { OrbitControls } from '@react-three/drei'

/** Keep long exposures and dense street façades responsive on smaller GPUs. */
export function FrameBudget({version,onDprChange}:{version:string;onDprChange?:(dpr:number)=>void}) {
  const setDpr = useThree(state => state.setDpr)
  const controls = useThree(state => state.controls) as ComponentRef<typeof OrbitControls> | undefined
  const sample = useRef({ elapsed: 0, frames: 0, stable: 0 })
  const settleUntil = useRef(0)
  useLayoutEffect(() => {
    // Texture/program setup and the 1.5 s camera flight are not steady GPU
    // fill cost. Repeated design switches must not ratchet resolution down.
    settleUntil.current = performance.now() + 2000
    sample.current = { elapsed: 0, frames: 0, stable: 0 }
  }, [version])
  const interaction = useRef({ active: false, ended: -Infinity })
  useEffect(() => {
    if (!controls) return
    const start = () => { interaction.current.active = true; sample.current.stable = 0 }
    const end = () => { interaction.current.active = false; interaction.current.ended = performance.now() }
    controls.addEventListener('start', start)
    controls.addEventListener('end', end)
    return () => { controls.removeEventListener('start', start); controls.removeEventListener('end', end) }
  }, [controls])
  useFrame((state, delta) => {
    if (document.hidden || delta > 0.2 || performance.now() < settleUntil.current) return
    const window = sample.current
    window.elapsed += delta; window.frames++
    if (window.elapsed < 1.5) return
    const average = window.elapsed / window.frames
    const ceiling = Math.min(1.5, devicePixelRatio), current = state.viewport.dpr
    // Leave headroom above the 55 fps desktop target; waiting for 52 fps kept
    // pixel-bound city views just below target without ever reducing resolution.
    if (average > 1 / 57 && current > 0.85) {
      const next=Math.max(0.85,current-0.15);setDpr(next);onDprChange?.(next);window.stable = 0
    // Reallocating the post buffers during a drag can cause the next stall.
    // Recover only after sustained headroom and eight seconds without input.
    } else if (average < 1 / 58 && !interaction.current.active && performance.now() - interaction.current.ended > 8000) {
      window.stable += window.elapsed
      if (window.stable > 20 && current < ceiling) { const next=Math.min(ceiling,current+0.1);setDpr(next);onDprChange?.(next);window.stable = 0 }
    } else window.stable = 0
    window.elapsed = 0; window.frames = 0
  })
  return null
}
