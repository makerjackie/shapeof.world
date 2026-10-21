import type { WorldExperience } from '../../types'

export default {
  id: 'earth-and-nature',
  publication: 'public',
  title: '地球与自然',
  posterTitle: '地表从来没有停止变化',
  posterHook: '从火山熔岩到冰川裂隙，在立体地貌中观察形成、侵蚀与沉积。',
  posterSource: '美国国家公园管理局·地貌',
  question: '山川为何一直在改变？',
  hook: '从火山熔岩到冰川裂隙，在立体地貌中观察形成、侵蚀与沉积。',
  payoff: '触发喷发，展开剖面，改变演化阶段；地形与运动一起响应。',
  topicLabel: '地貌演化',
  poster: '/assets/posters/earth-and-nature.webp',
  posterDesktop: '/assets/posters/desktop/earth-and-nature.webp',
  posterMobile: '/assets/posters/mobile/earth-and-nature.webp',
  posterPosition: '50% 50%',
  translations: {
    en: {
      title: 'Earth & Nature',
      posterTitle: 'Earth’s surface is always changing',
      posterHook: 'From lava flows to glacier crevasses, explore formation, erosion and deposition in three dimensions.',
      posterSource: 'National Park Service · Landforms',
      question: 'What keeps reshaping the land?',
      hook: 'From lava flows to glacier crevasses, explore formation, erosion and deposition in three dimensions.',
      payoff: 'Trigger an eruption, reveal a cross-section and change the stage of evolution. Terrain and motion respond together.',
      topicLabel: 'Landforms'
    }
  },
  primaryCategoryId: 'earth-climate',
  runtime: 'scene-3d',
  difficulty: 'intro',
  lane: 'flow',
  renderer: 'earth-and-nature',
  duration: 420,
  evidence: 'modeled',
  accent: '#73c7cb',
  related: [],
  sources: [
    {
      label: '美国国家公园管理局·地貌',
      labelEn: 'National Park Service · Landforms',
      url: 'https://www.nps.gov/subjects/geology/landforms.htm'
    },
    {
      label: '美国国家公园管理局·火山喷发',
      labelEn: 'National Park Service · Volcanic eruptions',
      url: 'https://www.nps.gov/subjects/volcanoes/volcanic-eruptions.htm'
    },
    {label: '冰川与冰蚀地貌', labelEn: 'Glaciers and glacial landforms', url: 'https://www.nps.gov/subjects/geology/glacial-landforms.htm'},
    {label: '喀斯特景观', labelEn: 'Karst landscapes', url: 'https://www.nps.gov/subjects/caves/karst-landscapes.htm'},
    {label: '风成地貌', labelEn: 'Aeolian landforms', url: 'https://www.nps.gov/subjects/geology/aeolian-landforms.htm'},
    {label: '海岸地貌', labelEn: 'Coastal landforms', url: 'https://www.nps.gov/subjects/geology/coastal-landforms.htm'}
  ],
  fieldNotes: [
    {
      label: '模型边界',
      labelEn: 'Model limits',
      body: '地貌由内外营力共同塑造。程序化场景是定性教学示意，时间和尺度经过压缩，不用于灾害预测。',
      bodyEn: 'Internal and external forces shape landforms. Procedural scenes are qualitative teaching models with compressed scales and time; they are not hazard forecasts.'
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
