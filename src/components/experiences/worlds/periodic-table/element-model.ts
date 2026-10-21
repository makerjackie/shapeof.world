import reference from './element-reference.json'

// Project-curated CIAAW 2024 factual dataset; no upstream prose or imagery.
export const elements = reference.elements
export type Element = (typeof elements)[number]
export const chineseNames = '氢 氦 锂 铍 硼 碳 氮 氧 氟 氖 钠 镁 铝 硅 磷 硫 氯 氩 钾 钙 钪 钛 钒 铬 锰 铁 钴 镍 铜 锌 镓 锗 砷 硒 溴 氪 铷 锶 钇 锆 铌 钼 锝 钌 铑 钯 银 镉 铟 锡 锑 碲 碘 氙 铯 钡 镧 铈 镨 钕 钷 钐 铕 钆 铽 镝 钬 铒 铥 镱 镥 铪 钽 钨 铼 锇 铱 铂 金 汞 铊 铅 铋 钋 砹 氡 钫 镭 锕 钍 镤 铀 镎 钚 镅 锔 锫 锎 锿 镄 钔 锘 铹 𬬻 𬭊 𬭳 𬭛 𬭶 鿏 𫟼 𬬭 鿔 鿭 𫓧 镆 𫟷 鿬 鿫'.split(' ')
export function phaseAt(temperature: number, meltingPoint: number): 'solid' | 'liquid' | 'coexist' {
  if (!Number.isFinite(temperature) || !Number.isFinite(meltingPoint)) throw new RangeError('Finite temperature required')
  return temperature < meltingPoint ? 'solid' : temperature > meltingPoint ? 'liquid' : 'coexist'
}
export function familyOf(element: Element): string {
  if (element.series === '镧系') return '镧系'
  if (element.series === '锕系') return '锕系'
  if (element.atomicNumber === 1) return '氢'
  if (element.group === 18) return '稀有气体'
  if (element.group === 17) return '卤素'
  if (element.group === 1) return '碱金属'
  if (element.group === 2) return '碱土金属'
  if (element.group && element.group >= 3 && element.group <= 12) return '过渡区元素'
  return '主族元素'
}
export function sameFamily(a: Element, b: Element): boolean {
  if (a.series || b.series) return Boolean(a.series && a.series === b.series)
  return a.group === b.group
}
export function sourceFor(element: Element): string {
  return `https://periodic-table.rsc.org/element/${element.atomicNumber}/${element.name.toLowerCase()}`
}
