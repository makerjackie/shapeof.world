import type { WorldExperience } from '../../types'

export default {
  id: 'p-versus-np',
  publication: 'public',
  title: 'P 与 NP：找答案，验答案',
  posterTitle: '答案好验，也好找吗？',
  posterHook: '一根金线，连接一个关于计算的百万美元问题。',
  posterSource: 'Clay Mathematics Institute · P vs NP',
  question: '能够快速核对的答案，也一定能快速找到吗？',
  hook: '在珐琅节点间连起一根金线。亲手感受找路时的试探，以及核对一份答案时的直接。',
  payoff: 'P 与 NP 追问：所有能在多项式时间核对肯定答案的问题，是否也都能在多项式时间解决。小图的穷举很慢，不能证明所有算法都慢。',
  topicLabel: 'P 与 NP 问题',
  primaryCategoryId: 'essence-of-math',
  accent: '#a38a47',
  related: ['riemann-primes'],
  translations: {
    en: {
      title: 'P vs NP: find it, check it',
      posterTitle: 'Easy to check. Easy to find?',
      posterHook: 'One golden thread and a million-dollar question about computation.',
      posterSource: 'Clay Mathematics Institute · P vs NP',
      question: 'If an answer is quick to check, must it be quick to find?',
      hook: 'Connect porcelain nodes with a golden thread. Feel the contrast between searching for a route and checking one already supplied.',
      payoff: 'P vs NP asks whether every decision problem with polynomial-time verifiable yes-certificates can also be solved in polynomial time. Slow brute force on a small graph cannot show that every algorithm must be slow.',
      topicLabel: 'The P vs NP problem'
    }
  },
  sources: [
    {
      label: '克雷数学研究所 · P 与 NP',
      labelEn: 'Clay Mathematics Institute · P vs NP',
      url: 'https://www.claymath.org/millennium/p-vs-np/'
    },
    {
      label: 'Stephen Cook · 官方问题陈述',
      labelEn: 'Stephen Cook · Official problem description',
      url: 'https://www.claymath.org/wp-content/uploads/2022/06/pvsnp.pdf'
    }
  ],
  fieldNotes: [
    {
      label: '模型与边界',
      labelEn: 'Model and limits',
      body: '本世界演示有限无向图的哈密顿路径：沿现有边走遍每个节点且恰好一次；这不同于普通最短路。图预先保证有解，展示的是实际深度优先回溯和证书核验。节点位置与时间经过艺术化安排，搜索步骤包含前进和回退。n! 只是所有节点排列数，并非任何算法必须执行的步骤下界。',
      bodyEn: 'This world illustrates Hamiltonian paths in finite undirected graphs: visit every vertex exactly once along existing edges. This differs from ordinary shortest paths. Graphs are constructed with a known solution; the displayed search is actual depth-first backtracking. Layout and timing are artistic. Search steps include advances and retreats. n! counts all vertex permutations, not a lower bound on every algorithm.'
    },
    {
      label: 'NP 的含义',
      labelEn: 'What NP means',
      body: 'P 是多项式时间可解的判定问题类。NP 是其肯定答案具有多项式长度、可在多项式时间核验的证书的问题类，P 包含于 NP。NP 的英文是 nondeterministic polynomial time，不是 non-polynomial。快与慢说的是输入变大时的渐近增长，不等于某一台机器上几秒钟。',
      bodyEn: 'P contains decision problems solvable in polynomial time. NP contains those whose yes-instances admit polynomial-length certificates verifiable in polynomial time; P is contained in NP. NP stands for nondeterministic polynomial time, not non-polynomial. Efficiency concerns asymptotic growth with input size, not seconds on a particular device.'
    },
    {
      label: '问题状态',
      labelEn: 'Problem status',
      body: '2026 年 9 月 11 日核对时，克雷数学研究所仍将 P 与 NP 列为未解决。这里的路径演示不构成关于 P 等于或不等于 NP 的证明。',
      bodyEn: 'When checked on September 11, 2026, Clay Mathematics Institute listed P vs NP as unsolved. This route demonstration is not a proof that P equals or differs from NP.'
    }
  ],
  runtime: 'diagram-2d',
  difficulty: 'intro',
  lane: 'structure',
  duration: 60,
  evidence: 'modeled',
  experiencePolicy: {
    entryMode: 'guided',
    shellMode: 'standard',
    guideStyle: 'demo'
  },
  provenance: {
    origin: 'ai-prototype',
    initialModel: 'gpt-6'
  },
  presentation: 'full-bleed',
  transferBudgetMb: 1,
  fallback: 'poster',
  renderer: 'p-versus-np',
  poster: '/assets/posters/p-versus-np.webp',
  posterDesktop: '/assets/posters/desktop/p-versus-np.webp',
  posterMobile: '/assets/posters/mobile/p-versus-np.webp',
  posterPosition: '50% 50%'
} satisfies WorldExperience
