import type { Path } from '../types'

export default {
  id: 'sky-optics',
  slug: 'physics-overhead',
  publication: 'draft',
  title: '抬头看见的物理',
  titleEn: 'Physics Overhead',
  description: '蓝天、彩虹、日晕、泡膜彩纹、偏振与极光，都是同一束阳光被空气、水和冰改写的样子。',
  descriptionEn: 'Blue skies, rainbows, halos, soap films, polarization, and auroras are one beam of sunlight rewritten by air, water, and ice.',
  worldIds: ["rainbow","aurora"],
  stopLabels: [{"zh":"彩虹","en":"Rainbow"},{"zh":"极光","en":"Aurora"}],
  order: 5,
} satisfies Path
