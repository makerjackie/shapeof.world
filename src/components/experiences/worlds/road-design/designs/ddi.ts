import type { DesignSpec } from '../sim/types'
import { buildServiceInterchange } from './diamond'

export const ddi: DesignSpec = {
  id: 'ddi', name: '分散式菱形立交', nameEn: 'Diverging diamond interchange', chapter: 2,
  description: '两次交叉，把中间一段换成左侧行驶。上匝道的左转车不用再横穿对向直行。',
  defaultDemand: 300, camera: { position: { x: 285, y: 225, z: 310 }, target: { x: 0, y: 0, z: 0 }, fov: 45 },
  build: () => buildServiceInterchange(true, false),
}
