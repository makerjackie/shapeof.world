import type { DesignSpec } from '../sim/types'
import { buildDirectionalInterchange } from './freeway-kit'
export const buildStack = () => buildDirectionalInterchange('stack')
export const stack: DesignSpec = {
	id: 'stack',
	name: '四层堆叠式立交',
	nameEn: 'Four-level stack',
	chapter: 3,
	description: '四条左转匝道直接越过中心，车辆不用交织。省下绕环的路程，换来更高的桥和更多桥面。',
	defaultDemand: 4800,
	camera: { position: { x: 340, y: 190, z: 420 }, target: { x: 0, y: 12, z: 0 }, fov: 54 },
	build: buildStack,
}
