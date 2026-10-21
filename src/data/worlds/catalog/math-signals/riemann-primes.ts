import type { WorldExperience } from '../../types'

export default {
  id: 'riemann-primes',
  publication: 'public',
  title: '素数，藏着怎样的节奏？',
  posterTitle: '素数，藏着怎样的节奏？',
  posterHook: '素数的起伏，为什么会与另一条线上看不见的零点有关？',
  posterSource: '精确素数与加权计数 · 有限零点近似',
  question: '不规则的素数间距，能被另一种数学结构描述吗？',
  hook: '金色素数光珠展开成阶梯，紫色零点波一层层加入。看见黎曼猜想连接的两件事。',
  payoff: '黎曼猜想断言 ζ 函数的全部非平凡零点都在实部 1/2 的直线上。它关系到素数偏离平均分布的幅度；有限计算不等于证明。',
  topicLabel: '黎曼猜想',
  poster: '/assets/posters/riemann-primes.webp',
  posterMobile: '/assets/posters/mobile/riemann-primes.webp',
  posterDesktop: '/assets/posters/desktop/riemann-primes.webp',
  posterPosition: '50% 50%',
  translations: {
    en: {
      title: 'What rhythm hides in the primes?',
      posterTitle: 'What rhythm hides in the primes?',
      posterHook: 'Why are prime fluctuations linked to zeros on another mathematical line?',
      posterSource: 'Exact primes and weighted counts · Finite zero approximation',
      question: 'Can another mathematical structure describe the uneven gaps between primes?',
      hook: 'Golden prime pearls unfold into a staircase as violet zero waves join it. See the two sides of the Riemann hypothesis.',
      payoff: 'The Riemann hypothesis says that every nontrivial zero of the zeta function has real part 1/2. It concerns fluctuations in prime distribution; finite computation is not a proof.',
      topicLabel: 'Riemann hypothesis'
    }
  },
  primaryCategoryId: 'beautiful-math',
  runtime: 'diagram-2d',
  difficulty: 'intro',
  lane: 'structure',
  renderer: 'riemann-primes',
  experiencePolicy: {
    entryMode: 'autoplay',
    shellMode: 'minimal'
  },
  duration: 90,
  evidence: 'modeled',
  accent: '#bda1ed',
  related: [],
  sources: [
    {
      label: '克雷数学研究所：黎曼猜想',
      labelEn: 'Clay Mathematics Institute: Riemann hypothesis',
      url: 'https://www.claymath.org/millennium/riemann-hypothesis/'
    },
    {
      label: 'Bombieri：官方问题说明',
      labelEn: 'Bombieri: official problem description',
      url: 'https://www.claymath.org/wp-content/uploads/2022/05/riemann.pdf'
    },
    {
      label: 'NIST DLMF：ζ 函数零点',
      labelEn: 'NIST DLMF: zeros of the zeta function',
      url: 'https://dlmf.nist.gov/25.10'
    }
  ],
  fieldNotes: [
    {
      label: '画面怎么算',
      labelEn: 'What is computed',
      body: '素数用筛法精确枚举。加权计数 ψ(x) 在每个素数幂 pᵏ 处增加 ln p；画面画出 ψ(x)−x，不能把它当作普通素数计数 π(x)。',
      bodyEn: 'Primes are enumerated by an exact sieve. The weighted count ψ(x) increases by ln p at each prime power pᵏ. The plotted quantity is ψ(x)−x, not the ordinary prime count π(x).'
    },
    {
      label: '零点与近似',
      labelEn: 'Zeros and approximation',
      body: '紫色曲线使用前 20 对数值零点代入显式公式：ψ(x)≈x−Σρ x^ρ/ρ−ln(2π)−½ln(1−x⁻²)。共轭零点成对求和；跳点处公式取左右极限的平均，有限截断会振铃。零点坐标保留约 12 位小数。',
      bodyEn: 'Violet curves use the first 20 numerical conjugate zero pairs in the explicit formula ψ(x)≈x−Σρ x^ρ/ρ−ln(2π)−½ln(1−x⁻²). At jumps the formula takes the mean of the two limits; finite truncation causes ringing. Zero coordinates are rounded to about 12 decimal places.'
    },
    {
      label: '空间与时间',
      labelEn: 'Space and time',
      body: '开场螺旋只是把整数数轴盘起来，并不表示素数存在螺旋定律。波的前后层次只为分开不同部分和。时间轴控制确定的叙事画面；暂停会冻结全部运动。',
      bodyEn: 'The opening spiral is a coiled integer number line, not a spiral law for primes. Depth separates partial sums. The timeline reconstructs a deterministic narrative frame; pausing freezes all motion.'
    },
    {
      label: '证明的边界',
      labelEn: 'What remains open',
      body: '截至本次制作核对，克雷数学研究所仍将黎曼猜想列为未解决。已知零点支持猜想，但任何有限清单都不能代替覆盖所有非平凡零点的证明。',
      bodyEn: 'At the source check for this world, the Clay Mathematics Institute still lists the Riemann hypothesis as unsolved. Known zeros support it, but a finite list cannot establish a claim about every nontrivial zero.'
    }
  ],
  provenance: {
    origin: 'ai-prototype',
    initialModel: 'gpt-6'
  },
  presentation: 'full-bleed',
  transferBudgetMb: 1,
  fallback: 'poster'
} satisfies WorldExperience
