import type { DesignSpec } from '../sim/types'
import { buildDirectionalInterchange } from './freeway-kit'
export const buildStack = () => buildDirectionalInterchange('stack')
export const stack: DesignSpec = {
	id: 'stack',
	name: '四层堆叠式立交',
	nameEn: 'Four-level stack',
	chapter: 3,
	description: '直行分居底下两层，左转沿上面两层定向匝道通过。没有交织，代价是更高的桥和更多桥面。',
	defaultDemand: 4800,
	camera: { position: { x: 340, y: 190, z: 420 }, target: { x: 0, y: 12, z: 0 }, fov: 54 },
	build: buildStack,
}
