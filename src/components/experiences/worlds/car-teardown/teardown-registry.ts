import { ENGINE_PARTS } from './engine-parts'
import { BODY_TEARDOWN } from './body-teardown'
import { BRAKE_TEARDOWN, STEERING_TEARDOWN, SUSPENSION_TEARDOWN } from './road-teardown'
import { DRIVETRAIN_TEARDOWN } from './drivetrain-teardown'
import { ELECTRICAL_TEARDOWN } from './electrical-teardown'
import type { TeardownDefinition } from './teardown-types'
import type { SystemId } from './parts'

export const TEARDOWN_PARTS: Record<SystemId, readonly TeardownDefinition[]> = {
	body: BODY_TEARDOWN,
	powertrain: ENGINE_PARTS,
	drivetrain: DRIVETRAIN_TEARDOWN,
	chassis: SUSPENSION_TEARDOWN,
	steering: STEERING_TEARDOWN,
	brakes: BRAKE_TEARDOWN,
	electrical: ELECTRICAL_TEARDOWN,
}
export const teardownParts = (system: SystemId | null) => (system ? TEARDOWN_PARTS[system] : [])
