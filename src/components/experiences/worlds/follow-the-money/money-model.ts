import cnFlows from './data/cn-flows.json'
import usFlows from './data/us-flows.json'
import type { Dest, ProfileId } from './art/palette'

export type Locale = 'zh' | 'en'
export type Bilingual = { zh: string; en: string }

export type Hop = {
  /** Value added kept at this hop and imports paid, in profile destination order. */
  keep: ReadonlyArray<number>
  /** Money passed one hop further up the supply chain. */
  pass: number
  /** Largest receivers at this hop: sector code and yuan/dollars. */
  who: ReadonlyArray<readonly [string, number]>
}

export type Flow = {
  id: string
  label: Bilingual
  hops: ReadonlyArray<Hop>
  /** Everything beyond the drawn hops, by destination. */
  tail: ReadonlyArray<number>
  total: ReadonlyArray<number>
}

export type Category = { id: string; label: Bilingual; annual: number }

export type RulerTarget = {
  id: string
  label: Bilingual
  /** Money in the profile currency. */
  amount: number
  /** One short line shown beside the column. */
  note?: Bilingual
}

export type ProfilePair = {
  label: Bilingual
  left: { name: Bilingual; revenue: number; profit: number }
  right: { name: Bilingual; revenue: number; profit: number }
}

export type Profile = {
  id: ProfileId
  name: Bilingual
  symbol: '¥' | '$'
  dests: ReadonlyArray<Dest>
  annualSpend: number
  lifeExpectancy: number
  categories: ReadonlyArray<Category>
  basket: Flow
  items: ReadonlyArray<Flow>
  sectors: Record<string, Bilingual>
  ruler: ReadonlyArray<RulerTarget>
  pair: ProfilePair
  /** Defense outlays per year and the matching total budget. */
  defense: { amount: number; budget: number; population: number }
  /** Hidden taxes: share of a lifetime of spending that is net production tax. */
  incomeTaxShareOfTaxRevenue?: number
}

/** Banknote thickness used for every stack: 0.1 mm, i.e. 100 notes ≈ 1 cm. */
export const NOTE_THICKNESS_M = 0.0001
export const NOTE_VALUE = 100
/** One unit of currency stacked as 100-unit notes = one micrometre. */
export const METRES_PER_UNIT = NOTE_THICKNESS_M / NOTE_VALUE
export const MOON_DISTANCE_KM = 384400

type RawFlow = { id: string; zh?: string; en?: string; hops: Array<{ keep: number[]; pass: number; who: Array<Array<string | number>> }>; tail: number[]; total: number[] }

function toFlow(raw: RawFlow, fallback: Bilingual): Flow {
  return {
    id: raw.id,
    label: raw.zh && raw.en ? { zh: raw.zh, en: raw.en } : fallback,
    hops: raw.hops.map((h) => ({ keep: h.keep, pass: h.pass, who: h.who.map(([c, v]) => [String(c), Number(v)] as const) })),
    tail: raw.tail,
    total: raw.total,
  }
}

function sectorTable(raw: Record<string, Array<string>>): Record<string, Bilingual> {
  return Object.fromEntries(Object.entries(raw).map(([code, [zh, en]]) => [code, { zh, en }]))
}

const average: Bilingual = { zh: '平均的一张', en: 'An average note' }

/**
 * China: NBS 2025 urban per-capita consumption (35,869 yuan) × 2025 life
 * expectancy (79.25 years); splits from the NBS 2023 input-output table.
 */
