import type { WorldState } from '../world-state'
import type { WorldExperience } from '../worlds/types'
import { compileWorld } from './compile'
import { isWorldCompilePilot } from './pilots'
import type { WorldIR } from './types'

export function adaptLegacyWorld(
  world: WorldExperience,
  input: {
    state: WorldState
    sourceCommit: string
    releaseId: string
    packId?: string
    offlineAssets?: ReadonlyArray<string>
  },
): WorldIR {
  if (isWorldCompilePilot(world.id)) {
    throw new Error(`${world.id} is a compile pilot and must not use the legacy adapter`)
  }
  return compileWorld({ world, ...input })
}
