import { Component, type ReactNode } from 'react'
import type { WorldExperience } from '~/data/worlds/types'
import { trackEvent } from '~/lib/analytics'
import { recoverFromChunkError } from '~/lib/chunk-load-recovery'
import { releaseWorldWarmups } from '~/lib/world-prefetch'
import { ExperienceFallback } from './ExperienceFallback'

/** Also wraps the outer client-only import, before the world registry is available. */
export class RendererErrorBoundary extends Component<{
  world: WorldExperience
  children: ReactNode
}, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error) {
    releaseWorldWarmups(this.props.world.id)
    trackEvent({ event: 'experience_error', worldId: this.props.world.id, value: 'error' })
    recoverFromChunkError(error)
    console.error(JSON.stringify({ type: 'oneworld_renderer_error', message: error.message.slice(0, 240) }))
  }
  render() {
    return this.state.failed ? <ExperienceFallback world={this.props.world} reason="error" /> : this.props.children
  }
}
