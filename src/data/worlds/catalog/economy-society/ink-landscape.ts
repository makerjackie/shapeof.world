import type { WorldExperience } from '../../types'
export default {
  id: 'ink-landscape',
  publication: 'public',
  title: '松溪入画',
  posterTitle: '如果飞进水墨，留白里有什么？', posterHook: '掠过渔舟、穿桥入巷，再升入群山，回望整幅松溪。',
  posterSource: '原创水墨山水 · 绘画空间实验', question: '如果飞进水墨，留白里有什么？',
  hook: '掠过渔舟、穿桥入巷，再升入群山，回望整幅松溪。',
  payoff: '亲手飞过松亭与村巷，或跟随一镜到底的航线，随时转向探索自己的山水。', topicLabel: '水墨与空间',
  poster: '/assets/posters/ink-landscape.webp', posterDesktop: '/assets/posters/desktop/ink-landscape.webp', posterMobile: '/assets/posters/mobile/ink-landscape.webp',
  posterPosition: '50% 50%',
  translations: { en: {
    title: 'Songxi: Into the Ink', posterTitle: 'What lies in the empty space of an ink landscape?',
    posterHook: 'Sweep over a fishing boat, through bridges and village lanes, then rise into the mountains and look back over Songxi.', posterSource: 'Original ink landscape · A spatial painting experiment',
    question: 'What lies in the empty space of an ink landscape?', hook: 'Sweep over a fishing boat, through bridges and village lanes, then rise into the mountains and look back over Songxi.',
    payoff: 'Fly through pavilions and village lanes yourself, or follow a continuous tour and take the controls whenever you like.', topicLabel: 'Ink and space',
  } },
  primaryCategoryId: 'economy-society', runtime: 'scene-3d', difficulty: 'intro', lane: 'flow', renderer: 'ink-landscape', duration: 180,
  evidence: 'modeled', accent: '#53695c', related: ['starry-night'],
  sources: [
    { label: '普林斯顿大学艺术博物馆 · 宋代山水画', labelEn: 'Princeton University Art Museum · Chinese landscape painting', url: 'https://static.artmuseum.princeton.edu/asian-art/china/resources/landscape-painting/' },
    { label: '亚洲艺术博物馆 · 中国山水画的发展', labelEn: 'Asian Art Museum · The development of landscape painting in China', url: 'https://education.asianart.org/resources/the-development-of-landscape-painting-in-china-the-song-through-the-ming-dynasties/' },
  ],
  fieldNotes: [
    { label: '原创空间', labelEn: 'An original space', body: '这是一幅以三维几何、原创皴笔纹理和程序笔触创作的水墨山水，不复原某一幅古画，也不代表真实地形。浓淡、遮挡和留白借鉴水墨绘画的空间表达。以原创母画《松溪入画》为基准，松亭、水道、桥洞、村落和前后层叠的山峰处于同一三维空间。原画视角以外的空间由创作补全，山峰为可接近的实体，树叶采用分布于三维枝干上的绘画片层。飞行采用 22.8 秒编排航线，末段从中低视点回望层叠山水；自由漫游是简化控制，允许穿过山体，不是无人机物理模拟。', bodyEn: 'This original ink landscape uses three-dimensional geometry, original ink textures and procedural marks. It does not reconstruct a historical painting or a real terrain. Ink values, occlusion and empty space draw on landscape painting practices. Based on the original painting Songxi: Into the Ink, the pavilion, river, arch bridge, village and overlapping mountain ranges share one three-dimensional space. Areas beyond the painting’s viewpoint are creative additions. The peaks are approachable volumes; painted foliage cards are distributed along three-dimensional branches. The 22.8-second flight follows an authored path with a low climbing return and a layered landscape finish; free roaming uses simplified controls and permits passing through terrain, rather than simulating drone physics.' },
  ],
  provenance: { origin: 'ai-prototype', initialModel: 'gpt-6' },
  experiencePolicy: { entryMode: 'direct', shellMode: 'minimal' }, presentation: 'full-bleed', transferBudgetMb: 3, fallback: 'poster',
} satisfies WorldExperience
