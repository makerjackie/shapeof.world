import type { WorldState } from '../world-state'
import type { WorldExperience } from '../worlds/types'
import {
  compileWorld as compileWorldImpl,
  contentRevisionOf as contentRevisionOfImpl,
  inferRuntimeCapabilities as inferRuntimeCapabilitiesImpl,
  lifecycleFromState as lifecycleFromStateImpl,
  omitsAuthorPrivateFields as omitsAuthorPrivateFieldsImpl,
  projectOfflineWorldRecord as projectOfflineWorldRecordImpl,
  projectPublicWorldCard as projectPublicWorldCardImpl,
  projectPublicWorldDetail as projectPublicWorldDetailImpl,
  projectWorldSearchDocument as projectWorldSearchDocumentImpl,
  worldAuthorPrivateFields as worldAuthorPrivateFieldsImpl,
} from '../../../scripts/lib/compile-world.mjs'
import type {
  OfflineWorldRecord,
  PublicWorldCard,
  PublicWorldDetail,
  RuntimeCapability,
  WorldIR,
  WorldLifecycle,
  WorldSearchDocument,
} from './types'

export const worldAuthorPrivateFields = worldAuthorPrivateFieldsImpl as unknown as readonly [
  'transferBudgetMb',
  'onboardingVersion',
  'hasEmbeddedGuide',
]

export function lifecycleFromState(state: WorldState): WorldLifecycle {
  return lifecycleFromStateImpl(state) as WorldLifecycle
}

export function inferRuntimeCapabilities(
  world: Pick<WorldExperience, 'runtime' | 'id'>,
): RuntimeCapability[] {
  return inferRuntimeCapabilitiesImpl(world) as RuntimeCapability[]
}

export function contentRevisionOf(value: unknown): string {
  return contentRevisionOfImpl(value)
}

export function compileWorld(input: {
  world: WorldExperience
  state: WorldState
  sourceCommit: string
  releaseId: string
  packId?: string
  offlineAssets?: ReadonlyArray<string>
}): WorldIR {
  return compileWorldImpl(input) as WorldIR
}

export function projectPublicWorldCard(ir: WorldIR): PublicWorldCard {
  return projectPublicWorldCardImpl(ir) as PublicWorldCard
}

export function projectPublicWorldDetail(ir: WorldIR): PublicWorldDetail {
  return projectPublicWorldDetailImpl(ir) as PublicWorldDetail
}

export function projectWorldSearchDocument(ir: WorldIR): WorldSearchDocument {
  return projectWorldSearchDocumentImpl(ir) as WorldSearchDocument
}

export function projectOfflineWorldRecord(ir: WorldIR, packId?: string): OfflineWorldRecord {
  return projectOfflineWorldRecordImpl(ir, packId) as OfflineWorldRecord
}

export function omitsAuthorPrivateFields(value: object): boolean {
  return omitsAuthorPrivateFieldsImpl(value)
}
