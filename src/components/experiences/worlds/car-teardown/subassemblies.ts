import {
	AUXILIARY_TEARDOWN_GEOMETRY as A,
	VEHICLE_SPEC as S,
	TRANSMISSION_GEOMETRY as G,
} from './vehicle-spec'
import { TEARDOWN_PARTS } from './teardown-registry'
import { bilingual as b, type TeardownText, type TeardownDefinition } from './teardown-types'
import type { SystemId } from './parts'
export type AssemblyId =
	| 'brake-front'
	| 'brake-rear'
	| 'hydraulics'
	| 'gearbox'
	| 'propshaft'
	| 'rear-axle'
	| 'susp-front'
	| 'susp-rear'
	| 'rack'
	| 'column'
	| 'knolling'
export type Assembly = {
	id: AssemblyId
	system: SystemId
	name: TeardownText
	size: number
	view: readonly [number, number, number]
	ids: readonly string[]
	offsets: Record<string, readonly [number, number, number]>
}
// Dimensionless extraction lanes are scaled by the actual assembly, never by car length.
const brakeIds = [
	'brake-knuckle',
	'brake-hub',
	'brake-discs',
	'brake-carriers',
	'brake-castings',
	'brake-pistons',
	'brake-seals',
	'brake-pads',
	'brake-guide-pins',
	'brake-boots',
]
const brakeLanes = {
	'brake-knuckle': [0, 0, -0.12],
	'brake-hub': [0, 0, 0.05],
	'brake-carriers': [0, 0, 0.15],
	'brake-pistons': [0, 0, 0.25],
	'brake-seals': [0, 0, 0.33],
	'brake-pads': [0, 0, 0.43],
	'brake-discs': [0, 0, 0.56],
	'brake-castings': [0, 0, 1.04],
	'brake-guide-pins': [0, 0, 1.36],
	'brake-boots': [0, 0, 1.6],
} as const
const suspensionLanes = {
	'susp-top': [-0.85, 0.12, 0],
	'susp-springs': [-0.85, 0, 0],
	'susp-dampers': [0.85, 0, 0],
	'susp-knuckles': [0, 0, 0.12],
	'susp-ball': [0.35, -0.05, 0.25],
	'susp-arms': [-0.35, -0.03, -0.2],
	'susp-links': [-0.35, -0.03, -0.2],
	'susp-drop-link': [0.95, -0.05, 0],
	'susp-hubs': [0, 0, 0.55],
} as const
export const ASSEMBLIES: readonly Assembly[] = [
	{
		id: 'brake-front',
		system: 'brakes',
		name: b('前轮制动角', 'Front brake corner'),
		size: S.brakes.front.diameter,
		view: [1.6, 0.65, 0.75],
		ids: brakeIds,
		offsets: brakeLanes,
	},
	{
		id: 'brake-rear',
		system: 'brakes',
		name: b('后轮制动角', 'Rear brake corner'),
		size: S.brakes.rear.diameter,
		view: [1.6, 0.65, 0.75],
		ids: brakeIds,
		offsets: brakeLanes,
	},
	{
		id: 'hydraulics',
		system: 'brakes',
		name: b('液压', 'Hydraulics'),
		size: 0.65,
		view: [1, 0.65, 1.6],
		ids: ['brake-pedal-group', 'brake-booster', 'brake-master', 'brake-fluid', 'brake-abs'],
		offsets: {
			'brake-pedal-group': [-0.12, 0, 0],
			'brake-booster': [0.04, 0, 0],
			'brake-master': [0.25, 0, 0],
			'brake-fluid': [0.22, 0.2, 0],
			'brake-abs': [0.5, 0.18, 0.15],
		},
	},
	{
		id: 'gearbox',
		system: 'drivetrain',
		name: b('离合器和变速箱', 'Clutch & gearbox'),
		size: G.inputFrontX - G.caseRearX,
		view: [1, 0.65, 1.8],
		ids: [
			'drive-flywheel',
			'drive-disc',
			'drive-pressure',
			'drive-release',
			'drive-case-front',
			'drive-case-rear',
			'drive-input',
			'drive-layshaft',
			'drive-output',
			'drive-sleeves',
			'drive-forks',
			'drive-idler',
			'drive-bearings',
		],
		offsets: {
			'drive-flywheel': [0.55, 0, 0],
			'drive-disc': [0.42, 0, 0],
			'drive-pressure': [0.28, 0, 0],
			'drive-release': [0.16, 0, 0],
			'drive-case-front': [0.04, 0.32, -0.22],
			'drive-case-rear': [-0.15, 0.3, -0.22],
			'drive-input': [0.2, 0.1, 0.15],
			'drive-output': [-0.22, 0, 0.12],
			'drive-layshaft': [0.16, -0.2, 0],
			'drive-sleeves': [-0.22, 0.16, 0.2],
			'drive-forks': [-0.22, 0.36, 0.23],
			'drive-idler': [-0.16, -0.17, 0.18],
			'drive-bearings': [-0.15, -0.2, -0.08],
		},
	},
	{
		id: 'propshaft',
		system: 'drivetrain',
		name: b('传动轴', 'Propeller shaft'),
		size: Math.abs(S.transmission.outputX - S.transmission.driveshaftEndX),
		view: [0.4, 0.8, 1.8],
		ids: ['drive-prop', 'drive-joints'],
		offsets: { 'drive-prop': [0, 0, 0], 'drive-joints': [0.16, 0, 0] },
	},
	{
		id: 'rear-axle',
		system: 'drivetrain',
		name: b('后桥', 'Rear axle'),
		size: A.drivetrain.detailHalfSpan * 2,
		view: [1.4, 0.9, 1],
		ids: [
			'drive-axle',
			'drive-pinion',
			'drive-ring',
			'drive-differential',
			'drive-side-gears',
			'drive-planets',
			'drive-cross',
			'drive-halfshafts',
		],
		offsets: {
			'drive-axle': [0, 0.18, 0.12],
			'drive-pinion': [0.2, 0, 0],
			'drive-ring': [0, 0, -0.13],
			'drive-differential': [0, 0.2, 0],
			'drive-side-gears': [0, 0, 0.1],
			'drive-planets': [0, 0.09, 0.06],
			'drive-cross': [0, 0.02, 0.1],
			'drive-halfshafts': [0, 0, 0.18],
		},
	},
	{
		id: 'susp-front',
		system: 'chassis',
		name: b('前悬一个角', 'Front suspension corner'),
		size: S.dimensions.height * 0.49,
		view: [0.1, 0.6, 1.6],
		ids: [
			'susp-top',
			'susp-springs',
			'susp-dampers',
			'susp-knuckles',
			'susp-arms',
			'susp-ball',
			'susp-drop-link',
			'susp-hubs',
		],
		offsets: suspensionLanes,
	},
	{
		id: 'susp-rear',
		system: 'chassis',
		name: b('后悬一个角', 'Rear suspension corner'),
		size: S.dimensions.height * 0.49,
		view: [0.1, 0.6, 1.6],
		ids: ['susp-links', 'susp-knuckles', 'susp-springs', 'susp-dampers', 'susp-hubs'],
		offsets: { ...suspensionLanes, 'susp-springs': [0.65, 0, 0], 'susp-dampers': [-0.65, 0, 0] },
	},
	{
		id: 'rack',
		system: 'steering',
		name: b('转向机', 'Steering rack'),
		size: S.wheels.frontTrack,
		view: [1.6, 0.6, 0.5],
		ids: ['steer-housing', 'steer-pinion', 'steer-rackbar', 'steer-gaiters', 'steer-ties'],
		offsets: {
			'steer-housing': [0, -0.08, 0],
			'steer-pinion': [0.12, 0.12, 0],
			'steer-rackbar': [0.06, 0.06, 0.15],
			'steer-gaiters': [0, 0.04, 0.12],
			'steer-ties': [0.03, -0.02, 0.13],
		},
	},
	{
		id: 'column',
		system: 'steering',
		name: b('转向柱', 'Steering column'),
		size: 1.1,
		view: [-0.5, 0.5, 1.8],
		ids: ['steer-wheel', 'steer-column', 'steer-intermediate', 'steer-universals', 'steer-assist'],
		offsets: {
			'steer-wheel': [-0.1, 0.14, 0],
			'steer-column': [-0.03, 0.04, 0],
			'steer-intermediate': [0.02, -0.06, 0],
			'steer-universals': [0, 0.16, 0.06],
			'steer-assist': [0, 0.15, 0.12],
		},
	},
	{
		id: 'knolling',
		system: 'electrical',
		name: b('电气平铺', 'Electrical layout'),
		size: 2.4,
		view: [0.2, 1.7, 1.1],
		ids: TEARDOWN_PARTS.electrical.filter((p) => p.id !== 'electrical-harness').map((p) => p.id),
		offsets: {},
	},
]
export const assemblyFor = (system: SystemId | null, id?: string) =>
	ASSEMBLIES.find((a) => a.system === system && a.id === id) ??
	ASSEMBLIES.find((a) => a.system === system)
