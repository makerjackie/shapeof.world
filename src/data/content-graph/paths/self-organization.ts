import type { Path } from '../types'

export default {
  id: 'self-organization',
  slug: 'order-without-a-leader',
  publication: 'draft',
  title: '没有指挥的秩序',
  titleEn: 'Order Without a Leader',
  description: '鸟群、萤火虫、黏菌、蚁巢、街区与细胞自动机——没有谁在指挥，秩序自己长出来。',
  descriptionEn: 'Flocks, fireflies, slime molds, ant nests, neighborhoods, and cellular automata: no one is in charge, yet order grows on its own.',
  worldIds: ["boids-flocking"],
  stopLabels: [{"zh":"鸟群","en":"Flocks"}],
  order: 4,
} satisfies Path
