import type { WorldExperience } from '../../types'

export default {
  id: 'starry-night',
  publication: 'public',
  title: '星月夜·走进笔触',
  posterTitle: '如果能走进《星月夜》，笔触会有多深？',
  posterHook: '从柏树旁的木屋起飞，穿过街巷与桥洞，飞进有厚度的星空。',
  posterSource: '纽约现代艺术博物馆 · 梵高《星月夜》',
  question: '如果能走进《星月夜》，笔触会有多深？',
  hook: '从柏树旁的木屋起飞，穿过街巷与桥洞，飞进有厚度的星空。',
  payoff: '沿连续航线穿越画中的想象空间，随时接管飞行，点亮村庄，再对照梵高的原作。',
  topicLabel: '绘画与空间',
  poster: '/assets/posters/starry-night.webp',
  posterDesktop: '/assets/posters/desktop/starry-night.webp',
  posterMobile: '/assets/posters/mobile/starry-night.webp',
  posterPosition: '50% 50%',
  translations: {
    en: {
      title: 'Inside The Starry Night',
      posterTitle: 'What lies behind the brushstrokes of The Starry Night?',
      posterHook: 'Launch from the cypress lookout, skim the lanes, pass under the bridge and enter the painted sky.',
      posterSource: 'MoMA · Vincent van Gogh, The Starry Night',
      question: 'What lies behind the brushstrokes of The Starry Night?',
      hook: 'Launch from the cypress lookout, skim the lanes, pass under the bridge and enter the painted sky.',
      payoff: 'Follow a continuous flight, take the controls, light the village and compare this imagined space with Van Gogh’s original.',
      topicLabel: 'Painting and space'
    }
  },
  primaryCategoryId: 'works',
  runtime: 'scene-3d',
  difficulty: 'intro',
  lane: 'flow',
  audioPolicy: 'world-owned',
  renderer: 'starry-night',
  duration: 240,
  evidence: 'modeled',
  accent: '#dfc477',
  related: ['cafe-terrace'],
  sources: [
    {
      label: '纽约现代艺术博物馆 · 梵高《星月夜》',
      labelEn: 'MoMA · Vincent van Gogh, The Starry Night',
      url: 'https://www.moma.org/collection/works/79802'
    }
  ],
  fieldNotes: [
    {
      label: '艺术化边界',
      labelEn: 'Interpretation',
      body: '绘画只给出一个视角。柏树旁的木屋、建筑背面、街巷、河桥和可进入的天空是创作延伸。24 秒航线使用编排的镜头；自由飞行采用简化控制，允许穿过建筑，不是无人机物理模拟、原作扫描或历史实景复原。原作可随时打开对照。',
      bodyEn: 'A painting supplies one viewpoint. The timber lookout, unseen architecture, lanes, river bridge and enterable sky are imagined additions. The 24-second flight is an authored camera path; free flight uses simplified controls and permits passing through buildings. This is not a drone physics simulation, a scan or a historical reconstruction. The original is available for comparison.'
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
