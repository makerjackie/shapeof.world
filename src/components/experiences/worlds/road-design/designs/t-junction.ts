import type { DesignSpec } from '../sim/types'
import { buildUrban, urbanCamera } from './urban'

export const tJunction: DesignSpec = {
  id: 't-junction', name: 'T 字路口', nameEn: 'T-junction', chapter: 1,
  description: '支路的车要等主路留出足够大的空当，才能拐出去。',
  defaultDemand: 650, camera: urbanCamera,
  build: () => buildUrban('t-junction', true, false),
}
