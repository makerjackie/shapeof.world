import { useEffect, useRef } from 'react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { ParticleAtlas } from './ParticleAtlas'
import { museumHash, useMuseumRoute } from './museum-route'
import type { ParticleId } from './particle-data'

export function StandardModel({ controls }: { controls: ExperienceControls }) {
  const route = useMuseumRoute()
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
  return <div ref={root}>
    <ParticleAtlas controls={controls} onSelect={select} />
  </div>
}
