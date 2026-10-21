import type { WorldExperience } from '../../types'

export default {
  id: 'vegetation-atlas',
  publication: 'public',
  title: '植被之间',
  posterTitle: '树冠之下，还有一片世界',
  posterHook: '穿过树冠、林下与根系，比较六种植被场景和季节中的变化。',
  posterSource: '加州大学伯克利分校·森林生物群系',
  question: '同一片土地，为何长出不同的绿色？',
  hook: '穿过树冠、林下与根系，比较六种植被场景和季节中的变化。',
  payoff: '让树冠变透明，走近根系，改变季节，看森林的层次逐一显现。',
  topicLabel: '植被与生境',
  poster: '/assets/posters/vegetation-atlas.webp',
  posterDesktop: '/assets/posters/desktop/vegetation-atlas.webp',
  posterMobile: '/assets/posters/mobile/vegetation-atlas.webp',
  posterPosition: '50% 50%',
  translations: {
    en: {
      title: 'The Living Land',
      posterTitle: 'A world beneath the canopy',
      posterHook: 'Explore canopy, undergrowth and roots; compare six vegetation scenes and seasonal change.',
      posterSource: 'UC Berkeley · Forest biomes',
      question: 'Why do different plants share one landscape?',
      hook: 'Explore canopy, undergrowth and roots; compare six vegetation scenes and seasonal change.',
      payoff: 'Make the canopy transparent, move closer to the roots and change the season to reveal the forest’s layers.',
      topicLabel: 'Vegetation'
    }
  },
  primaryCategoryId: 'earth-climate',
  runtime: 'scene-3d',
  difficulty: 'intro',
  lane: 'flow',
  renderer: 'vegetation-atlas',
  duration: 420,
  evidence: 'modeled',
  accent: '#a9c58a',
  related: [],
  sources: [
    {
      label: '加州大学伯克利分校·森林生物群系',
      labelEn: 'UC Berkeley · Forest biomes',
      url: 'https://ucmp.berkeley.edu/exhibits/biomes/forests.php'
    },
    {
      label: '美国环保署·湿地',
      labelEn: 'US EPA · Wetlands',
      url: 'https://www.epa.gov/wetlands/what-wetland'
    }
  ],
  fieldNotes: [
    {
      label: '模型边界',
      labelEn: 'Model limits',
      body: '植被结构与生境相互关联；季相、海拔和恢复过程是概化示意，湿地是生境分类，并非与森林完全互斥。',
      bodyEn: 'Vegetation structure is linked to its habitat. Seasons, altitude and recovery are schematic; wetlands are habitats and can include forests.'
    }
  ],
  experiencePolicy: {
    entryMode: 'direct',
    shellMode: 'minimal'
  },
  provenance: {
    origin: 'ai-prototype',
    initialModel: 'gpt-6'
  },
  presentation: 'full-bleed',
  transferBudgetMb: 3,
  fallback: 'poster'
} satisfies WorldExperience
