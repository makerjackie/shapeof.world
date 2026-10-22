import { useEffect, useRef } from 'react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { useI18n } from '~/i18n'
import { useExperienceI18n } from '~/i18n/experience'
import { ParticleAtlas } from './ParticleAtlas'
import { FrontDoor } from './front-door/FrontDoor'
import { museumHash, useMuseumRoute } from './museum-route'
import type { ParticleId } from './particle-data'

export function StandardModel({ controls }: { controls: ExperienceControls }) {
  const route = useMuseumRoute()
  const { locale } = useI18n()
  const tx = useExperienceI18n()
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || root.current?.closest('[data-panel-open="true"]')) return
      if (route.view !== 'museum' || root.current?.querySelector('dialog[open]')) return
      const destination = route.particleId ? museumHash()
        : route.section || route.topicId || route.labId ? museumHash() : null
      if (!destination) return
      event.preventDefault()
      event.stopImmediatePropagation()
      window.location.hash = destination
    }
    window.addEventListener('keydown', dismiss, true)
    return () => window.removeEventListener('keydown', dismiss, true)
  }, [route])
  const select = (id?: ParticleId) => {
    controls.registerInteraction()
    window.location.hash = museumHash(id)
  }
  const enterMuseum = () => {
    controls.registerInteraction()
    window.location.hash = museumHash()
  }
  // The bare URL is the front door: one question in five beats. Every #museum
  // link, old or new, still opens the museum behind it.
  return <div ref={root} role="region" aria-label={tx('基本粒子博物馆')}>
    {route.view === 'journey'
      ? <FrontDoor controls={controls} en={locale === 'en'} onEnterMuseum={enterMuseum} />
      : <ParticleAtlas controls={controls} onSelect={select} />}
  </div>
}
