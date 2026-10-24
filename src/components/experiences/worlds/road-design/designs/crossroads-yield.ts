import type { DesignSpec } from '../sim/types'
import { buildUrban, urbanCamera } from './urban'

export const crossroadsYield: DesignSpec = {
  id: 'crossroads-yield', name: '十字 · 无信号', nameEn: 'Crossroads · give way', chapter: 1,
  description: '十六处交叉挤在中央，车辆要轮流寻找空当。转弯让直行，没有优先道路时让右侧来车。',
  defaultDemand: 125, camera: urbanCamera,
  build: () => buildUrban('crossroads-yield', false, false),
}
