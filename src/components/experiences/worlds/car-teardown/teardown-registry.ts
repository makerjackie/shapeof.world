import { DETAIL_PARTS } from './detail-parts'
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
	drivetrain: [
		...DRIVETRAIN_TEARDOWN.map((p) =>
			p.id === 'drive-differential'
				? {
						...p,
						name: { zh: '差速器壳', en: 'Differential carrier' },
						partIds: ['differential'],
						count: 1,
					}
				: p,
		),
		...DETAIL_PARTS.drivetrain!,
	],
	chassis: [...SUSPENSION_TEARDOWN, ...DETAIL_PARTS.chassis!],
	steering: STEERING_TEARDOWN,
	brakes: [...BRAKE_TEARDOWN, ...DETAIL_PARTS.brakes!],
	electrical: ELECTRICAL_TEARDOWN,
}
export const teardownParts = (system: SystemId | null) => (system ? TEARDOWN_PARTS[system] : [])
