import snapshot from './history-data.json'

export type AnnualRow = [year: number, values: Array<number | null>]
export type HistorySeries = {
  title: string
  countries: Array<{code: string; name: string}>
  rows: AnnualRow[]
  source: {csv: string; metadata: string; fullMetadata: string; license: string; producer: string; citation: string; originalSource: string; datasetVersion: string; sha256: string}
}
export const HISTORY_DATA = snapshot as unknown as {downloadedAt: string; format: string; stockpiles: HistorySeries; tests: HistorySeries}

/** Missing observations are never silently treated as zero. */
export function annualTotal(row: AnnualRow | undefined): number | null {
  if (!row || row[1].some((value) => value === null)) return null
  return row[1].reduce<number>((sum, value) => sum + (value ?? 0), 0)
}

export function annualPeak(series: HistorySeries): {year: number; total: number} {
  return series.rows.reduce((peak, row) => {
    const total = annualTotal(row)
    return total !== null && total > peak.total ? {year: row[0], total} : peak
  }, {year: series.rows[0]?.[0] ?? 0, total: -1})
}

export function observationAt(series: HistorySeries, year: number): AnnualRow | undefined {
  return series.rows.find((row) => row[0] === year)
}

export const STOCKPILE_PEAK = annualPeak(HISTORY_DATA.stockpiles)
export const TEST_PEAK = annualPeak(HISTORY_DATA.tests)
