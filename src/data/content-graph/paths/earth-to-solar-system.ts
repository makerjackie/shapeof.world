import type { Path } from '../types'

export default {
  id: 'earth-to-solar-system',
  slug: 'earth-to-solar-system',
  publication: 'public',
  title: '从地球到银河系',
  titleEn: 'From Earth to the Milky Way',
  description: '从地球上的昼夜与四季出发，观察日地月之间的遮挡与影子，再拉远看太阳系的运动，最后探索银河系与仙女座相遇的模拟。',
  descriptionEn: 'Begin with day, night and seasons on Earth, explore the shadows behind solar and lunar eclipses, then step back to watch the Solar System move and explore a simulated encounter between the Milky Way and Andromeda.',
  worldIds: ['earth-spin-orbit', 'eclipses', 'solar-system', 'galaxy-collision'],
  stopLabels: [
    { zh: '地球', en: 'Earth' },
    { zh: '日食与月食', en: 'Eclipses' },
    { zh: '太阳系', en: 'Solar System' },
    { zh: '星系碰撞', en: 'Galaxy Encounter' },
  ],
  order: 8,
} satisfies Path
