import { useLayoutEffect, useRef, type RefObject, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import {cardRating} from './card-rating'
import type { CabinetBounds } from './cabinet-motion'

/** A presentation-only flight; the accessible dossier remains the single dialog. */
export function SpecimenReveal({ origin, target, src, symbol, number, name, label, discoveryLabel, skipLabel, onComplete }: {
 origin: CabinetBounds | null; target: RefObject<HTMLDivElement | null>; src: string
 symbol: string; number: number; name: string; label: string; discoveryLabel:string; skipLabel:string; onComplete: () => void
}) {
 const card = useRef<HTMLDivElement>(null)
 const complete = useRef(onComplete)
 complete.current = onComplete
 useLayoutEffect(() => {
  const node = card.current
  const destination = target.current?.querySelector('.pm-hero-image')
  if (!node || !destination) { complete.current(); return }
  const bounds = node.getBoundingClientRect(), end = destination.getBoundingClientRect()
  const cx = bounds.left + bounds.width / 2, cy = bounds.top + bounds.height / 2
  const startX = origin ? Math.max(0, Math.min(innerWidth, origin.left + origin.width / 2)) - cx : 0
  const startY = origin ? Math.max(0, Math.min(innerHeight, origin.top + origin.height / 2)) - cy : 100
  const scale = Math.min(end.width / (bounds.width * .8), end.height / (bounds.height * .6))
  const landing = `translate(${end.left + end.width / 2 - cx}px,${end.top + end.height / 2 - cy}px) scale(${scale})`
  const motion = node.animate([
   { transform: `translate(${startX}px,${startY}px) scale(.12) rotateY(-76deg) rotateZ(-12deg)`, opacity: 0, easing: 'cubic-bezier(.18,.8,.22,1)' },
   { transform: 'translate(0,12px) scale(.92) rotateY(-28deg) rotateZ(-5deg)', opacity: 1, offset: .14, easing: 'cubic-bezier(.18,.8,.22,1)' },
   { transform: 'translate(0,-8px) scale(1.025) rotateY(0deg) rotateZ(0deg)', opacity: 1, offset: .24 },
   { transform: 'translate(0,-12px) scale(1.03)', opacity: 1, offset: .52 },
   { transform: 'translate(0,-8px) scale(1.025)', opacity: 1, offset: .80, easing: 'cubic-bezier(.65,0,.25,1)' },
   { transform: landing, opacity: 1, offset: 1 },
  ], { duration: 2400, easing: 'linear', fill: 'both' })
  motion.onfinish = () => complete.current()
  const settle = () => complete.current()
  window.addEventListener('resize', settle)
  return () => { motion.onfinish = null; motion.cancel(); window.removeEventListener('resize', settle) }
 }, [origin, target])
 return createPortal(<div className="pm-reveal" data-stars={cardRating(symbol)} aria-hidden="true">
  <span className="pm-reveal-hint">{skipLabel}</span>
  <div className="pm-reveal-veil"/><div className="pm-reveal-halo"/>
  <div className="pm-reveal-constellation">{Array.from({length:18},(_,i)=><i key={i} style={{'--angle':`${i*137.5}deg`,'--radius':`${240+(i%5)*38}px`,'--delay':`${.22+(i%6)*.065}s`,'--spark-size':`${i%3===0?18:10}px`} as CSSProperties}/>)}</div>
  <div className="pm-reveal-aura"/><div className="pm-reveal-card" ref={card}>
   <small className="pm-reveal-discovery">{discoveryLabel}</small><div className="pm-reveal-frame"/>
   <div className="pm-reveal-heading"><span>{String(number).padStart(2,'0')}</span><b>{symbol}</b><small>{label}</small></div>
   <img className="pm-reveal-object" src={src} alt="" draggable={false}/>
   <div className="pm-reveal-name">{name}<span className="pm-reveal-stars">{Array.from({length:cardRating(symbol)},(_,i)=><i key={i} style={{animationDelay:`${.53+i*.09}s`}}>★</i>)}</span><span>{symbol} / {String(number).padStart(3,'0')}</span></div>
  </div>
 </div>, document.body)
}
