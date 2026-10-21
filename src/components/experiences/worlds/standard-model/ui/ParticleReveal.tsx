import { useCallback, useEffect, useRef, type CSSProperties } from 'react'
import { familyInfo, type Particle } from '../particle-data'
import { museumHash } from '../museum-route'
import { ExhibitPreview, exhibitLabels } from './ExhibitPreview'
import '../styles/ParticleReveal.css'

/** A deterministic reveal of the chosen particle; no random reward or rarity. */
export function ParticleReveal({ particle, en, onClose }: { particle: Particle; en: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const finished = useRef(false)
  const complete = useCallback(() => {
    if (finished.current) return
    finished.current = true
    onClose()
    window.location.hash = museumHash(particle.id)
  }, [onClose, particle.id])
  useEffect(() => {
    const node = dialog.current
    const origin = document.activeElement as HTMLElement | null
    finished.current = false
    node?.showModal()
    const cancel = () => { finished.current = true; onClose() }
    window.addEventListener('hashchange', cancel)
    return () => { finished.current = true; window.removeEventListener('hashchange', cancel); node?.close(); origin?.focus({ preventScroll: true }) }
  }, [onClose])
  return <dialog ref={dialog} className="smm-reveal" style={{ '--reveal-color': familyInfo[particle.family].color } as CSSProperties}
    aria-label={en ? `Revealing ${particle.nameEn}` : `${particle.name}卡片揭示`} onCancel={onClose} onKeyDown={event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();onClose()}}}>
    <div className="smm-reveal-rays" aria-hidden="true"/>
    <div className="smm-reveal-orbit" aria-hidden="true"/>
    <button className="smm-reveal-close" onClick={onClose} aria-label={en?'Close card':'关闭卡片'}>×</button>
    <button type="button" className="smm-reveal-card" onClick={complete} aria-label={en ? `View ${particle.nameEn}` : `查看${particle.name}`}>
      <span className="smm-reveal-family">{en?familyInfo[particle.family].labelEn:familyInfo[particle.family].label}</span>
      <span className="smm-reveal-art" aria-hidden="true"><ExhibitPreview particle={particle}/></span>
      <b>{particle.symbol}</b><span className="smm-reveal-name">{en?particle.nameEn:particle.name}</span>
      <span className="smm-reveal-caption">{exhibitLabels[particle.scene][en?1:0]}</span>
    </button>
  </dialog>
}