const cn: Profile = {
  id: 'cn',
  name: { zh: '中国城镇居民', en: 'Urban China' },
  symbol: '¥',
  dests: ['wages', 'profit', 'depreciation', 'tax', 'imports'],
  annualSpend: 35869,
  lifeExpectancy: 79.25,
  categories: [
    { id: 'food', label: { zh: '吃喝烟酒', en: 'Food, drink, tobacco' }, annual: 10155 },
    { id: 'housing', label: { zh: '住', en: 'Housing' }, annual: 8095 },
    { id: 'transport', label: { zh: '交通通信', en: 'Transport and phone' }, annual: 5251 },
    { id: 'culture', label: { zh: '教育文化娱乐', en: 'Education and leisure' }, annual: 4298 },
    { id: 'health', label: { zh: '医疗保健', en: 'Health' }, annual: 2932 },
    { id: 'home', label: { zh: '家用品和服务', en: 'Household goods' }, annual: 2033 },
    { id: 'clothes', label: { zh: '衣着', en: 'Clothing' }, annual: 1941 },
    { id: 'other', label: { zh: '其他', en: 'Other' }, annual: 1164 },
  ],
  basket: toFlow(cnFlows.basket as RawFlow, average),
  items: (cnFlows.items as Array<RawFlow>).map((item) => toFlow(item, average)),
  sectors: sectorTable(cnFlows.sectors),
  ruler: [
    { id: 'life', label: { zh: '你的一辈子', en: 'Your lifetime' }, amount: 0 },
    { id: 'tencent-day', label: { zh: '腾讯一天的收入', en: 'Tencent revenue, one day' }, amount: 751766e6 / 365, note: { zh: '2025 年营收 7,518 亿元', en: '2025 revenue ¥751.8 billion' } },
    { id: 'moutai-profit', label: { zh: '茅台一年的净利润', en: 'Kweichow Moutai profit, one year' }, amount: 82320067101.68, note: { zh: '2025 年归母净利润', en: '2025 net profit' } },
    { id: 'defense', label: { zh: '全国一年的国防支出', en: 'China defense spending, one year' }, amount: 18106.23e8, note: { zh: '2025 年决算', en: '2025 final accounts' } },
    { id: 'sinopec-revenue', label: { zh: '中国石化一年的营收', en: 'Sinopec revenue, one year' }, amount: 2783583e6, note: { zh: '2025 年', en: '2025' } },
    { id: 'gdp', label: { zh: '中国一年的 GDP', en: 'China GDP, one year' }, amount: 1401879e8, note: { zh: '2025 年初步核算', en: '2025 preliminary' } },
  ],
  pair: {
    label: { zh: '营收大，不等于赚得多', en: 'Bigger sales, smaller profit' },
    left: { name: { zh: '中国石化', en: 'Sinopec' }, revenue: 2783583e6, profit: 31809e6 },
    right: { name: { zh: '贵州茅台', en: 'Kweichow Moutai' }, revenue: 172054171890.91, profit: 82320067101.68 },
  },
  defense: { amount: 18106.23e8, budget: 287243.42e8, population: 14.0489e8 },
  incomeTaxShareOfTaxRevenue: 16186.83 / 176369.11,
}

/**
 * United States: BLS CE 2024 spending per consumer unit excluding personal
 * insurance, pensions and cash contributions, divided by 2.4 people, times
 * NCHS 2024 life expectancy (79.0); splits from the BEA 2025 summary tables.
 */
export const US_SPENDING_PER_CONSUMER_UNIT = 78535 - 9797 - 2292
export const US_PEOPLE_PER_CONSUMER_UNIT = 2.4
const usPerPerson = (value: number) => value / US_PEOPLE_PER_CONSUMER_UNIT

