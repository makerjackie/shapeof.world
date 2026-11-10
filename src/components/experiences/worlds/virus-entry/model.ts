/** Qualitative exhibition choreography. Progress is not biological time.
 * No pathogen-specific sequences, affinities, kinetics or infection predictions. */
export type Route = 'surface' | 'endosome'
export type View = 'journey' | 'particle' | 'membrane' | 'inside'
export const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, Number.isFinite(x) ? x : lo))
export const smooth = (x: number) => { const t = clamp(x); return t * t * (3 - 2 * t) }
export const STAGES = [
  { at: 0, title: '在细胞之外', body: '外面有一层包膜，里面包着遗传物质。表面的蛋白参与识别和进入；画面是一种有包膜病毒的通用示意。' },
  { at: .18, title: '先停靠在表面', body: '细胞膜是一道有选择的边界。表面分子的识别帮助颗粒停靠，停靠与进入是两个不同的阶段。' },
  { at: .36, title: '两条进入路径', body: '有些有包膜病毒在细胞表面融合；另一些先被细胞膜包进囊泡，再与囊泡膜融合。这里并列展示两种常见机制。' },
  { at: .56, title: '两层膜连到一起', body: '融合改变的是两层脂质膜的连接关系。包膜和细胞膜或囊泡膜相接，随后出现连通两侧的通道。' },
  { at: .78, title: '内容物到达胞质', body: '跨膜的关键是遗传物质及相关组分到达细胞质。被囊泡包住仍然处在一个有膜隔开的空间里。' },
  { at: .96, title: '进入之后，还有很长的路', body: '进入不等于完成复制。不同病毒随后走的路线不同；这个世界停在进入与释放，不把一种示意推广到所有病毒。' },
] as const

export const PARTS = [
  { id: 'envelope', name: '脂质包膜', color: '#8ab5b8', body: '两层脂质分子形成柔性的包膜。它与细胞膜属于同一类结构，融合使两道边界的连接关系发生变化。' },
  { id: 'surface', name: '表面蛋白', color: '#d2b48c', body: '包膜上的蛋白参与识别和膜融合。这里的形状是原创示意，没有对应某个病原体的精确分子结构。' },
  { id: 'coat', name: '内部蛋白组分', color: '#b5a8c6', body: '遗传物质通常与蛋白组分一起被包装。不同病毒的组织方式差别很大；这里用一层可拆开的结构帮助辨认。' },
  { id: 'genome', name: '遗传物质', color: '#d8a17c', body: '这条盘绕的链代表核酸，不是真实序列。展示它是为了跟踪内容物在哪里，不用于描述复制或改造。' },
  { id: 'cell', name: '细胞膜', color: '#85a6bd', body: '亲水头部朝向水，疏水部分藏在中间。两片分子层合成一道边界，细胞内外都存在水。' },
  { id: 'vesicle', name: '内吞囊泡', color: '#98b9ac', body: '内吞时，细胞膜向内弯曲并包围颗粒。囊泡里的空间在拓扑上仍与细胞外侧相对应，内容物还没有进入胞质。' },
] as const
export type Part = typeof PARTS[number]['id']

export function frameAt(raw: number, route: Route) {
  const progress = clamp(raw)
  let stage = 0
  for (let i = 1; i < STAGES.length; i++) if (progress >= STAGES[i].at) stage = i
  const approach = smooth(progress / .22)
  const uptake = route === 'endosome' ? smooth((progress - .3) / .24) : 0
  const fusion = smooth((progress - .56) / .18)
  const release = smooth((progress - .76) / .2)
  const virusY = route === 'surface' ? 2.8 - approach * 1.58 - fusion * .22 : 2.8 - approach * 1.58 - uptake * 3.3
  return { progress, stage, approach, uptake, fusion, release, virusY,
    pore: .04 + .32 * fusion, vesicleVisible: route === 'endosome' && progress > .32,
    hasReachedCytoplasm: release > .2,
  }
}

export function advanceProgress(progress: number, elapsed: number, speed: number) {
  // One display pass takes 70 wall-clock seconds at 1×, deliberately unrelated to biological time.
  return clamp(progress + clamp(elapsed, 0, .1) * clamp(speed, .1, 8) / 70)
}

export function fibonacciSphere(count: number, radius = 1): [number, number, number][] {
  const n = Math.max(1, Math.floor(count))
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - 2 * (i + .5) / n, angle = i * Math.PI * (3 - Math.sqrt(5)), r = Math.sqrt(1 - y * y)
    return [Math.cos(angle) * r * radius, y * radius, Math.sin(angle) * r * radius]
  })
}
