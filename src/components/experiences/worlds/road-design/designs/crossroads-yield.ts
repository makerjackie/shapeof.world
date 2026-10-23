import type { DesignSpec } from '../sim/types'
import { buildUrban, urbanCamera } from './urban'

export const crossroadsYield: DesignSpec = {
  id: 'crossroads-yield', name: '十字 · 无信号', nameEn: 'Crossroads · give way', chapter: 1,
  description: '转弯让直行，相对方向的右转车让左转车；没有优先道路时，让右侧来车。',
  defaultDemand: 125, camera: urbanCamera,
  build: () => buildUrban('crossroads-yield', false, false),
}
