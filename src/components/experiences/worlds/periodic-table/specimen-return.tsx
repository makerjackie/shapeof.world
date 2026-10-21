import { useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { CabinetBounds } from './cabinet-motion'

export interface SpecimenFlight { from: CabinetBounds; to: CabinetBounds; src: string }

/** Fly only the visible specimen; the dossier and table fade independently. */
export function SpecimenReturn({ flight, onComplete }: { flight: SpecimenFlight; onComplete: () => void }) {
 const image = useRef<HTMLImageElement>(null), complete = useRef(onComplete)
 complete.current = onComplete
 useLayoutEffect(() => {
  const node = image.current
  if (!node) { complete.current(); return }
  const { from, to } = flight
  const scale = Math.min(to.width / from.width, to.height / from.height)
  const dx = to.left + to.width / 2 - from.left - from.width / 2
  const dy = to.top + to.height / 2 - from.top - from.height / 2
  const landing = `translate(${dx}px,${dy}px) scale(${scale})`
  const motion = node.animate([
   { transform: 'none', opacity: 1, easing: 'cubic-bezier(.25,.55,.4,1)' },
   { transform: `translate(${dx*.38}px,${dy*.38-Math.min(40,Math.abs(dx)*.08)}px) scale(${1+(scale-1)*.42})`, opacity: 1, offset: .4, easing: 'cubic-bezier(.2,.65,.2,1)' },
   { transform: landing, opacity: 1, offset: .9 },
   { transform: landing, opacity: 0 },
  ], { duration: 740, easing: 'linear', fill: 'both' })
  motion.onfinish = () => complete.current()
  const settle = () => complete.current()
  window.addEventListener('resize', settle)
  return () => { motion.onfinish = null; motion.cancel(); window.removeEventListener('resize', settle) }
 }, [flight])
 return createPortal(<img ref={image} className="pm-return-specimen" src={flight.src} alt="" aria-hidden="true" style={{ left: flight.from.left, top: flight.from.top, width: flight.from.width, height: flight.from.height }}/>, document.body)
}
