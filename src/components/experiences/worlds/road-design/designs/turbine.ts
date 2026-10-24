import type { DesignSpec } from '../sim/types'
import { buildDirectionalInterchange } from './freeway-kit'
export const buildTurbine = () => buildDirectionalInterchange('turbine')
export const turbine: DesignSpec = {
	id: 'turbine',
	name: '涡轮立交',
	nameEn: 'Turbine interchange',
	chapter: 3,
	description: '左转沿着中心向外旋开，用更长、更舒展的匝道避开交织。高速不断流，桥也铺得更远。',
	defaultDemand: 4800,
	camera: { position: { x: 410, y: 240, z: 480 }, target: { x: 0, y: 10, z: 0 }, fov: 55 },
	build: buildTurbine,
}
