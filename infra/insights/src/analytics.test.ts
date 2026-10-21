import { describe, expect, it } from 'vitest'

import { buildDashboardData, isRetiredWorld, isWorldRow, normalizeDays, signalForWorld, weightedQuantile } from './analytics'

describe('Insights analytics model', () => {
  it('allows only the supported rolling windows', () => {
    expect(normalizeDays('7')).toBe(7)
    expect(normalizeDays('30')).toBe(30)
    expect(normalizeDays('90')).toBe(90)
    expect(normalizeDays('365')).toBe(7)
    expect(normalizeDays(null)).toBe(7)
  })

  it('does not diagnose small samples', () => {
    expect(signalForWorld(
      { visits: 9, retention30Rate: 0, interactionRate: 0, deepPlayRate: 0, timeoutRate: 0, errorRate: 0 },
      { retention30Rate: 0.6, interactionRate: 0.6, deepPlayRate: 0.4 },
    )).toBe('low-sample')
  })

  it('separates technical, immersion, onboarding and strong signals', () => {
    const baseline = { retention30Rate: 0.6, interactionRate: 0.6, deepPlayRate: 0.4 }
    expect(signalForWorld(
      { visits: 20, retention30Rate: 0.6, interactionRate: 0.6, deepPlayRate: 0.4, timeoutRate: 0.05, errorRate: 0 }, baseline,
    )).toBe('technical')
    expect(signalForWorld(
      { visits: 20, retention30Rate: 0.4, interactionRate: 0.6, deepPlayRate: 0.3, timeoutRate: 0, errorRate: 0 }, baseline,
    )).toBe('immersion')
    expect(signalForWorld(
      { visits: 20, retention30Rate: 0.6, interactionRate: 0.4, deepPlayRate: 0.3, timeoutRate: 0, errorRate: 0 }, baseline,
    )).toBe('onboarding')
    expect(signalForWorld(
      { visits: 20, retention30Rate: 0.7, interactionRate: 0.72, deepPlayRate: 0.51, timeoutRate: 0, errorRate: 0 }, baseline,
    )).toBe('strong')
  })

  it('calculates weighted dwell-time quantiles in the Worker', () => {
    const rows = [
      { value: 10, weight: 1 },
      { value: 20, weight: 3 },
      { value: 30, weight: 2 },
    ]
    expect(weightedQuantile(rows, 0.5)).toBe(20)
    expect(weightedQuantile(rows, 0.75)).toBe(30)
    expect(weightedQuantile([], 0.5)).toBeNull()
  })

  it('keeps worlds removed from the catalog in world metrics', () => {
    const catalog = new Map([
      ['solar-system', { id: 'solar-system', title: '太阳系', titleEn: 'Solar system', poster: '' }],
      ['black-hole', { id: 'black-hole', title: '黑洞', titleEn: 'Black hole', poster: '', retired: true }],
    ])

    expect(isWorldRow({ world: 'solar-system' })).toBe(true)
    expect(isWorldRow({ world: 'never-catalogued' })).toBe(true)
    expect(isWorldRow({})).toBe(false)
    expect(isRetiredWorld('solar-system', catalog)).toBe(false)
    expect(isRetiredWorld('black-hole', catalog)).toBe(true)
    expect(isRetiredWorld('never-catalogued', catalog)).toBe(true)
  })

  it('reports historical events of removed worlds with a stored title or the raw id', async () => {
    const worldRow = (world: string, visits: number) => ({
      world, visits, reached5s: visits, reached15s: visits, reached30s: visits, interacted: visits,
      guide_shown: 0, guide_complete: 0, saved: 0, shared: 0, timeouts: 0, error_visits: 0,
    })
    const query = async (sql: string) => (
      sql.includes('error_visits') && sql.includes("NOW() - INTERVAL '7' DAY AND timestamp < NOW()")
        ? [worldRow('solar-system', 30), worldRow('black-hole', 20), worldRow('never-catalogued', 10)]
        : []
    )

    const data = await buildDashboardData(query, 7)

    expect(data.worlds.map((world) => [world.id, world.title, world.retired])).toEqual([
      ['solar-system', '太阳系模拟', false],
      ['black-hole', expect.stringMatching(/黑洞/u), true],
      ['never-catalogued', 'never-catalogued', true],
    ])
    expect(data.play.current.visits).toBe(60)
  })
})
