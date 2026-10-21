import { createClientOnlyFn } from '@tanstack/react-start'

const loadWorldExperiencePrefetch = createClientOnlyFn(() =>
  import('~/lib/world-experience-prefetch.client'),
)

const blackHoleWarmAssets = [
  '/vendor/black-hole/demo.html',
  '/vendor/black-hole/deflection.dat',
  '/vendor/black-hole/doppler.dat',
  '/vendor/black-hole/inverse_radius.dat',
  '/vendor/black-hole/black_body.dat',
  '/vendor/black-hole/sky/pos-x-4-0-0.dat',
  '/vendor/black-hole/sky/neg-x-4-0-0.dat',
  '/vendor/black-hole/sky/pos-y-4-0-0.dat',
  '/vendor/black-hole/sky/neg-y-4-0-0.dat',
  '/vendor/black-hole/sky/pos-z-4-0-0.dat',
  '/vendor/black-hole/sky/neg-z-4-0-0.dat',
] as const

let blackHoleWarmStarted = false

type NavigatorWithConnection = Navigator & {
  connection?: {
    effectiveType?: string
    saveData?: boolean
  }
}

function shouldAvoidWarmup(): boolean {
  if (typeof navigator === 'undefined') return true
  const connection = (navigator as NavigatorWithConnection).connection
  return connection?.saveData === true || connection?.effectiveType === 'slow-2g'
}

export type WarmupGate = {
  /** A world's renderer started loading; warming other worlds now competes with it. */
  hold: (worldId: string) => void
  /** That renderer painted (or gave up); queued warm-ups start after a short settle. */
  release: (worldId: string) => void
  request: (worldId: string, warm: (worldId: string) => void) => void
}

/**
 * Warming the next world fetches its chunk, and often three.js with it. Started
 * while the current world is still downloading, that work splits a slow link
 * with the world the visitor is waiting for. Queue such warm-ups until the
 * current renderer has painted; a hold that is never released expires.
 */
export function createWarmupGate(
  schedule: (run: () => void, delayMs: number) => void,
  { settleMs = 3_000, maxHoldMs = 20_000 }: { settleMs?: number; maxHoldMs?: number } = {},
): WarmupGate {
  let heldFor: string | null = null
  let generation = 0
  const queued = new Map<string, (worldId: string) => void>()

  const gate: WarmupGate = {
    hold(worldId) {
      heldFor = worldId
      const current = ++generation
      schedule(() => {
        if (generation === current) gate.release(worldId)
      }, maxHoldMs)
    },
    release(worldId) {
      if (heldFor !== worldId) return
      heldFor = null
      generation += 1
      if (!queued.size) return
      schedule(() => {
        const pending = [...queued]
        queued.clear()
        for (const [id, warm] of pending) gate.request(id, warm)
      }, settleMs)
    },
    request(worldId, warm) {
      if (heldFor !== null && heldFor !== worldId) {
        queued.set(worldId, warm)
        return
      }
      warm(worldId)
    },
  }
  return gate
}

const warmupGate = createWarmupGate((run, delayMs) => {
  if (typeof window === 'undefined') return
  window.setTimeout(() => {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 2_000 })
    else run()
  }, delayMs)
})

export function holdWorldWarmups(worldId: string): void {
  warmupGate.hold(worldId)
}

export function releaseWorldWarmups(worldId: string): void {
  warmupGate.release(worldId)
}

export function warmWorldOnIntent(worldId: string): void {
  warmupGate.request(worldId, warmWorldNow)
}

function warmWorldNow(worldId: string): void {
  if (typeof document !== 'undefined' && !shouldAvoidWarmup()) {
    void loadWorldExperiencePrefetch()?.then((module) => {
      module.prefetchWorldExperience(worldId)
    }).catch(() => undefined)
  }

  if (worldId !== 'black-hole-flyby' || blackHoleWarmStarted || shouldAvoidWarmup()) return
  blackHoleWarmStarted = true

  for (const asset of blackHoleWarmAssets) {
    void fetch(asset, { credentials: 'same-origin' }).catch(() => undefined)
  }
}

/** Hover, focus, or touch on a discovery card should start the world chunk. */
export function worldIntentHandlers(worldId: string) {
  const warm = () => warmWorldOnIntent(worldId)
  return {
    onMouseEnter: warm,
    onFocus: warm,
    onPointerEnter: warm,
    onTouchStart: warm,
    onPointerDown: warm,
  }
}