const us: Profile = {
  id: 'us',
  name: { zh: '美国人', en: 'United States' },
  symbol: '$',
  dests: ['wages', 'surplus', 'tax', 'imports'],
  annualSpend: usPerPerson(US_SPENDING_PER_CONSUMER_UNIT),
  lifeExpectancy: 79.0,
  categories: [
    { id: 'housing', label: { zh: '住', en: 'Housing' }, annual: usPerPerson(26266) },
    { id: 'transport', label: { zh: '交通', en: 'Transportation' }, annual: usPerPerson(13318) },
    { id: 'food', label: { zh: '吃喝烟酒', en: 'Food, drink, tobacco' }, annual: usPerPerson(10169 + 643 + 352) },
    { id: 'health', label: { zh: '医疗保健', en: 'Healthcare' }, annual: usPerPerson(6197) },
    { id: 'culture', label: { zh: '教育娱乐阅读', en: 'Education and leisure' }, annual: usPerPerson(3609 + 1569 + 125) },
    { id: 'other', label: { zh: '个人护理和其他', en: 'Personal care and other' }, annual: usPerPerson(978 + 1218) },
    { id: 'clothes', label: { zh: '衣着', en: 'Apparel' }, annual: usPerPerson(2001) },
  ],
  basket: toFlow(usFlows.basket as RawFlow, average),
  items: (usFlows.items as Array<RawFlow>).map((item) => toFlow(item, average)),
  sectors: sectorTable(usFlows.sectors),
  ruler: [
    { id: 'life', label: { zh: '你的一辈子', en: 'Your lifetime' }, amount: 0 },
    { id: 'apple-day', label: { zh: '苹果一天的营收', en: 'Apple sales, one day' }, amount: 416161e6 / 365, note: { zh: '2025 财年营收 4,162 亿美元', en: 'FY2025 net sales $416.2 billion' } },
    { id: 'walmart-day', label: { zh: '沃尔玛一天的营收', en: 'Walmart revenue, one day' }, amount: 713163e6 / 365, note: { zh: '2026 财年营收 7,132 亿美元', en: 'FY2026 revenue $713.2 billion' } },
    { id: 'defense', label: { zh: '美国一年的国防支出', en: 'U.S. national defense, one year' }, amount: 916.6e9, note: { zh: '2025 财年实际支出', en: 'FY2025 outlays' } },
    { id: 'federal', label: { zh: '美国联邦一年的总支出', en: 'All federal outlays, one year' }, amount: 7010.0e9, note: { zh: '2025 财年', en: 'FY2025' } },
    { id: 'gdp', label: { zh: '美国一年的 GDP', en: 'U.S. GDP, one year' }, amount: 30861.3e9, note: { zh: '2025 年', en: '2025' } },
  ],
  pair: {
    label: { zh: '营收大，不等于赚得多', en: 'Bigger sales, smaller profit' },
    left: { name: { zh: '沃尔玛', en: 'Walmart' }, revenue: 713163e6, profit: 21893e6 },
    right: { name: { zh: '苹果', en: 'Apple' }, revenue: 416161e6, profit: 112010e6 },
  },
  defense: { amount: 916.6e9, budget: 7010.0e9, population: 341.944e6 },
}

export const PROFILES: Record<ProfileId, Profile> = { cn, us }

export function lifetimeSpend(profile: Profile): number {
  return profile.annualSpend * profile.lifeExpectancy
}

export function stackHeight(amount: number): number {
  return amount * METRES_PER_UNIT
}

export function lifetimesIn(profile: Profile, amount: number): number {
  return amount / lifetimeSpend(profile)
}

/** Seconds of a yearly flow that equal one lifetime of spending. */
export function secondsPerLifetime(profile: Profile, annualAmount: number): number {
  return (lifetimeSpend(profile) / annualAmount) * 365 * 24 * 3600
}

export function destShare(flow: Flow, profile: Profile, dest: Dest): number {
  const index = profile.dests.indexOf(dest)
  return index < 0 ? 0 : flow.total[index] / 100
}

export function lifetimeByDest(profile: Profile): Array<{ dest: Dest; amount: number }> {
  const life = lifetimeSpend(profile)
  return profile.dests.map((dest, i) => ({ dest, amount: (life * profile.basket.total[i]) / 100 }))
}

/** Taxes inside prices over a lifetime, and the slice that funds defense when spent like the budget. */
export function hiddenTax(profile: Profile) {
  const lifetime = lifetimeSpend(profile)
  const share = destShare(profile.basket, profile, 'tax')
  const amount = lifetime * share
  const defenseShare = profile.defense.amount / profile.defense.budget
  const perCapitaDefense = (profile.defense.amount / profile.defense.population) * profile.lifeExpectancy
  return { share, amount, defenseShare, defenseFromHiddenTax: amount * defenseShare, perCapitaDefense }
}

export function rulerAmount(profile: Profile, target: RulerTarget): number {
  return target.id === 'life' ? lifetimeSpend(profile) : target.amount
}

// ---------------------------------------------------------------- formatting

function trim(value: number, digits: number): string {
  return Number(value.toFixed(digits)).toLocaleString('en-US', { maximumFractionDigits: digits })
}