export function assemblyParts(a: Assembly): TeardownDefinition[] {
	return a.ids.map((id) => {
		const p = TEARDOWN_PARTS[a.system].find((p) => p.id === id)!
		const counts: Record<string, number> | null = a.id.startsWith('brake-')
			? { 'brake-pads': 2, 'brake-guide-pins': 2, 'brake-boots': 2 }
			: a.system === 'chassis'
				? { 'susp-links': 5 }
				: null
		const oneCorner = a.id.startsWith('brake-') || a.system === 'chassis'
		const rear = a.id === 'brake-rear'
		return {
			...p,
			name:
				a.system === 'chassis' && id === 'susp-knuckles' ? b('转向节', 'Steering knuckle') : p.name,
			count: oneCorner ? (counts?.[id] ?? 1) : p.count,
			offset: (a.offsets[id] ?? [0, 0, 0]).map((n) => n * a.size) as [number, number, number],
			data:
				a.id === 'rear-axle' && (id === 'drive-halfshafts' || id === 'drive-axle')
					? [
							...p.data,
							{ label: b('画面', 'View'), value: b('远端截短示意', 'Outer ends shortened') },
						]
					: rear && id === 'brake-discs'
						? [{ label: b('直径 / 厚度', 'Diameter / thickness'), value: '300 / 12 mm' }]
						: p.data,
		}
	})
}
