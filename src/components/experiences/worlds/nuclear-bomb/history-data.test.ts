import {describe, expect, it} from 'vitest'
import snapshot from './history-data.json'
import {annualPeak, annualTotal, HISTORY_DATA, observationAt} from './history-data'

describe('downloaded Our World in Data snapshots', () => {
  it('records redistributable source metadata and the exact downloaded CSVs', () => {
    expect(snapshot.downloadedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    for (const series of [HISTORY_DATA.stockpiles, HISTORY_DATA.tests]) {
      expect(series.source.license).toBe('CC BY 4.0')
      expect(series.source.sha256).toMatch(/^[a-f0-9]{64}$/)
      expect(new URL(series.source.csv).hostname).toBe('ourworldindata.org')
      expect(new URL(series.source.fullMetadata).hostname).toBe('api.ourworldindata.org')
      expect(series.countries.some(({code}) => code === 'OWID_WRL')).toBe(false)
    }
  })

  it('has continuous annual rows with one published observation per country', () => {
    for (const series of [HISTORY_DATA.stockpiles, HISTORY_DATA.tests]) {
      const first = series.rows[0][0]
      expect(series.rows.map(([year]) => year)).toEqual(Array.from({length: series.rows.length}, (_, index) => first + index))
      expect(new Set(series.countries.map(({code}) => code)).size).toBe(series.countries.length)
      for (const [year, values] of series.rows) {
        expect(Number.isInteger(year)).toBe(true)
        expect(values).toHaveLength(series.countries.length)
        for (const value of values) expect(value === null || (Number.isInteger(value) && value >= 0)).toBe(true)
      }
    }
  })

  it('derives each peak year from country sums rather than a remembered historical value', () => {
    for (const series of [HISTORY_DATA.stockpiles, HISTORY_DATA.tests]) {
      const totals = series.rows.map(([year, values]) => ({year, total: values.reduce<number>((sum, value) => sum + (value ?? 0), 0)}))
      const independentlyRanked = [...totals].sort((a, b) => b.total - a.total || a.year - b.year)
      expect(annualPeak(series)).toEqual(independentlyRanked[0])
      expect(annualTotal(observationAt(series, annualPeak(series).year))).toBe(independentlyRanked[0].total)
      expect(annualPeak(series).total).toBeGreaterThan(totals.at(-1)!.total)
    }
  })

  it('keeps unavailable years and missing observations distinct from published zeros', () => {
    expect(observationAt(HISTORY_DATA.tests, HISTORY_DATA.tests.rows.at(-1)![0] + 1)).toBeUndefined()
    expect(annualTotal(undefined)).toBeNull()
    expect(annualTotal([2000, [1, null]])).toBeNull()
    expect(annualTotal([2000, [0, 0]])).toBe(0)
  })
})
