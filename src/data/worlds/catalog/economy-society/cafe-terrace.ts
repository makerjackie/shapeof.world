import type { WorldExperience } from '../../types'

export default {
  id: 'cafe-terrace',
  publication: 'public',
  title: '夜间露天咖啡座',
  posterTitle: '梵高画框外的街道，通向哪里？',
  posterHook: '走过暖黄灯光下的桌椅，转进小巷，再从屋顶回看夜色。',
  posterSource: '克勒勒-米勒博物馆 · 夜间露天咖啡座',
  question: '梵高画框外的街道，通向哪里？',
  hook: '走过暖黄灯光下的桌椅，转进小巷，再从屋顶回看夜色。',
  payoff: '在行走、环顾与自动巡游中，对照绘画的平面构图和想象空间。',
  topicLabel: '绘画与空间',
  poster: '/assets/posters/cafe-terrace.webp',
  posterDesktop: '/assets/posters/desktop/cafe-terrace.webp',
  posterMobile: '/assets/posters/mobile/cafe-terrace.webp',
  posterPosition: '50% 50%',
  translations: {
    en: {
      title: 'Café Terrace at Night',
      posterTitle: 'Where does the street beyond Van Gogh’s frame lead?',
      posterHook: 'Walk among tables in warm lamplight, turn into an alley and look back over the rooftops.',
      posterSource: 'Kröller-Müller Museum · Terrace of a Café at Night',
      question: 'Where does the street beyond Van Gogh’s frame lead?',
      hook: 'Walk among tables in warm lamplight, turn into an alley and look back over the rooftops.',
      payoff: 'Walk, look around and follow a camera tour to compare pictorial composition with an imagined three-dimensional space.',
      topicLabel: 'Painting and space'
    }
  },
  primaryCategoryId: 'economy-society',
  runtime: 'scene-3d',
  difficulty: 'intro',
  lane: 'flow',
  audioPolicy: 'world-owned',
  renderer: 'cafe-terrace',
  duration: 240,
  evidence: 'modeled',
  accent: '#dfc477',
  related: ['starry-night'],
  sources: [
    {
      label: '克勒勒-米勒博物馆 · 夜间露天咖啡座',
      labelEn: 'Kröller-Müller Museum · Terrace of a Café at Night',
      url: 'https://www.krollermuller.nl/en/modern-art-museum-netherlands'
    }
  ],
  fieldNotes: [
    {
      label: '艺术化边界',
      labelEn: 'Interpretation',
      body: '绘画只给出一个视角。本场景的建筑背面、街巷、河流与可进入的天空包含创作补充，不是原作扫描、历史实景复原或物理模拟。',
      bodyEn: 'A painting shows one viewpoint. Unseen architecture, streets, rivers and the enterable sky include invented extensions. This is not a scan of the original, a historical reconstruction or a physical simulation.'
    }
  ],
  provenance: {
    origin: 'ai-prototype',
    initialModel: 'gpt-6'
  },
  experiencePolicy: {
    entryMode: 'direct',
    shellMode: 'minimal'
  },
  presentation: 'full-bleed',
  transferBudgetMb: 2,
  fallback: 'poster'
} satisfies WorldExperience