function sig(value: number): number {
  const abs = Math.abs(value)
  return abs >= 100 ? 0 : abs >= 10 ? 1 : 2
}

export function formatMoney(amount: number, profile: Profile, locale: Locale): string {
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '−' : ''
  if (locale === 'zh') {
    const unit = profile.id === 'cn' ? '元' : '美元'
    if (abs >= 1e12) return `${sign}${trim(abs / 1e12, sig(abs / 1e12))} 万亿${unit}`
    if (abs >= 1e8) return `${sign}${trim(abs / 1e8, sig(abs / 1e8))} 亿${unit}`
    if (abs >= 1e4) return `${sign}${trim(abs / 1e4, sig(abs / 1e4))} 万${unit}`
    return `${sign}${trim(abs, abs >= 100 ? 0 : 1)} ${unit}`
  }
  const s = profile.symbol
  if (abs >= 1e12) return `${sign}${s}${trim(abs / 1e12, sig(abs / 1e12))} trillion`
  if (abs >= 1e9) return `${sign}${s}${trim(abs / 1e9, sig(abs / 1e9))} billion`
  if (abs >= 1e6) return `${sign}${s}${trim(abs / 1e6, sig(abs / 1e6))} million`
  if (abs >= 1e4) return `${sign}${s}${(Math.round(abs / 1000) * 1000).toLocaleString('en-US')}`
  return `${sign}${s}${trim(abs, abs >= 100 ? 0 : 1)}`
}

/** Money per 100 units of spending, e.g. "¥45.3" or "$42.0". */
export function formatPer100(value: number, profile: Profile): string {
  const sign = value < 0 ? '−' : ''
  return `${sign}${profile.symbol}${Math.abs(value).toFixed(Math.abs(value) >= 10 ? 0 : 1)}`
}

export function formatLength(metres: number, locale: Locale): string {
  if (metres < 1) {
    const cm = metres * 100
    return locale === 'zh' ? `${trim(cm, cm >= 10 ? 0 : 1)} 厘米` : `${trim(cm, cm >= 10 ? 0 : 1)} cm`
  }
  if (metres < 1000) return locale === 'zh' ? `${trim(metres, sig(metres))} 米` : `${trim(metres, sig(metres))} m`
  const km = metres / 1000
  if (locale === 'zh' && km >= 1e4) return `${trim(km / 1e4, sig(km / 1e4))} 万公里`
  return locale === 'zh' ? `${trim(km, sig(km))} 公里` : `${trim(km, km >= 1000 ? 0 : sig(km))} km`
}

export function formatLifetimes(count: number, locale: Locale): string {
  if (locale === 'zh') {
    if (count >= 1e8) return `${trim(count / 1e8, sig(count / 1e8))} 亿个一辈子`
    if (count >= 1e4) return `${trim(count / 1e4, sig(count / 1e4))} 万个一辈子`
    return `${trim(count, count >= 10 ? 0 : 1)} 个一辈子`
  }
  if (count >= 1e6) return `${trim(count / 1e6, sig(count / 1e6))} million lifetimes`
  if (count >= 1e3) return `${Math.round(count).toLocaleString('en-US')} lifetimes`
  return `${trim(count, count >= 10 ? 0 : 1)} ${count === 1 ? 'lifetime' : 'lifetimes'}`
}

export function formatDuration(seconds: number, locale: Locale): string {
  if (seconds < 90) return locale === 'zh' ? `${Math.round(seconds)} 秒` : `${Math.round(seconds)} seconds`
  const minutes = seconds / 60
  if (minutes < 90) return locale === 'zh' ? `${trim(minutes, 1)} 分钟` : `${trim(minutes, 1)} minutes`
  const hours = minutes / 60
  return locale === 'zh' ? `${trim(hours, 1)} 小时` : `${trim(hours, 1)} hours`
}

export function hopLabel(n: number, locale: Locale): string {
  return locale === 'zh' ? `第 ${n} 站 · 往上游` : `Stop ${n} · upstream`
}

export function yearLabel(n: number, locale: Locale): string {
  return locale === 'zh' ? `第 ${n} 年` : `Year ${n}`
}

export function pick(text: Bilingual, locale: Locale): string {
  return text[locale]
}
