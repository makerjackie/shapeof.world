import type { WorldExperience } from '../../types'

export default {
  id: 'earth-and-nature',
  publication: 'public',
  title: '雨水雕山',
  posterTitle: '把一块地推成山，再下一百万年雨，它会变成什么样？',
  posterHook: '按住地面把它推高，看雨水自己刻出一道道像树枝的山谷。',
  posterSource: '河流功率模型 · Whipple & Tucker 1999',
  question: '把一块地推成山，再下一百万年雨，它会变成什么样？',
  hook: '按住地面把它推高，看雨水自己刻出一道道像树枝的山谷。',
  payoff: '河谷不是谁画上去的：雨水往低处流，越汇越多、越冲越深，自己在山上刻出了树枝的形状。',
  topicLabel: '河流与山',
  poster: '/assets/posters/earth-and-nature.webp',
  posterDesktop: '/assets/posters/desktop/earth-and-nature.webp',
  posterMobile: '/assets/posters/mobile/earth-and-nature.webp',
  posterPosition: '50% 50%',
  translations: {
    en: {
      title: 'Rain Carves the Mountain',
      posterTitle: 'Push up a mountain and let it rain for a million years. What does it become?',
      posterHook: 'Hold the ground to push it up, and watch the rain carve valleys that branch like a tree.',
      posterSource: 'Stream power model · Whipple & Tucker 1999',
      question: 'Push up a mountain and let it rain for a million years. What does it become?',
      hook: 'Hold the ground to push it up, and watch the rain carve valleys that branch like a tree.',
      payoff: 'Nobody draws the valleys. Rain runs downhill, gathers, and cuts deeper the more it gathers, carving the mountain into the shape of a tree.',
      topicLabel: 'Rivers and mountains'
    }
  },
  primaryCategoryId: 'earth-climate',
  runtime: 'scene-3d',
  difficulty: 'intro',
  lane: 'flow',
  renderer: 'earth-and-nature',
  duration: 180,
  evidence: 'modeled',
  accent: '#7fd4e8',
  related: ['frontscope', 'vegetation-atlas'],
  sources: [
    {
      label: 'Whipple & Tucker 1999 · 河流功率模型与山脉的高度上限',
      labelEn: 'Whipple & Tucker 1999 · Stream power incision and the height limits of mountain ranges',
      url: 'https://doi.org/10.1029/1999JB900120'
    },
    {
      label: 'Braun & Willett 2013 · 河流功率方程的隐式 O(n) 解法',
      labelEn: 'Braun & Willett 2013 · An implicit O(n) method for the stream power equation',
      url: 'https://doi.org/10.1016/j.geomorph.2012.10.008'
    },
    {
      label: 'Barnes 等 2014 · 洼地填平的 priority-flood 算法',
      labelEn: 'Barnes et al. 2014 · Priority-flood depression filling',
      url: 'https://doi.org/10.1016/j.cageo.2013.04.024'
    },
    {
      label: 'Dadson 等 2003 · 台湾造山带的侵蚀与抬升',
      labelEn: 'Dadson et al. 2003 · Erosion and uplift in the Taiwan orogen',
      url: 'https://doi.org/10.1038/nature02150'
    }
  ],
  fieldNotes: [
    {
      label: '模型边界',
      labelEn: 'Model limits',
      body: '地形按河流功率模型实时计算：抬升、河流下切和坡面蠕移。地块是程序生成的，不是真实地区；抬升 4 毫米/年、山高两三千米这些量级取自造山带的观测，但岩石可蚀性等参数是为看清过程挑的。没有模拟泥沙堆积、冰川和气候变化。',
      bodyEn: 'The terrain is computed live with the stream power model: uplift, river incision and hillslope creep. The land is procedurally generated, not a real place. Magnitudes such as 4 mm/yr of uplift and peaks of two to three kilometres follow observed mountain belts, but rock erodibility and other parameters were chosen so the process is easy to see. Sediment deposition, glaciers and climate change are not modelled.'
    }
  ],
  experiencePolicy: {
    entryMode: 'direct',
    shellMode: 'minimal'
  },
  provenance: {
    origin: 'ai-prototype',
    initialModel: 'claude-opus-5-5'
  },
  presentation: 'full-bleed',
  transferBudgetMb: 3,
  fallback: 'poster'
} satisfies WorldExperience
