import type { DesignSpec } from '../sim/types'
import { buildUrban, urbanCamera } from './urban'

export const crossroadsSignal: DesignSpec = {
  id: 'crossroads-signal', name: '十字 · 信号灯', nameEn: 'Crossroads · traffic lights', chapter: 1,
  description: '两组车流轮流通过。左转亮绿灯时，仍要等对向直行的车。',
  defaultDemand: 300, camera: urbanCamera,
  build: () => buildUrban('crossroads-signal', false, true),
}
