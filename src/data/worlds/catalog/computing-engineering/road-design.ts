import type { WorldExperience } from '../../types'

export default {
  id: 'road-design',
  publication: 'making',
  title: '路口与立交',
  poster: '/assets/posters/road-design.webp',
  posterMobile: '/assets/posters/mobile/road-design.webp',
  posterDesktop: '/assets/posters/desktop/road-design.webp',
  posterTitle: '路口与立交',
  posterHook: '看车流怎样穿过路口、绕上匝道，又在哪里开始排队。',
  posterSource: 'IDM · MOBIL · 参数化道路模拟',
  posterPosition: '50% 50%',
  question: '路口与立交为什么这样设计？',
  hook: '一本会动的道路设计图鉴。观察苜蓿叶、T 字路口和十字路口上的车流，改变需求与信号，看看冲突、等待和交织怎样发生。',
  payoff: '车流使用 IDM 跟车、MOBIL 换道和路口让行模型。道路是按真实量级生成的示意设计，参数未经本地实测标定；冲突点按每方向一条示意流向计算，不含行人、非机动车与掉头。读数用于比较模型行为，不代表真实路口容量或安全评估。',
  topicLabel: '道路设计',
  translations: {
    en: {
      title: 'Junctions & Interchanges',
      posterTitle: 'Junctions & Interchanges',
      posterHook: 'Watch traffic cross junctions, loop onto ramps, and begin to queue.',
      posterSource: 'IDM · MOBIL · Parametric road simulation',
      question: 'Why are junctions and interchanges shaped this way?',
      hook: 'A moving atlas of road design. Observe a cloverleaf, a T-junction, and crossroads; change demand and signals to see conflicts, waiting, and weaving emerge.',
      payoff: 'Traffic uses IDM car following, MOBIL lane changing, and junction yielding models. Roads are schematic designs with realistic dimensions, without local field calibration. Conflict counts use one schematic path per movement and exclude pedestrians, bicycles, and U-turns. Readings compare model behavior; they are not capacity or safety assessments of real junctions.',
      topicLabel: 'Road design',
    },
  },
  primaryCategoryId: 'computing-engineering',
  runtime: 'scene-3d',
  difficulty: 'standard',
  lane: 'flow',
  renderer: 'road-design',
  experiencePolicy: {
    entryMode: 'direct',
    shellMode: 'standard',
  },
  duration: 600,
  evidence: 'modeled',
  accent: '#f3d3a1',
  related: [],
  sources: [
    {
      label: 'Treiber、Hennecke 与 Helbing — IDM 跟车模型（2000）',
      labelEn: 'Treiber, Hennecke & Helbing — IDM car-following model (2000)',
      url: 'https://arxiv.org/abs/cond-mat/0002177',
    },
    {
      label: 'Kesting、Treiber 与 Helbing — MOBIL 换道模型（2007）',
      labelEn: 'Kesting, Treiber & Helbing — MOBIL lane-changing model (2007)',
      url: 'https://akesting.de/download/MOBIL_TRR_2007.pdf',
    },
    {
      label: 'FHWA — 三岔与四岔路口的冲突点',
      labelEn: 'FHWA — Conflict points at three- and four-leg intersections',
      url: 'https://www.fhwa.dot.gov/publications/research/safety/04091/03.cfm',
      note: '第 3.2 节 Figure 17：T 字 9 个，十字 32 个；采用机动车流向示意口径。',
      noteEn: 'Section 3.2, Figure 17: 9 at a T-junction and 32 at a crossroads, using schematic vehicle movements.',
    },
    {
      label: 'FHWA — 基础饱和流率与间隙接受',
      labelEn: 'FHWA — Base saturation flow and gap acceptance',
      url: 'https://www.fhwa.dot.gov/ohim/hpmsmanl/appn6.cfm',
    },
    {
      label: '交通运输部 — 公路立体交叉设计细则',
      labelEn: 'Ministry of Transport — Highway grade-separated intersection design guidelines',
      url: 'https://xxgk.mot.gov.cn/jigou/glj/202006/P020240611387130375167.pdf',
    },
  ],
  provenance: { origin: 'human-led' },
  presentation: 'full-bleed',
  // Required legacy catalog metadata, inherited from the 3D reference world;
  // this value is not used to trim the simulation or impose an asset limit.
  transferBudgetMb: 8,
  fallback: 'text',
} satisfies WorldExperience
