import { describe, expect, it } from 'vitest'
import {
  PROFILES,
  formatLength,
  formatLifetimes,
  formatMoney,
  hiddenTax,
  lifetimeSpend,
  lifetimesIn,
  secondsPerLifetime,
  stackHeight,
  type Flow,
} from './money-model'
import { storyCopy } from './story-copy'

const profiles = Object.values(PROFILES)
const flows = (id: 'cn' | 'us'): Array<Flow> => [PROFILES[id].basket, ...PROFILES[id].items]

describe('follow-the-money supply-chain splits', () => {
  for (const profile of profiles) {
    for (const flow of flows(profile.id)) {
      it(`${profile.id}/${flow.id} accounts for every unit of 100`, () => {
        expect(flow.total.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 1)
        expect(flow.total).toHaveLength(profile.dests.length)
        let arriving = 100
        for (const hop of flow.hops) {
          const kept = hop.keep.reduce((a, b) => a + b, 0)
          // What a hop keeps plus what it passes upstream is what reached it.
          expect(kept + hop.pass).toBeCloseTo(arriving, 1)
          expect(hop.pass).toBeLessThan(arriving)
          arriving = hop.pass
        }
        const summed = profile.dests.map((_, i) => flow.hops.reduce((s, h) => s + h.keep[i], 0) + flow.tail[i])
        summed.forEach((value, i) => expect(value).toBeCloseTo(flow.total[i], 1))
      })
    }
  }

  it('keeps the headline China basket split from the 2023 input-output table', () => {
    const [wages, profit, depreciation, tax, imports] = PROFILES.cn.basket.total
    expect(wages).toBeCloseTo(45.3, 1)
    expect(profit).toBeCloseTo(20.5, 1)
    expect(depreciation).toBeCloseTo(14.4, 1)
    expect(tax).toBeCloseTo(6.8, 1)
    expect(imports).toBeCloseTo(13.0, 1)
  })

  it('shows different roads for different purchases', () => {
    const item = (id: string) => PROFILES.cn.items.find((f) => f.id === id)!
    expect(item('cigarettes').total[3]).toBeGreaterThan(50)
    expect(item('fuel').total[4]).toBeGreaterThan(40)
    expect(item('school').total[0]).toBeGreaterThan(70)
    expect(PROFILES.us.items.find((f) => f.id === 'phone')!.total[3]).toBeGreaterThan(60)
  })
})

describe('follow-the-money lifetime and ruler', () => {
  it('derives a lifetime from official spending and life expectancy', () => {
    expect(lifetimeSpend(PROFILES.cn)).toBeCloseTo(35869 * 79.25, 0)
    expect(lifetimeSpend(PROFILES.us)).toBeCloseTo(((78535 - 9797 - 2292) / 2.4) * 79, 0)
  })

  it('stacks 100-unit notes at 0.1 mm, one micrometre per unit', () => {
    expect(stackHeight(10000)).toBeCloseTo(0.01, 6)
    expect(stackHeight(lifetimeSpend(PROFILES.cn))).toBeCloseTo(2.84, 2)
    expect(stackHeight(1401879e8) / 1000).toBeCloseTo(140188, 0)
  })

  it('measures companies, defense and GDP in lifetimes', () => {
    const cn = PROFILES.cn
    const tencent = cn.ruler.find((r) => r.id === 'tencent-day')!
    expect(lifetimesIn(cn, tencent.amount)).toBeGreaterThan(700)
    expect(secondsPerLifetime(cn, cn.defense.amount)).toBeCloseTo(49.5, 0)
    expect(secondsPerLifetime(PROFILES.us, PROFILES.us.defense.amount)).toBeGreaterThan(70)
    expect(secondsPerLifetime(PROFILES.us, PROFILES.us.defense.amount)).toBeLessThan(80)
    expect(cn.pair.right.profit).toBeGreaterThan(cn.pair.left.profit)
    expect(cn.pair.left.revenue).toBeGreaterThan(cn.pair.right.revenue * 10)
  })

  it('estimates hidden tax and its defense share with stated rates', () => {
    const tax = hiddenTax(PROFILES.cn)
    expect(tax.share).toBeCloseTo(0.0681, 3)
    expect(tax.amount / 1e4).toBeCloseTo(19.4, 0)
    expect(tax.defenseShare).toBeCloseTo(18106.23 / 287243.42, 6)
    expect(tax.defenseFromHiddenTax / 1e4).toBeCloseTo(1.22, 1)
    expect(tax.perCapitaDefense / 1e4).toBeCloseTo(10.2, 0)
  })
})

describe('follow-the-money formatting and copy', () => {
  it('formats money, lengths and counts for both languages', () => {
    expect(formatMoney(2842618, PROFILES.cn, 'zh')).toBe('284 万元')
    expect(formatMoney(2842618, PROFILES.cn, 'en')).toBe('¥2.84 million')
    expect(formatMoney(916.6e9, PROFILES.us, 'en')).toBe('$917 billion')
    expect(formatMoney(159000, PROFILES.us, 'en')).toBe('$159,000')
    expect(formatLength(140188e3, 'zh')).toBe('14 万公里')
    expect(formatLength(2.84, 'en')).toBe('2.84 m')
    expect(formatLength(0.0122, 'zh')).toBe('1.2 厘米')
    expect(formatLifetimes(49.3e6, 'en')).toBe('49.3 million lifetimes')
    expect(formatLifetimes(725.2, 'zh')).toBe('725 个一辈子')
  })

  it('writes six complete story steps per profile and language', () => {
    for (const profile of profiles) {
      for (const locale of ['zh', 'en'] as const) {
        const lines = storyCopy(profile, locale)
        expect(lines).toHaveLength(6)
        for (const line of lines) {
          expect(`${line.title} ${line.body}`).not.toMatch(/NaN|undefined|Infinity/)
          if (locale === 'en') expect(`${line.title} ${line.body}`).not.toMatch(/[㐀-鿿]/u)
        }
      }
    }
  })
})
